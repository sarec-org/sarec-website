/**
 * 网站后台“邮件通讯”（东哥 11/7）。
 * ------------------------------------------------------------------
 * 1. 收件人：只发给验证过邮箱的会员和注册用户；可按 会员 / 注册用户、参加过的活动类型、行业、渠道来源 筛选。
 *    退订、投诉、退信的邮箱永远不发。
 * 2. 个性化：标题和正文可插入 {姓名}、{公司}、{上次参加的活动}；没有值时，那一行开头用“您好，”兜底（其它行去掉这一行）。
 * 3. 合规：每封带一键退订链接（和 List-Unsubscribe 一键退订头）和商会地址；退订立即生效。
 * 4. 发送闸门：必须先发测试邮件（内容改过要重发）；AI 草稿必须先点“我已审核”；
 *    只有管理员（东哥）在后台点“确认发送”后才群发——confirmed_at 为空的期数，系统一封都不会发。
 * 5. 统计：送达、打开、点击、退订、退信、投诉，按每一期看（Resend webhook 回写）。
 * 6. 费用：每天 / 每月实际发信数计入 email_send_counts；群发前检查 Resend 套餐额度，不够就拦下并提醒东哥。
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { getPool, withTransaction } from '@/lib/db/client';
import type { Staff } from './auth';
import { CrmError } from './events';
import { getSetting, setSetting } from './orders';
import { ROLE_CATEGORIES } from './questionBank';

export const ORG_ADDRESS_DEFAULT = '中美房地产商会 SAREC · 500 S Hacienda Blvd, City of Industry, CA 91745, USA';
export const TOKENS = ['{姓名}', '{公司}', '{上次参加的活动}'] as const;

export type Filters = { audience?: 'all' | 'member' | 'registered'; eventTypes?: string[]; industries?: string[]; channels?: string[] };
export type Recipient = { contactId: string; email: string; name: string | null; company: string | null; lastEvent: string | null };

// 正式站用正式域名；预览 / 本地用这次部署自己的网址，退订链接指回当前环境（预览站的 NEXT_PUBLIC_SITE_URL 指着旧分支）
const base = () => {
  if (process.env.VERCEL_ENV === 'production') {
    const env = process.env.NEXT_PUBLIC_SITE_URL ?? '';
    return (/sinoamericanrec\.org/.test(env) ? env : 'https://sinoamericanrec.org').replace(/\/$/, '');
  }
  return (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.NEXT_PUBLIC_SITE_URL || 'https://sinoamericanrec.org').replace(/\/$/, '');
};
const ACTIVE_APP = ['approved', 'paid', 'second_payment_due'];

function cleanFilters(f: unknown): Filters {
  const o = (f && typeof f === 'object' ? f : {}) as Record<string, unknown>;
  const arr = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).slice(0, 60)).filter(Boolean).slice(0, 50) : []);
  const audience = o.audience === 'member' || o.audience === 'registered' ? o.audience : 'all';
  return { audience, eventTypes: arr(o.eventTypes), industries: arr(o.industries), channels: arr(o.channels) };
}

// ── 收件人 ─────────────────────────────────────────────────────────────

/** 符合条件的收件人（已验证邮箱、没退订 / 投诉 / 退信、不是占位档案、不是审核账号） */
export async function audience(filters: unknown, opts: { limit?: number } = {}): Promise<Recipient[]> {
  const f = cleanFilters(filters);
  const review = process.env.CRM_REVIEW_EMAIL?.trim().toLowerCase() ?? '';
  const { rows } = await getPool().query<{ contact_id: string; email: string; name: string | null; company: string | null; last_event: string | null }>(
    `WITH verified AS (
       SELECT c.id AS contact_id, lower(c.email) AS email FROM contacts c WHERE c.email IS NOT NULL AND c.email_verified_at IS NOT NULL
       UNION
       SELECT m.contact_id, lower(m.value) FROM contact_methods m WHERE m.kind = 'email' AND m.is_current AND m.status = 'confirmed'
     ), facts AS (
       -- 同一个邮箱可能对应几个档案：条件按“邮箱”判断（任何一个档案满足就算），不按单个档案
       SELECT v.email, c.id AS contact_id, c.created_at, c.name,
              EXISTS (SELECT 1 FROM applications a WHERE a.contact_id = c.id AND a.application_status = ANY($6) AND a.membership_end_date >= current_date) AS is_member,
              EXISTS (SELECT 1 FROM registrations r JOIN event_prep p ON p.event_id = r.event_id
                       WHERE r.contact_id = c.id AND r.arrival_status = 'checked_in' AND p.template_key = ANY($2)) AS type_match,
              (c.role_category = ANY($3)) AS role_match,
              (coalesce(c.first_channel, c.acquisition_source) = ANY($4)) AS channel_match,
              EXISTS (SELECT 1 FROM registrations r WHERE r.contact_id = c.id AND r.arrival_status = 'checked_in') AS attended
         FROM verified v JOIN contacts c ON c.id = v.contact_id
        WHERE NOT c.is_placeholder
     ), by_email AS (
       SELECT email, bool_or(is_member) AS is_member, bool_or(type_match) AS type_match, bool_or(coalesce(role_match, false)) AS role_match,
              bool_or(coalesce(channel_match, false)) AS channel_match
         FROM facts GROUP BY email
     ), picked AS (
       -- 个性化用哪个档案：会员档案优先，其次有真实姓名、到过场的，再其次最早建的
       SELECT DISTINCT ON (f.email) f.contact_id, f.email
         FROM facts f JOIN by_email b ON b.email = f.email
        WHERE f.email <> $5
          AND NOT EXISTS (SELECT 1 FROM email_unsubscribes u WHERE u.email = f.email)
          AND NOT EXISTS (SELECT 1 FROM contact_methods bad WHERE bad.kind = 'email' AND lower(bad.value) = f.email AND bad.status = 'invalid')
          AND ($1 = 'all' OR ($1 = 'member') = b.is_member)
          AND (cardinality($2::text[]) = 0 OR b.type_match)
          AND (cardinality($3::text[]) = 0 OR b.role_match)
          AND (cardinality($4::text[]) = 0 OR b.channel_match)
        ORDER BY f.email, f.is_member DESC, (f.name IS NOT NULL AND f.name <> '微信用户') DESC, f.attended DESC, f.created_at
     )
     SELECT p.contact_id, p.email, c.name, m.company,
            (SELECT e.title FROM registrations r JOIN events e ON e.id = r.event_id
              WHERE r.contact_id = p.contact_id AND r.arrival_status = 'checked_in' ORDER BY e.starts_at DESC LIMIT 1) AS last_event
       FROM picked p JOIN contacts c ON c.id = p.contact_id LEFT JOIN member_cards m ON m.contact_id = p.contact_id
      ORDER BY p.email
      ${opts.limit ? `LIMIT ${Math.max(1, Math.min(10000, Math.floor(opts.limit)))}` : ''}`,
    [f.audience, f.eventTypes, f.industries, f.channels, review, ACTIVE_APP]
  );
  return rows.map((r) => ({
    contactId: r.contact_id, email: r.email,
    name: r.name && r.name !== '微信用户' ? r.name : null,
    company: r.company?.trim() || null,
    lastEvent: r.last_event
  }));
}

