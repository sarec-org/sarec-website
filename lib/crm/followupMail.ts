/**
 * 待跟进通知邮件（第二部分 四.2、四.3）
 * ------------------------------------------------------------------
 * 单条通知（只给"客户咨询"和其他非咨询来源）：标题和第一行 = "这是什么 + 建议怎么办"；正文放原话；
 *   三个按钮：不跟进 / 我来联系 / 转给助理 —— 链接直接打开这一条的处理页（/zh/staff/followups/<id>），
 *   页面凭邮件里的一次性口令 + 已登录工作人员身份自动执行，不用再点；没登录先登录，登录完自动执行。
 * 推销 / 垃圾：不单发，每天汇总成一封，带一键"全部不跟进"。
 * 都过 notify_live 总闸（lib/crm/notifyGate.ts）。
 */
import { getPool } from '@/lib/db/client';
import { getFromAddress, getResend, isEmailConfigured } from '@/lib/email/resend-client';
import { laToday } from '@/lib/laDate';
import { gateSend } from './notifyGate';
import { leadNotifyEmail, recordException, resolveException } from './followups';
import { CATEGORY_LABEL, draftFor, issueActionToken, issueBatch, loadCards, teamMembers, voiceFor, type FollowupCard } from './followupKit';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
const oneLine = (t: string, n: number) => {
  const s = t.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return s.length > n ? s.slice(0, n) + '…' : s;
};
const siteBase = (base?: string) => (base || process.env.NEXT_PUBLIC_SITE_URL || 'https://sinoamericanrec.org').replace(/\/$/, '');

/** "这是什么" + "建议怎么办"（邮件标题、第一行、今天页卡片共用） */
export function headline(c: FollowupCard): { what: string; suggest: string } {
  const who = `${c.name?.trim() || '一位访客'}${c.isMember ? '（会员）' : ''}`;
  const need = c.need ? `：${oneLine(c.need, 30)}` : '';
  const what =
    c.source === 'expiring_member'
      ? `${who}的会籍快到期了`
      : c.source === 'inquiry' || c.source === 'agent_lead'
        ? `${c.sourceLabel}，${who}${need}`
        : `${c.sourceLabel}，${who}${need}`;
  const how = c.phone ? '打个电话' : c.wechat ? '加微信联系' : c.email ? '回一封邮件' : '想办法联系上';
  const suggest =
    c.category !== 'customer'
      ? '像是推销或垃圾，建议不跟进'
      : c.overdueDays > 0
        ? `已过期 ${c.overdueDays} 天，建议今天${how}，草稿里带了致歉`
        : `建议今天${how}`;
  return { what, suggest };
}

function button(href: string, label: string, color: string) {
  return `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 18px;border-radius:8px;background:${color};color:#fff;text-decoration:none;font-size:16px;font-weight:bold">${esc(label)}</a>`;
}