/** 后台筛选项：活动类型（来自“活动筹备”模板）、行业（Q03 大类）、渠道来源（实际出现过的） */
export async function filterOptions() {
  const pool = getPool();
  const { rows: types } = await pool.query<{ key: string; name: string }>(`SELECT key, name FROM prep_templates ORDER BY sort_order, id`).catch(() => ({ rows: [] as { key: string; name: string }[] }));
  const { rows: channels } = await pool.query<{ v: string; n: number }>(
    `SELECT coalesce(first_channel, acquisition_source) AS v, count(*)::int AS n FROM contacts
      WHERE coalesce(first_channel, acquisition_source) IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 40`
  );
  return {
    eventTypes: types,
    industries: ROLE_CATEGORIES.map((c) => ({ key: c.key, label: c.label })),
    channels: channels.map((c) => ({ key: c.v, label: c.v, n: c.n }))
  };
}

// ── 个性化与排版 ───────────────────────────────────────────────────────

// 会员自己填的名字、公司里如果有 * [ ] ( ) 之类的排版符号，换成全角，不能变成链接或加粗
const plain = (x: string | null) => (x ?? '').replace(/\*/g, '＊').replace(/\[/g, '［').replace(/\]/g, '］').replace(/\(/g, '（').replace(/\)/g, '）').replace(/^#+\s*/, '').replace(/^-\s+/, '');
function vars(r: Pick<Recipient, 'name' | 'company' | 'lastEvent'>): Record<string, string> {
  return { '{姓名}': plain(r.name), '{公司}': plain(r.company), '{上次参加的活动}': plain(r.lastEvent) };
}

/** 标题：用到的变量没有值时，把它所在的括号段或半句（按 ，、·｜：— 分）整段去掉，不留“后的商会通讯”这类残片 */
function subjectOf(text: string, v: Record<string, string>): string {
  const missing = TOKENS.filter((t) => text.includes(t) && !v[t]);
  let s = text;
  for (const t of missing) {
    s = s.replace(new RegExp(`[（(][^（）()]*${t.replace(/[{}]/g, '\\$&')}[^（）()]*[）)]`, 'g'), '');
    s = s
      .split(/(?=[，,、·｜|：:—])|(?<=[，,、·｜|：:—])/)
      .filter((seg) => !seg.includes(t))
      .join('');
  }
  for (const t of TOKENS) s = s.split(t).join(v[t]);
  s = s.replace(/^[\s，,、：:·｜|\-—]+/, '').replace(/[\s，,、：:·｜|\-—]+$/, '').replace(/([，,、·｜|：:—])\s*(?=[，,、·｜|：:—])/g, '').replace(/\s{2,}/g, ' ').trim();
  return s;
}

/** 正文：某一行用到的变量没有值 → 正文第一行改成“您好，”，其它行整行去掉；标题里没有值的变量去掉 */
export function personalize(text: string, r: Pick<Recipient, 'name' | 'company' | 'lastEvent'>, kind: 'body' | 'subject'): string {
  const v = vars(r);
  if (kind === 'subject') return subjectOf(text, v) || '中美房地产商会通讯';
  const lines = text.split('\n');
  const firstIdx = lines.findIndex((l) => l.trim() !== '');
  const out: string[] = [];
  lines.forEach((line, i) => {
    const used = TOKENS.filter((t) => line.includes(t));
    if (used.some((t) => !v[t])) {
      if (i === firstIdx) out.push('您好，');
      return;
    }
    let l = line;
    for (const t of used) l = l.split(t).join(v[t]);
    out.push(l);
  });
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function inline(s: string): string {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" style="color:#9A7A3E">$1</a>');
}

/** 简单排版：空行分段、## 小标题、- 列表、**加粗**、[文字](链接) */
export function bodyHtml(text: string): string {
  // 小标题单独成段；列表和普通段落之间自动分开（AI 草稿常写成“## 标题”下一行就是“- 列表”）
  const norm = text
    .replace(/^(##\s.*)$/gm, '\n$1\n')
    .replace(/^([^\n·•\-].*)\n(?=\s*[-·•]\s)/gm, '$1\n\n')
    .replace(/^(\s*[-·•]\s.*)\n(?=[^\n·•\s\-])/gm, '$1\n\n');
  const blocks = norm.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return blocks
    .map((b) => {
      if (b.startsWith('## ')) return `<h2 style="font-size:18px;margin:24px 0 8px;color:#06111E">${inline(b.slice(3))}</h2>`;
      const lines = b.split('\n');
      if (lines.every((l) => /^\s*[-·•]\s+/.test(l))) return `<ul style="padding-left:20px;margin:0 0 16px">${lines.map((l) => `<li style="margin:4px 0">${inline(l.replace(/^\s*[-·•]\s+/, ''))}</li>`).join('')}</ul>`;
      return `<p style="margin:0 0 16px;line-height:1.75">${lines.map(inline).join('<br>')}</p>`;
    })
    .join('\n');
}

export function bodyText(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1（$2）').replace(/^## /gm, '');
}

// ── 退订 ───────────────────────────────────────────────────────────────

function secret(): string {
  const s = process.env.NEWSLETTER_SECRET || process.env.CRON_SECRET || process.env.AGENT_IP_SALT;
  if (!s) throw new Error('NEWSLETTER_SECRET / CRON_SECRET 未配置，不能生成退订链接');
  return s;
}
export function unsubToken(email: string): string {
  const e = email.trim().toLowerCase();
  const sig = createHmac('sha256', secret()).update(`unsub:${e}`).digest('base64url').slice(0, 24);
  return `${Buffer.from(e).toString('base64url')}.${sig}`;
}
export function emailFromToken(t: string | null | undefined): string | null {
  if (!t || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{24}$/.test(t)) return null;
  const [b, sig] = t.split('.');
  const e = Buffer.from(b, 'base64url').toString('utf8');
  let want: string;
  try {
    want = unsubToken(e).split('.')[1];
  } catch {
    return null;
  }
  const a = Buffer.from(want);
  const c = Buffer.from(sig);
  return a.length === c.length && timingSafeEqual(a, c) ? e : null;
}
export const unsubUrl = (email: string) => `${base()}/zh/unsubscribe?t=${unsubToken(email)}`;
export const unsubOneClick = (email: string) => `${base()}/api/v1/newsletter/unsubscribe?t=${unsubToken(email)}`;

export async function unsubscribe(t: string, reason = 'unsubscribe') {
  const email = emailFromToken(t);
  if (!email) throw new CrmError('bad_request', '退订链接不完整，请直接回复邮件告诉我们，我们会马上处理');
  const pool = getPool();
  const { rows: c } = await pool.query<{ contact_id: string }>(
    `SELECT id AS contact_id FROM contacts WHERE lower(email) = $1 UNION SELECT contact_id FROM contact_methods WHERE kind = 'email' AND lower(value) = $1 LIMIT 1`,
    [email]
  );
  const { rows: last } = await pool.query<{ issue_id: string }>(`SELECT issue_id FROM newsletter_sends WHERE email = $1 ORDER BY sent_at DESC NULLS LAST LIMIT 1`, [email]);
  await pool.query(
    `INSERT INTO email_unsubscribes (email, contact_id, reason, issue_id) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
    [email, c[0]?.contact_id ?? null, reason, last[0]?.issue_id ?? null]
  );
  if (last[0]) await pool.query(`UPDATE newsletter_sends SET unsubscribed_at = coalesce(unsubscribed_at, now()) WHERE issue_id = $1 AND email = $2`, [last[0].issue_id, email]);
  // 还没发出的期数：立即从队列里拿掉
  await pool.query(`UPDATE newsletter_sends SET status = 'skipped', error = 'unsubscribed' WHERE email = $1 AND status = 'queued'`, [email]);
  return { email: email.replace(/^(.).*(@.*)$/, '$1***$2') };
}

export async function resubscribe(t: string) {
  const email = emailFromToken(t);
  if (!email) throw new CrmError('bad_request', '链接不完整');
  // 投诉过的不自动恢复（只有本人主动退订的可以恢复）
  await getPool().query(`DELETE FROM email_unsubscribes WHERE email = $1 AND reason = 'unsubscribe'`, [email]);
  return { ok: true };
}

// ── 期数 ───────────────────────────────────────────────────────────────

export function contentHash(i: { subject: string; body: string; filters: unknown }): string {
  return createHash('sha256').update(JSON.stringify([i.subject, i.body, cleanFilters(i.filters)])).digest('hex').slice(0, 24);
}

type IssueRow = {
  id: number; subject: string; body: string; source: string; ai_model: string | null; ai_reviewed_at: Date | null; ai_reviewed_by: string | null;
  filters: Filters; status: string; test_sent_at: Date | null; test_sent_to: string | null; test_hash: string | null;
  confirmed_at: Date | null; confirmed_by: string | null; sent_at: Date | null; recipient_count: number | null; created_by: string | null; created_at: Date; updated_at: Date;
};

async function issueRow(id: number): Promise<IssueRow> {
  const { rows } = await getPool().query<IssueRow>(`SELECT * FROM newsletter_issues WHERE id = $1`, [id]);
  if (!rows[0]) throw new CrmError('not_found', '找不到这一期');
  return rows[0];
}

export async function listIssues() {
  const { rows } = await getPool().query(
    `SELECT i.id, i.subject, i.source, i.status, i.created_at, i.sent_at, i.recipient_count, i.test_sent_at, i.confirmed_at,
            count(s.*) FILTER (WHERE s.status = 'sent')::int AS sent,
            count(s.delivered_at)::int AS delivered, count(s.opened_at)::int AS opened, count(s.clicked_at)::int AS clicked,
            count(s.unsubscribed_at)::int AS unsubscribed, count(s.bounced_at)::int AS bounced, count(s.complained_at)::int AS complained,
            count(*) FILTER (WHERE s.status = 'queued')::int AS queued, count(*) FILTER (WHERE s.status = 'queued' AND s.error IS NOT NULL)::int AS send_errors
       FROM newsletter_issues i LEFT JOIN newsletter_sends s ON s.issue_id = i.id
      GROUP BY i.id ORDER BY i.created_at DESC LIMIT 100`
  );
  return rows;
}

export async function createIssue(s: Staff, b: { subject?: unknown; body?: unknown; filters?: unknown }) {
  const { rows } = await getPool().query<{ id: number }>(
    `INSERT INTO newsletter_issues (subject, body, filters, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
    [String(b.subject ?? '').slice(0, 200), String(b.body ?? '').slice(0, 20000), JSON.stringify(cleanFilters(b.filters)), s.name]
  );
  return { id: rows[0].id };
}

export async function updateIssue(id: number, b: { subject?: unknown; body?: unknown; filters?: unknown }) {
  const i = await issueRow(id);
  if (i.status !== 'draft') throw new CrmError('conflict', '这一期已经确认发送，不能再改');
  const subject = b.subject === undefined ? i.subject : String(b.subject).slice(0, 200);
  const body = b.body === undefined ? i.body : String(b.body).slice(0, 20000);
  const filters = b.filters === undefined ? i.filters : cleanFilters(b.filters);
  await getPool().query(`UPDATE newsletter_issues SET subject = $2, body = $3, filters = $4, updated_at = now() WHERE id = $1`, [id, subject, body, JSON.stringify(filters)]);
  return { ok: true };
}

export async function deleteIssue(id: number) {
  const i = await issueRow(id);
  if (i.status !== 'draft') throw new CrmError('conflict', '已经确认发送的期数不能删除');
  await getPool().query(`DELETE FROM newsletter_issues WHERE id = $1`, [id]);
  return { ok: true };
}

/** 后台详情：内容、闸门状态、收件人数、预览样本、统计、额度 */
export async function getIssue(id: number) {
  const i = await issueRow(id);
  const hash = contentHash(i);
  const all = await audience(i.filters);
  const samples = all.slice(0, 3).map((r) => ({ email: r.email.replace(/^(.{2}).*(@.*)$/, '$1***$2'), subject: personalize(i.subject, r, 'subject'), html: render(i, r, { preview: true }).html }));
  const { rows: st } = await getPool().query(
    `SELECT count(*)::int AS total, count(*) FILTER (WHERE status = 'queued')::int AS queued, count(*) FILTER (WHERE status = 'sent')::int AS sent,
            count(*) FILTER (WHERE status = 'failed')::int AS failed, count(*) FILTER (WHERE status = 'skipped')::int AS skipped,
            count(delivered_at)::int AS delivered, count(opened_at)::int AS opened, count(clicked_at)::int AS clicked,
            count(unsubscribed_at)::int AS unsubscribed, count(bounced_at)::int AS bounced, count(complained_at)::int AS complained
       FROM newsletter_sends WHERE issue_id = $1`,
    [id]
  );
  const { rows: le } = await getPool().query<{ error: string; n: number }>(
    `SELECT max(error) AS error, count(*)::int AS n FROM newsletter_sends WHERE issue_id = $1 AND status = 'queued' AND error IS NOT NULL`,
    [id]
  );
  return {
    sendError: le[0]?.n ? { message: le[0].error, count: le[0].n } : null,
    issue: { ...i, hash },
    gate: {
      aiNeedsReview: i.source === 'ai' && !i.ai_reviewed_at,
      testSentForThisVersion: !!i.test_sent_at && i.test_hash === hash,
      canConfirm: i.status === 'draft' && !!i.test_sent_at && i.test_hash === hash && !(i.source === 'ai' && !i.ai_reviewed_at) && all.length > 0
    },
    recipients: all.length,
    samples,
    stats: st[0],
    quota: await quotaState(),
    testTo: await testRecipient()
  };
}

function render(i: Pick<IssueRow, 'subject' | 'body'>, r: Recipient | Pick<Recipient, 'name' | 'company' | 'lastEvent' | 'email'>, opts: { test?: boolean; preview?: boolean } = {}) {
  const subject = (opts.test ? '【测试】' : '') + personalize(i.subject, r, 'subject');
  const body = personalize(i.body, r, 'body');
  const unsub = opts.preview ? '#' : unsubUrl(r.email);
  const html = `<!doctype html><html><body style="margin:0;background:#F4F1EA;font-family:-apple-system,'PingFang SC','Helvetica Neue',Arial,sans-serif;color:#1F2A36">
<div style="max-width:600px;margin:0 auto;background:#ffffff">
<div style="background:#06111E;color:#ECD292;padding:20px 28px;font-size:18px;letter-spacing:2px">中美房地产商会 SAREC</div>
<div style="padding:28px;font-size:15px">${opts.test ? '<p style="background:#FFF4D6;padding:10px 12px;margin:0 0 20px;font-size:13px">这是测试邮件，只发给您。确认没问题后，在后台“邮件通讯”里点“确认发送”才会群发。</p>' : ''}${bodyHtml(body)}</div>
<div style="padding:20px 28px;border-top:1px solid #E6E0D4;font-size:12px;color:#7A7F86;line-height:1.7">
您收到这封邮件，是因为您在中美房地产商会注册并验证了这个邮箱。<br>
<a href="${unsub}" style="color:#7A7F86">一键退订</a>（点击后立即生效，不再收到商会邮件通讯）<br>
${esc(ADDRESS_CACHE.value)}
</div></div></body></html>`;
  const text = `${opts.test ? '【测试邮件】确认没问题后，在后台点“确认发送”才会群发。\n\n' : ''}${bodyText(body)}\n\n——\n您收到这封邮件，是因为您在中美房地产商会注册并验证了这个邮箱。\n一键退订：${unsub}\n${ADDRESS_CACHE.value}`;
  return { subject, html, text };
}
const ADDRESS_CACHE = { value: ORG_ADDRESS_DEFAULT };
async function loadAddress() {
  ADDRESS_CACHE.value = (await getSetting<string>(getPool(), 'newsletter_address', '')) || ORG_ADDRESS_DEFAULT;
}

async function testRecipient(): Promise<string | null> {
  const v = await getSetting<string>(getPool(), 'newsletter_test_to', '');
  return (v || process.env.SAREC_ADMIN_EMAIL || '').trim().toLowerCase() || null;
}

export async function setTestRecipient(s: Staff, email: string) {
  if (!s.roles.includes('admin')) throw new CrmError('forbidden', '只有管理员可以改测试收件邮箱');
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new CrmError('bad_request', '邮箱格式不对');
  await setSetting(getPool(), 'newsletter_test_to', e, s.name);
  return { ok: true };
}

export async function markAiReviewed(s: Staff, id: number) {
  if (!s.roles.includes('admin')) throw new CrmError('forbidden', '只有东哥（管理员）可以审核 AI 草稿');
  await getPool().query(`UPDATE newsletter_issues SET ai_reviewed_at = now(), ai_reviewed_by = $2 WHERE id = $1 AND source = 'ai'`, [id, s.name]);
  return { ok: true };
}

/** 发一封测试邮件到东哥的邮箱（用他自己的资料做个性化，看到的就是会员会收到的样子） */
export async function sendTest(s: Staff, id: number) {
  const i = await issueRow(id);
  if (i.status !== 'draft') throw new CrmError('conflict', '这一期已经确认发送');
  if (!i.subject.trim() || !i.body.trim()) throw new CrmError('bad_request', '请先写标题和正文');
  if (i.source === 'ai' && !i.ai_reviewed_at) throw new CrmError('forbidden', 'AI 起草的内容要先由东哥审核，点“我已审核这份 AI 草稿”后才能发测试');
  const to = await testRecipient();
  if (!to) throw new CrmError('bad_request', '还没设置测试收件邮箱');
  await loadAddress();
  const pool = getPool();
  const { rows: me } = await pool.query<{ id: string; name: string; company: string | null }>(
    `SELECT c.id, c.name, m.company FROM contacts c LEFT JOIN member_cards m ON m.contact_id = c.id
      WHERE lower(c.email) = $1 OR c.id IN (SELECT contact_id FROM contact_methods WHERE kind = 'email' AND lower(value) = $1) LIMIT 1`,
    [to]
  );
  const { rows: le } = me[0]
    ? await pool.query<{ title: string }>(`SELECT e.title FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.contact_id = $1 AND r.arrival_status = 'checked_in' ORDER BY e.starts_at DESC LIMIT 1`, [me[0].id])
    : { rows: [] as { title: string }[] };
  const r = { email: to, name: me[0]?.name && me[0].name !== '微信用户' ? me[0].name : null, company: me[0]?.company ?? null, lastEvent: le[0]?.title ?? null };
  const m = render(i, r, { test: true });
  const { getResend, getFromAddress, isEmailConfigured } = await import('@/lib/email/resend-client');
  if (!isEmailConfigured()) throw new CrmError('unavailable', '邮件服务还没配置');
  const res = await getResend().emails.send({ from: getFromAddress(), to, subject: m.subject, html: m.html, text: m.text, headers: listUnsubHeaders(to) });
  if (res.error) throw new CrmError('send_failed', '测试邮件没发出去，请稍后再试');
  // 测试环境只发白名单：被拦下的不能算“已发测试”
  if (res.data?.id === 'blocked-non-production') throw new CrmError('send_failed', `测试环境只能发到测试白名单，${to.replace(/^(.{2}).*(@.*)$/, '$1***$2')} 不在白名单里，测试邮件没有发出。请把测试收件邮箱改成白名单里的地址`);
  await pool.query(`UPDATE newsletter_issues SET test_sent_at = now(), test_sent_to = $2, test_hash = $3, updated_at = now() WHERE id = $1`, [id, to, contentHash(i)]);
  return { to: to.replace(/^(.{2}).*(@.*)$/, '$1***$2') };
}

function listUnsubHeaders(email: string): Record<string, string> {
  return { 'List-Unsubscribe': `<${unsubOneClick(email)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' };
}

// ── 额度（Resend 现有套餐内）────────────────────────────────────────────

export async function quotaState() {
  const pool = getPool();
  const monthly = Number(await getSetting<number>(pool, 'resend_monthly_quota', 3000));
  const daily = Number(await getSetting<number>(pool, 'resend_daily_quota', 100));
  const { rows } = await pool
    .query<{ today: number; month: number }>(
      `SELECT coalesce(sum(sent) FILTER (WHERE day = (now() AT TIME ZONE 'America/Los_Angeles')::date), 0)::int AS today,
              coalesce(sum(sent) FILTER (WHERE date_trunc('month', day) = date_trunc('month', (now() AT TIME ZONE 'America/Los_Angeles')::date)), 0)::int AS month
         FROM email_send_counts`
    )
    .catch(() => ({ rows: [{ today: 0, month: 0 }] }));
  const usedToday = rows[0].today;
  const usedMonth = rows[0].month;
  // 每天 / 每月各留 10% 给活动通知、验证码等日常邮件
  const reserve = (n: number) => Math.floor(n * 0.1);
  return {
    monthly, daily, usedToday, usedMonth,
    leftToday: daily > 0 ? Math.max(0, daily - reserve(daily) - usedToday) : Infinity,
    leftMonth: monthly > 0 ? Math.max(0, monthly - reserve(monthly) - usedMonth) : Infinity
  };
}

async function quotaAlert(msg: string) {
  const pool = getPool();
  const key = `quota_alert_${new Date().toISOString().slice(0, 10)}`;
  const done = await getSetting<boolean>(pool, key, false);
  if (done) return;
  await setSetting(pool, key, true, 'system');
  const { getResend, getFromAddress, isEmailConfigured, getAdminEmail } = await import('@/lib/email/resend-client');
  const to = (await testRecipient()) || getAdminEmail();
  if (!to || !isEmailConfigured()) return;
  await getResend().emails.send({ from: getFromAddress(), to, subject: '【SAREC 后台】邮件额度提醒', text: `${msg}\n\n可以在后台“邮件通讯”里看额度；需要的话升级 Resend 套餐后，在后台改“每月 / 每天额度”。` }).catch(() => undefined);
}

// ── 确认发送（只有管理员）与队列 ─────────────────────────────────────────

export async function confirmSend(s: Staff, id: number) {
  if (!s.roles.includes('admin')) throw new CrmError('forbidden', '只有东哥（管理员）可以确认群发');
  const i = await issueRow(id);
  if (i.status !== 'draft') throw new CrmError('conflict', '这一期已经确认过了');
  if (i.source === 'ai' && !i.ai_reviewed_at) throw new CrmError('forbidden', 'AI 起草的内容还没审核');
  if (!i.test_sent_at || i.test_hash !== contentHash(i)) throw new CrmError('forbidden', '请先发一封测试邮件给自己看过（内容改过之后要重新发测试）');
  const list = await audience(i.filters);
  if (!list.length) throw new CrmError('bad_request', '按现在的筛选条件，没有可以发的人');
  const q = await quotaState();
  if (list.length > q.leftMonth) {
    await quotaAlert(`这一期要发 ${list.length} 封，本月 Resend 额度只剩约 ${q.leftMonth} 封（已用 ${q.usedMonth} / ${q.monthly}）。这一期没有发出。`);
    throw new CrmError('quota', `本月额度不够：要发 ${list.length} 封，只剩约 ${q.leftMonth} 封。已发提醒邮件；可以缩小收件范围，或升级 Resend 套餐后在后台改额度`);
  }
  await withTransaction(async (db) => {
    const { rowCount } = await db.query(
      `UPDATE newsletter_issues SET status = 'sending', confirmed_at = now(), confirmed_by = $2, recipient_count = $3, updated_at = now() WHERE id = $1 AND status = 'draft'`,
      [id, s.name, list.length]
    );
    if (!rowCount) throw new CrmError('conflict', '这一期已经确认过了');
    for (let k = 0; k < list.length; k += 500) {
      const chunk = list.slice(k, k + 500);
      await db.query(
        `INSERT INTO newsletter_sends (issue_id, contact_id, email) SELECT $1, x.c::uuid, x.e FROM unnest($2::text[], $3::text[]) AS x(c, e) ON CONFLICT DO NOTHING`,
        [id, chunk.map((r) => r.contactId), chunk.map((r) => r.email)]
      );
    }
  });
  const out = await processQueue(id);
  return { recipients: list.length, ...out };
}

/** 发队列里的邮件（每批 100 封，用 Resend 批量接口）；今天额度用完就停，明天定时任务接着发 */
export async function processQueue(id: number, opts: { max?: number } = {}) {
  const pool = getPool();
  const i = await issueRow(id);
  // 闸门：没有东哥确认的期数，一封都不发
  if (!i.confirmed_at || i.status !== 'sending') return { sent: 0, left: 0, paused: false };
  await loadAddress();
  const q = await quotaState();
  let budget = Math.min(Number.isFinite(q.leftToday) ? q.leftToday : 1e9, Number.isFinite(q.leftMonth) ? q.leftMonth : 1e9, opts.max ?? 2000);
  const { getResend, getFromAddress } = await import('@/lib/email/resend-client');
  let sent = 0;
  let failedBatch = false;
  // 以前版本标成 failed 的，重新排队重试
  await pool.query(`UPDATE newsletter_sends SET status = 'queued' WHERE issue_id = $1 AND status = 'failed'`, [id]);
  while (budget > 0) {
    const { rows } = await pool.query<{ id: number; email: string; contact_id: string | null }>(
      `SELECT id, email, contact_id FROM newsletter_sends WHERE issue_id = $1 AND status = 'queued' ORDER BY id LIMIT $2`,
      [id, Math.min(100, budget)]
    );
    if (!rows.length) break;
    // 发之前再查一次退订（确认之后才退订的人不发）
    const { rows: unsub } = await pool.query<{ email: string }>(`SELECT email FROM email_unsubscribes WHERE email = ANY($1)`, [rows.map((r) => r.email)]);
    const skip = new Set(unsub.map((u) => u.email));
    if (skip.size) await pool.query(`UPDATE newsletter_sends SET status = 'skipped', error = 'unsubscribed' WHERE issue_id = $1 AND email = ANY($2)`, [id, Array.from(skip)]);
    const todo = rows.filter((r) => !skip.has(r.email));
    if (!todo.length) continue;
    const recips = await recipientData(todo.map((r) => r.contact_id).filter((x): x is string => !!x));
    const payload = todo.map((r) => {
      const d = recips.get(r.contact_id ?? '') ?? { name: null, company: null, lastEvent: null };
      const m = render(i, { email: r.email, ...d });
      return { from: getFromAddress(), to: r.email, subject: m.subject, html: m.html, text: m.text, headers: listUnsubHeaders(r.email), tags: [{ name: 'newsletter', value: String(id) }] };
    });
    const res = await getResend().batch.send(payload);
    if (res.error || !res.data) {
      // 整批没发出去（限流、Resend 故障、参数错误）：仍然留在队列里，记下原因；这一期保持“发送中”，后台显示警告，“接着发”或第二天定时任务会重试
      const why = sendErrorText(String(res.error?.name ?? ''), String((res.error as { message?: string } | null)?.message ?? ''));
      await pool.query(`UPDATE newsletter_sends SET error = $3 WHERE issue_id = $1 AND id = ANY($2)`, [id, todo.map((r) => r.id), why.slice(0, 200)]);
      failedBatch = true;
      break;
    }
    const ids = (res.data as { data?: { id: string }[] }).data ?? (res.data as unknown as { id: string }[]);
    for (let k = 0; k < todo.length; k++) {
      const rid = ids?.[k]?.id ?? null;
      // 预览站白名单拦下的没有真实 ID，不存（避免 webhook 回写时撞到同一个假 ID）
      await pool.query(`UPDATE newsletter_sends SET status = 'sent', resend_id = $2, sent_at = now(), error = NULL WHERE id = $1`, [todo[k].id, rid && !rid.startsWith('blocked') ? rid : null]);
    }
    const { countSends } = await import('@/lib/email/resend-client');
    await countSends(todo.length, true);
    sent += todo.length;
    budget -= todo.length;
  }
  const { rows: left } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM newsletter_sends WHERE issue_id = $1 AND status = 'queued'`, [id]);
  if (failedBatch) {
    const { recordException } = await import('./followups');
    await recordException('newsletter_send', `newsletter_send:${id}`, String(id), `邮件通讯第 ${id} 期有 ${left[0].n} 封没发出去（${i.subject.slice(0, 30)}），会自动重试，也可以在后台点“接着发”`).catch(() => undefined);
  }
  if (!left[0].n) await pool.query(`UPDATE newsletter_issues SET status = 'sent', sent_at = now(), updated_at = now() WHERE id = $1 AND status = 'sending'`, [id]);
  else if (budget <= 0) await quotaAlert(`第 ${id} 期还有 ${left[0].n} 封没发：今天的发信额度用完了，明天会自动接着发。`);
  return { sent, left: left[0].n, paused: left[0].n > 0, failed: failedBatch };
}

/** Resend 的报错换成大白话（原文放在后面，按词截断，不切半个单词） */
function sendErrorText(name: string, message: string): string {
  const zh: Record<string, string> = {
    rate_limit_exceeded: '发得太快，邮件服务暂时限流',
    daily_quota_exceeded: '邮件服务今天的额度用完了',
    monthly_quota_exceeded: '邮件服务本月的额度用完了',
    validation_error: '收件地址或发件设置不被邮件服务接受（测试环境只能发给白名单里的地址）',
    invalid_from_address: '发件地址没有通过验证',
    application_error: '邮件服务暂时故障',
    internal_server_error: '邮件服务暂时故障',
    missing_api_key: '邮件服务的密钥没有配置',
    invalid_api_key: '邮件服务的密钥无效'
  };
  const head = zh[name] ?? '邮件服务暂时没发出去';
  let raw = message.replace(/\s+/g, ' ').trim();
  if (raw.length > 90) raw = raw.slice(0, 90).replace(/\s+\S*$/, '') + '…';
  return raw ? `${head}（原文：${raw}）` : head;
}

async function recipientData(ids: string[]) {
  const m = new Map<string, { name: string | null; company: string | null; lastEvent: string | null }>();
  if (!ids.length) return m;
  const { rows } = await getPool().query<{ id: string; name: string | null; company: string | null; last_event: string | null }>(
    `SELECT c.id, c.name, mc.company,
            (SELECT e.title FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.contact_id = c.id AND r.arrival_status = 'checked_in' ORDER BY e.starts_at DESC LIMIT 1) AS last_event
       FROM contacts c LEFT JOIN member_cards mc ON mc.contact_id = c.id WHERE c.id = ANY($1::uuid[])`,
    [ids]
  );
  for (const r of rows) m.set(r.id, { name: r.name && r.name !== '微信用户' ? r.name : null, company: r.company?.trim() || null, lastEvent: r.last_event });
  return m;
}

/** 每天的定时任务：接着发前一天没发完的期数（只处理东哥确认过的）+ 月额度过 80% 提醒 */
export async function runNewsletterQueue() {
  const { rows } = await getPool().query<{ id: number }>(`SELECT id FROM newsletter_issues WHERE status = 'sending' AND confirmed_at IS NOT NULL ORDER BY confirmed_at`).catch(() => ({ rows: [] as { id: number }[] }));
  let sent = 0;
  for (const r of rows) sent += (await processQueue(r.id)).sent;
  const q = await quotaState();
  if (q.monthly > 0 && q.usedMonth >= q.monthly * 0.8) await quotaAlert(`本月已经发了 ${q.usedMonth} 封邮件，Resend 套餐每月 ${q.monthly} 封，已超过 80%。`);
  return { issues: rows.length, sent };
}

// ── Resend webhook：送达 / 打开 / 点击 / 退信 / 投诉 ──────────────────────

export async function recordEmailEvent(type: string, emailId: string | null, to: string[]) {
  const pool = getPool();
  const col: Record<string, string> = { 'email.delivered': 'delivered_at', 'email.opened': 'opened_at', 'email.clicked': 'clicked_at', 'email.bounced': 'bounced_at', 'email.complained': 'complained_at' };
  const c = col[type];
  if (c && emailId) await pool.query(`UPDATE newsletter_sends SET ${c} = coalesce(${c}, now()) WHERE resend_id = $1`, [emailId]);
  // 投诉：以后再也不发；永久退信：也停发
  if (type === 'email.complained' || type === 'email.bounced') {
    for (const addr of to) {
      const e = addr.trim().toLowerCase();
      if (!e) continue;
      await pool.query(
        `INSERT INTO email_unsubscribes (email, reason, issue_id) VALUES ($1, $2, (SELECT issue_id FROM newsletter_sends WHERE resend_id = $3 LIMIT 1))
         ON CONFLICT (email) DO UPDATE SET reason = CASE WHEN EXCLUDED.reason = 'complaint' OR email_unsubscribes.reason = 'complaint' THEN 'complaint' WHEN EXCLUDED.reason = 'bounce' OR email_unsubscribes.reason = 'bounce' THEN 'bounce' ELSE email_unsubscribes.reason END`,
        [e, type === 'email.complained' ? 'complaint' : 'bounce', emailId]
      );
      await pool.query(`UPDATE newsletter_sends SET status = 'skipped', error = $2 WHERE email = $1 AND status = 'queued'`, [e, type === 'email.complained' ? 'complaint' : 'bounce']);
    }
  }
}

// ── AI 起草（必须经东哥审核）─────────────────────────────────────────────

export async function aiDraft(s: Staff, id: number) {
  const i = await issueRow(id);
  if (i.status !== 'draft') throw new CrmError('conflict', '这一期已经确认发送');
  const { providerAvailable, callModel } = await import('@/lib/agent/providers');
  const { budgetState } = await import('@/lib/agent/budget');
  const { bumpDaily } = await import('@/lib/agent/store');
  const { isMockMode } = await import('@/lib/agent/config');
  if (!providerAvailable(1) || isMockMode()) throw new CrmError('unavailable', 'AI 暂时不可用，可以先手写');
  const b = await budgetState();
  if (b.level === 'restrict' || b.level === 'stop') throw new CrmError('unavailable', '本月 AI 预算快用完了，这次请手写');
  const pool = getPool();
  const { listArticles } = await import('@/lib/geo/content');
  const weekAgo = new Date(Date.now() - 7 * 86400e3).toISOString().slice(0, 10);
  const articles = listArticles({ status: 'published' })
    .filter((a) => (a.publishedAt ?? '') >= weekAgo)
    .slice(0, 6)
    .map((a) => `- ${a.title}：${(a.description ?? '').slice(0, 120)}（${base()}/zh/research/${a.slug}）`);
  const { rows: evs } = await pool.query<{ title: string; slug: string; starts_at: Date; summary: string | null; ended: boolean }>(
    `SELECT title, slug, starts_at, summary, coalesce(ends_at, starts_at + interval '3 hours') <= now() AS ended FROM events
      WHERE is_listed AND event_status <> 'cancelled' AND starts_at BETWEEN now() - interval '8 days' AND now() + interval '45 days' ORDER BY starts_at LIMIT 8`
  );
  const fmt = (d: Date) => new Intl.DateTimeFormat('zh-CN', { timeZone: 'America/Los_Angeles', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(d));
  const evLines = evs.map((e) => `- ${e.ended ? '（已结束）' : '（即将举办）'}${e.title}，${fmt(e.starts_at)}${e.summary ? `：${e.summary.slice(0, 100)}` : ''}（${base()}/zh/e/${e.slug}）`);
  if (!articles.length && !evLines.length) throw new CrmError('bad_request', '这一周没有新的文章和活动，AI 没有可写的材料，请手写');
  const system =
    '你是中美房地产商会（SAREC）的会员通讯编辑。根据给定的本周网站文章和活动，写一期中文邮件通讯初稿，供东哥审核后发送。要求：只用给定材料里的事实，不编造嘉宾、数字、观点；不写任何投资回报、收益承诺、价格优惠、奖励；不写诱导转发；语气专业、简洁、温和；正文第一行用“{姓名}，您好：”开头；文章和活动用 [标题](链接) 格式；可以用“## 小标题”和“- 列表”。按格式输出：\n【标题】不超过 30 字\n【正文】正文';
  const user = `本周网站文章：\n${articles.join('\n') || '（无）'}\n\n近期活动：\n${evLines.join('\n') || '（无）'}`;
  const r = await callModel({ tier: 1, system, history: [], user, maxTokens: 1500, json: false });
  await pool.query(
    `INSERT INTO ai_task_log (task, ref, model, ok, input_tokens, output_tokens, cost_micros, error) VALUES ('newsletter_draft', $1, $2, $3, $4, $5, $6, $7)`,
    [String(id), r.model, r.ok, r.usage.input, r.usage.output, r.costMicros, r.ok ? null : (r.error ?? 'error').slice(0, 200)]
  );
  await bumpDaily({ model_calls: 1, cost_micros: r.costMicros, input_tokens: r.usage.input, output_tokens: r.usage.output });
  if (!r.ok) throw new CrmError('unavailable', 'AI 这次没写出来，请稍后再试或手写');
  const subject = (r.text.split('【标题】')[1] ?? '').split('【正文】')[0].trim().slice(0, 200);
  const body = (r.text.split('【正文】')[1] ?? '').trim().slice(0, 20000);
  if (!body) throw new CrmError('unavailable', 'AI 这次没写出来，请稍后再试或手写');
  await pool.query(
    `UPDATE newsletter_issues SET subject = $2, body = $3, source = 'ai', ai_model = $4, ai_reviewed_at = NULL, ai_reviewed_by = NULL, updated_at = now() WHERE id = $1`,
    [id, subject || '商会本周通讯', body, r.model]
  );
  void s;
  return { ok: true };
}