export function buildFollowupEmail(c: FollowupCard, token: string, draft: string | null, base?: string) {
  const b = siteBase(base);
  const page = `${b}/zh/staff/followups/${c.id}`;
  const act = (d: string) => `${page}?do=${d}&t=${encodeURIComponent(token)}`;
  const { what, suggest } = headline(c);
  const subject = oneLine(`【${c.category === 'customer' ? '要联系' : CATEGORY_LABEL[c.category]}】${what} — ${suggest}`, 120);
  const original = (c.message || c.need || '（对方没有留言）').trim();
  const contact = [c.phone && `手机 ${c.phone}`, c.email && `邮箱 ${c.email}`, c.wechat && `微信 ${c.wechat}`].filter(Boolean).join(' · ') || '没留联系方式';
  const text = [
    `${what} — ${suggest}`,
    '',
    '原话：',
    original,
    '',
    `联系方式：${contact}`,
    draft ? `\n建议联系内容（草稿，您自己发，系统不会替您发）：\n${draft}` : '',
    '',
    `不跟进：${act('drop')}`,
    `我来联系：${act('claim')}`,
    `转给助理：${act('assist')}`,
    `打开这一条：${page}`
  ]
    .filter((x) => x !== '')
    .join('\n');
  const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#222;max-width:560px">
<p style="font-size:18px;font-weight:bold;margin:0 0 12px">${esc(what)} — ${esc(suggest)}</p>
<p style="margin:0 0 4px;color:#666">原话：</p>
<blockquote style="margin:0 0 12px;padding:8px 12px;border-left:4px solid #c9a227;background:#faf7ee;white-space:pre-wrap">${esc(original)}</blockquote>
<p style="margin:0 0 12px">联系方式：${esc(contact)}</p>
${draft ? `<p style="margin:0 0 4px;color:#666">建议联系内容（草稿，您自己发，系统不会替您发）：</p><p style="margin:0 0 16px;white-space:pre-wrap">${esc(draft)}</p>` : ''}
<div>${button(act('drop'), '不跟进', '#777')}${button(act('claim'), '我来联系', '#1f7a3a')}${button(act('assist'), '转给助理', '#1f5fa8')}</div>
<p style="margin:8px 0 0"><a href="${esc(page)}">打开这一条</a>（点了按钮会直接生效；手机上已登录就不用再输验证码）</p>
</div>`;
  return { subject, text, html };
}

/**
 * 发一条待跟进的通知邮件（替换原来的 notifyFollowup 内容）。已发过不再发；推销 / 垃圾不单发（进每日汇总）。
 * 返回 true = 不需要再重试（已发 / 已记录 / 不用发）。
 */
export async function sendFollowupEmail(id: string, base?: string): Promise<boolean> {
  const pool = getPool();
  const c = (await loadCards({ ids: [id] }))[0];
  if (!c) return false;
  if (c.notifiedAt) return true;
  if (c.category !== 'customer') return true; // 进每日汇总
  const key = `followup_email:${id}`;
  if (!isEmailConfigured()) {
    await recordException('followup_email', key, id, '邮件服务未配置');
    return false;
  }
  const team = await teamMembers().catch(() => []);
  const pres = team.find((m) => m.president);
  const draft = draftFor(c, pres ? voiceFor(team, pres.name) : { voice: 'staff', by: '' });
  const token = await issueActionToken(id);
  const mail = buildFollowupEmail(c, token, draft, base);
  const to = leadNotifyEmail();
  const r = await gateSend(
    { channel: 'email', to, kind: '咨询通知', subject: mail.subject, text: mail.text, ref: id, dedupeKey: key },
    async () => {
      const res = await getResend().emails.send({ from: getFromAddress(), to, subject: mail.subject, text: mail.text, html: mail.html });
      if (res.error) throw new Error(res.error.message);
    },
    { existing: true }
  );
  if (r.status === 'failed') {
    await recordException('followup_email', key, id, '邮件没发出去');
    return false;
  }
  await pool.query(`UPDATE followups SET notified_at = now() WHERE id = $1 AND notified_at IS NULL`, [id]);
  await resolveException(key, 'system');
  return true;
}

/**
 * 四.3：推销和垃圾每天汇总成一封，带一键"全部不跟进"（链接带这一批的口令，打开后已登录的工作人员自动执行）。
 * 没有就不发。新功能，过总闸（正式站默认只记录）。
 */
export async function runJunkDigest(now = new Date(), base?: string): Promise<{ status: string; count: number }> {
  const cards = (await loadCards({ open: true, limit: 500 })).filter(
    (c) => c.status === 'todo' && c.category !== 'customer' && Date.parse(c.createdAt) > now.getTime() - 14 * 86400_000
  );
  const { rows: done } = await getPool().query<{ id: string }>(`SELECT id FROM followups WHERE id = ANY($1::uuid[]) AND digested_at IS NOT NULL`, [cards.map((c) => c.id)]);
  const skip = new Set(done.map((d) => d.id));
  const list = cards.filter((c) => !skip.has(c.id));
  if (!list.length) return { status: 'empty', count: 0 };
  const batch = await issueBatch(list.map((c) => c.id));
  const b = siteBase(base);
  const all = `${b}/zh/staff/followups/junk?b=${batch.id}&t=${encodeURIComponent(batch.token)}`;
  const day = laToday(now);
  const pitch = list.filter((c) => c.category === 'pitch').length;
  const spam = list.length - pitch;
  const subject = `【推销和垃圾汇总】${day} 共 ${list.length} 条（推销 ${pitch}、垃圾 ${spam}）— 建议全部不跟进`;
  const lines = list.map((c, i) => `${i + 1}. 【${CATEGORY_LABEL[c.category]}】${c.name || '未留称呼'}：${oneLine(c.message || c.need || '', 80)}\n   打开这一条：${b}/zh/staff/followups/${c.id}`);
  const text = [`${subject}`, '', ...lines, '', `全部不跟进：${all}`, '（分错了的，打开那一条点"其实是客户咨询"。）'].join('\n');
  const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#222;max-width:560px">
<p style="font-size:18px;font-weight:bold;margin:0 0 12px">${esc(subject)}</p>
<ol style="padding-left:20px">${list.map((c) => `<li style="margin-bottom:8px">【${CATEGORY_LABEL[c.category]}】${esc(c.name || '未留称呼')}：${esc(oneLine(c.message || c.need || '', 80))} <a href="${esc(`${b}/zh/staff/followups/${c.id}`)}">打开</a></li>`).join('')}</ol>
<div>${button(all, '全部不跟进', '#777')}</div>
<p style="color:#666">分错了的，打开那一条点"其实是客户咨询"。</p></div>`;
  const to = leadNotifyEmail();
  const r = await gateSend({ channel: 'email', to, kind: '推销垃圾每日汇总', subject, text, ref: batch.id, dedupeKey: `junk_digest:${day}` }, async () => {
    if (!isEmailConfigured()) throw new Error('邮件服务未配置');
    const res = await getResend().emails.send({ from: getFromAddress(), to, subject, text, html });
    if (res.error) throw new Error(res.error.message);
  });
  if (r.status !== 'failed' && r.status !== 'duplicate') {
    await getPool().query(`UPDATE followups SET digested_at = now() WHERE id = ANY($1::uuid[])`, [list.map((c) => c.id)]);
  }
  return { status: r.status, count: list.length };
}
