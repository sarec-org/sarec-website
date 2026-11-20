/**
 * 找工人 · 接活：核验（D5）
 * ------------------------------------------------------------------
 * 加州承包商牌照（CSLB）自动查：用 CSLB 官方免费下载的「License Master」总表（Data Portal，CSV，每天更新），
 *   https://www.cslb.ca.gov/OnlineServices/DataPortal/DownLoadFile.ashx?fName=MasterLicenseData&type=C
 *   一次下载、只挑出我们登记的牌照号（状态、到期日、类别、工伤保险、保证金），记日期。
 *   不程序化打开单个牌照详情页：11/20 实测详情页要先经过带 reCAPTCHA 的查询页拿会话，程序去绕不合适——
 *   详情页只给工作人员“一键打开”。总表里查不到 = 已注销 / 吊销 / 过期太久（官方说明），按“不合格”处理。
 *   避开 CSLB 每周维护时间（周日晚 8 点到周一早 6 点，洛杉矶时间）；同一次运行只下载一次。
 * 其它机构（DCA 名下各委员会、DRE、BREA、律师协会、CDI、营业登记）：工作人员一键打开官方查询页 + 核验清单，手点通过 / 退回 / 下架。
 *   不抓 search.dca.ca.gov（robots.txt 禁止 /details/）。
 * 90 天复核：A 类重新对总表；B、C 类转给工作人员复核。执照过期或被停：自动下架，通知本人，提醒工作人员。
 */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { recordException } from '@/lib/crm/followups';
import type { Staff } from '@/lib/crm/auth';
import { laToday } from '@/lib/laDate';
import { REVIEW_DAYS, PRO_STATUS_LABEL, roleLabel } from './constants';
import { notifyPro } from './notify';
import { proById, refreshPro, type ProRow } from './pros';
import { tradeMap, type Trade } from './trades';

export const CSLB_MASTER_URL = 'https://www.cslb.ca.gov/OnlineServices/DataPortal/DownLoadFile.ashx?fName=MasterLicenseData&type=C';
export const CSLB_DETAIL_URL = 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum=';

/** 每个 A 类工种认哪些 CSLB 类别（资质表核实.md；C-61/D-xx 写成 Dxx） */
export const TRADE_CLASSES: Record<string, string[]> = {
  plumbing: ['C36'], electrical: ['C10', 'C7'], hvac: ['C20', 'C38', 'C4'], handyman: ['B', 'B2', '*C'], roofing: ['C39', 'B'],
  windows: ['C17', 'D28', 'C6'], garage_door: ['D28', 'B'], painting: ['C33', 'D29'], flooring: ['C15', 'C54'], kitchen_bath: ['B', 'B2'],
  remodel: ['B', 'B2'], adu: ['B'], general: ['B', 'A'], specialty_sub: ['*C'], hardscape: ['C13', 'C8', 'C12', 'C29'], landscape: ['C27', 'D12'],
  tree: ['C49', 'D49'], water_mold: ['B', 'D64'], solar: ['C46', 'C10', 'C4'], post_clean: ['D63', 'B']
};
/** “C61/D49”“C-61/D-49”“D-49” → D49；“C-36” → C36；“B-2” → B2 */
export function normClass(raw: string): string {
  const s = raw.toUpperCase().replace(/\s+/g, '').replace(/-/g, '');
  const d = /D(\d{2})/.exec(s);
  if (d && s.startsWith('C61')) return `D${d[1]}`;
  return s;
}
export function classesCover(tradeKey: string, classes: string[]): boolean {
  const want = TRADE_CLASSES[tradeKey];
  if (!want) return false;
  return classes.some((c) => want.includes(c) || (want.includes('*C') && /^(C\d+|D\d+)$/.test(c)));
}

// ── 总表解析 ──────────────────────────────────────────────────────────
export type CslbRecord = {
  licenseNo: string; businessName: string; primaryStatus: string; secondaryStatus: string; expires: string | null; classes: string[];
  wcType: string; wcExpires: string | null; wcSuspended: boolean; bondCompany: string; bondCancelled: boolean; lastUpdate: string;
};
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out;
}
const mdyToIso = (s: string | undefined) => {
  const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(s ?? '');
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null;
};
export function recordFrom(header: string[], f: string[]): CslbRecord {
  const g = (name: string) => (f[header.indexOf(name)] ?? '').trim();
  return {
    licenseNo: g('LicenseNo'),
    businessName: g('BusinessName') || g('FullBusinessName'),
    primaryStatus: g('PrimaryStatus'),
    secondaryStatus: g('SecondaryStatus'),
    expires: mdyToIso(g('ExpirationDate')),
    classes: g('Classifications(s)').split(/[|;,]/).map((x) => x.trim()).filter(Boolean).map(normClass),
    wcType: g('WorkersCompCoverageType'),
    wcExpires: mdyToIso(g('WCExpirationDate')),
    wcSuspended: !!g('WCSuspendDate') || /does not have current/i.test(g('WorkersCompCoverageType')),
    bondCompany: g('CBSuretyCompany'),
    bondCancelled: !!g('CBCancellationDate'),
    lastUpdate: g('LastUpdate')
  };
}

/** 判定：现在能不能接活（状态 CLEAR、没过期、工伤保险有效或豁免、保证金没注销） */
export function evaluate(r: CslbRecord | null, today = laToday()) {
  const problems: string[] = [];
  if (!r) return { active: false, problems: ['CSLB 总表里查不到这个牌照号（可能已注销、吊销，或号码填错）'] };
  if (r.primaryStatus.toUpperCase() !== 'CLEAR') problems.push(`牌照状态：${r.primaryStatus || '未知'}`);
  if (!r.expires || r.expires < today) problems.push(`牌照已过期（到期日 ${r.expires ?? '未知'}）`);
  if (r.wcSuspended) problems.push('没有有效的工伤保险');
  if (!r.bondCompany || r.bondCancelled) problems.push('保证金无效或已注销');
  return { active: problems.length === 0, problems };
}

export function inCslbMaintenance(d = new Date()): boolean {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', hour: 'numeric', hour12: false }).formatToParts(d).map((x) => [x.type, x.value])
  );
  const h = Number(p.hour) % 24;
  return (p.weekday === 'Sun' && h >= 20) || (p.weekday === 'Mon' && h < 6);
}

/** 下载总表一次，挑出要查的牌照号。查不到的返回 null。 */
export async function scanMaster(numbers: string[], fetcher: typeof fetch = fetch): Promise<Map<string, CslbRecord | null>> {
  const want = new Set(numbers.map((n) => n.replace(/\D/g, '')).filter(Boolean));
  const found = new Map<string, CslbRecord | null>();
  if (!want.size) return found;
  const res = await fetcher(CSLB_MASTER_URL, { cache: 'no-store', headers: { 'User-Agent': 'SAREC-license-check/1.0' } });
  if (!res.ok || !res.body) throw new Error(`cslb master http ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let header: string[] | null = null;
  const take = (line: string) => {
    const l = line.replace(/\r$/, '');
    if (!l) return;
    if (!header) { header = parseCsvLine(l); return; }
    const no = l.slice(0, l.indexOf(','));
    if (want.has(no)) found.set(no, recordFrom(header, parseCsvLine(l)));
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const l of lines) take(l);
    if (found.size === want.size) { await reader.cancel().catch(() => undefined); break; }
  }
  if (buf) take(buf);
  if (!header) throw new Error('cslb master: empty file');
  for (const n of Array.from(want)) if (!found.has(n)) found.set(n, null);
  return found;
}

// ── 登记时：排队等下一次总表比对（几分钟内由定时任务处理） ─────────────
export async function checkAndRecord(proId: string, kind: string, actor: string) {
  const pool = getPool();
  await pool.query(
    `UPDATE jobs_pros SET license_state = jsonb_build_object('source', 'cslb_master', 'state', 'queued', 'queuedAt', now()) WHERE id = $1`,
    [proId]
  );
  await pool.query(`INSERT INTO jobs_verifications (pro_id, kind, action, result, actor) VALUES ($1, $2, 'check', '{"state":"queued"}', $3)`, [proId, kind, actor]);
  return { state: 'queued', message: '牌照会自动对照 CSLB 官方名单，几分钟内出结果' };
}

/** 把一条总表结果写回这个人；已上列表的人如果不合格 → 自动下架、通知本人、提醒工作人员 */
export async function applyCslb(p: ProRow, rec: CslbRecord | null, kind: string, trades: Map<string, Trade>) {
  const pool = getPool();
  const ev = evaluate(rec);
  const aTrades = p.trades.filter((k) => trades.get(k)?.licType === 'A');
  const covered = rec ? aTrades.filter((k) => classesCover(k, rec.classes)) : [];
  const state = {
    source: 'cslb_master', state: 'done', checkedAt: new Date().toISOString(), found: !!rec, active: ev.active, problems: ev.problems,
    status: rec?.primaryStatus ?? null, expires: rec?.expires ?? null, classes: rec?.classes ?? [], businessName: rec?.businessName ?? null,
    workersComp: rec ? { type: rec.wcType, expires: rec.wcExpires, suspended: rec.wcSuspended } : null,
    bond: rec ? { company: rec.bondCompany, cancelled: rec.bondCancelled } : null,
    coveredTrades: covered, uncoveredTrades: aTrades.filter((k) => !covered.includes(k))
  };
  await pool.query(`UPDATE jobs_pros SET license_state = $2, license_expires_on = $3, updated_at = now() WHERE id = $1`, [p.id, JSON.stringify(state), rec?.expires ?? null]);
  await pool.query(`INSERT INTO jobs_verifications (pro_id, kind, action, result, actor) VALUES ($1, $2, 'check', $3, 'system')`, [p.id, kind, JSON.stringify(state)]);
  if (p.status === 'verified') {
    const lost = p.verified_trades.filter((k) => trades.get(k)?.licType === 'A' && (!ev.active || !covered.includes(k)));
    if (lost.length) {
      await takeDown(p, `执照状态有问题：${ev.problems.join('；') || '牌照类别不再覆盖登记的工种'}`, 'system', kind);
    } else if (kind === 'review90') {
      await pool.query(`UPDATE jobs_pros SET next_review_at = now() + make_interval(days => $2) WHERE id = $1`, [p.id, REVIEW_DAYS]);
    }
  }
  return state;
}

async function takeDown(p: ProRow, reason: string, actor: string, kind: string) {
  const pool = getPool();
  await pool.query(`UPDATE jobs_pros SET status = 'removed', listed = false, removed_reason = $2, updated_at = now() WHERE id = $1`, [p.id, reason]);
  await pool.query(`INSERT INTO jobs_verifications (pro_id, kind, action, reason, actor) VALUES ($1, $2, 'remove', $3, $4)`, [p.id, kind, reason, actor]);
  await recordException('jobs_license', `jobs_license:${p.id}:${laToday()}`, p.id, `接活人「${p.name}」已自动下架：${reason}`, { proId: p.id });
  await notifyPro(p.contact_id, p.id, 'license', `你的接活资料已暂时下架：${reason}。更新执照后在「我的接活」里重新提交即可。`).catch(() => undefined);
}

/** 定时任务：处理排队的 CSLB 比对 + 每周全部重新比对一次 + 90 天复核 + 执照到期 */
export async function runVerification(now = new Date(), opts: { weekly?: boolean; onlyQueued?: boolean; fetcher?: typeof fetch } = {}) {
  const pool = getPool();
  const trades = await tradeMap(pool);
  const out: Record<string, unknown> = {};
  const review90 = new Set<string>();
  if (!opts.onlyQueued) {
  // 1) 到期日已过的（不论什么类）：直接下架
  const { rows: expired } = await pool.query<{ id: string }>(
    `SELECT id FROM jobs_pros WHERE status = 'verified' AND license_expires_on IS NOT NULL AND license_expires_on < $1::date`,
    [laToday(now)]
  );
  for (const r of expired) {
    const p = await proById(pool, r.id);
    if (p) await takeDown(p, `执照已过期（到期日 ${p.license_expires_on}）`, 'system', 'expiry');
  }
  out.expired = expired.length;
  // 2) 90 天复核到期：A 类排队对总表；B、C 类转工作人员
  const { rows: due } = await pool.query<{ id: string; trades: string[]; name: string }>(
    `SELECT id, verified_trades AS trades, name FROM jobs_pros WHERE status = 'verified' AND role <> 'worker' AND next_review_at IS NOT NULL AND next_review_at <= $1`,
    [now]
  );
  for (const r of due) {
    if (r.trades.some((k) => trades.get(k)?.licType === 'A')) review90.add(r.id);
    if (r.trades.some((k) => trades.get(k)?.licType !== 'A')) {
      const { rowCount } = await pool.query(`UPDATE jobs_pros SET needs_review = true WHERE id = $1 AND NOT needs_review`, [r.id]);
      if (rowCount) await recordException('jobs_review', `jobs_review:${r.id}:${laToday(now)}`, r.id, `接活人「${r.name}」到了 90 天复核，请打开官方查询页重新核对执照 / 营业登记`, { proId: r.id });
    }
  }
  }
  // 3) 要对 CSLB 总表的：排队的 + 90 天到期的 A 类 +（每周）全部已通过的 A 类
  const { rows: list } = await pool.query<{ id: string; license_no: string }>(
    `SELECT id, license_no FROM jobs_pros WHERE license_no IS NOT NULL AND role <> 'worker'
        AND (license_state->>'state' = 'queued' OR id = ANY($1::uuid[]) OR ($2 AND status = 'verified'))`,
    [Array.from(review90), !!opts.weekly]
  );
  const withA = [];
  for (const r of list) {
    const p = await proById(pool, r.id);
    if (p && p.trades.some((k) => trades.get(k)?.licType === 'A')) withA.push(p);
  }
  out.cslbCandidates = withA.length;
  if (withA.length) {
    if (inCslbMaintenance(now)) {
      out.cslb = 'maintenance_window';
    } else {
      try {
        const nums = withA.map((p) => p.license_no!);
        // 下载几十 MB，偶尔中途断开：再试一次
        const recs = await scanMaster(nums, opts.fetcher).catch(() => scanMaster(nums, opts.fetcher));
        let bad = 0;
        for (const p of withA) {
          const st = await applyCslb(p, recs.get(p.license_no!.replace(/\D/g, '')) ?? null, review90.has(p.id) ? 'review90' : 'auto_cslb', trades);
          if (!st.active) bad++;
        }
        out.cslb = { checked: withA.length, notActive: bad };
      } catch (e) {
        // 下载或解析失败：退回成工作人员一键打开详情页
        const msg = e instanceof Error ? e.message : 'error';
        await recordException('jobs_cslb', `jobs_cslb:${laToday(now)}`, null, `CSLB 官方名单下载失败（${msg.slice(0, 120)}），请在「接活人核验」里一键打开详情页人工核对`, {});
        out.cslb = 'fetch_failed';
      }
    }
  }
  if (!opts.onlyQueued) {
    // 缴费会员到期 / 新交了会费：刷新“上不上列表”
    for (const p of await pool.query<{ id: string }>(`SELECT id FROM jobs_pros WHERE status = 'verified'`).then((r) => r.rows)) await refreshPro(pool, p.id);
  }
  return out;
}

// ── 工作人员：核验队列和操作 ──────────────────────────────────────────
export function officialLinks(p: Pick<ProRow, 'trades' | 'license_no'>, trades: Map<string, Trade>) {
  const seen = new Map<string, { agency: string; url: string }>();
  for (const k of p.trades) {
    const t = trades.get(k);
    if (!t?.lookupUrl) continue;
    const url = t.lookupUrl.includes('{licNum}')
      ? (p.license_no ? t.lookupUrl.replace('{licNum}', encodeURIComponent(p.license_no)) : t.lookupUrl.replace(/LicenseDetail\.aspx\?LicNum=\{licNum\}/, 'CheckLicense.aspx').replace(/\/Detail\/\{licNum\}/, '/QuickSearch'))
      : t.lookupUrl;
    if (!seen.has(url)) seen.set(url, { agency: t.issuer ?? (t.licType === 'C' ? '加州州务卿营业登记查询' : ''), url });
  }
  return Array.from(seen.values());
}
export function checklistFor(p: Pick<ProRow, 'trades'>, trades: Map<string, Trade>) {
  const out: string[] = [];
  for (const k of p.trades) for (const line of (trades.get(k)?.verifyPoints ?? '').split('\n')) if (line.trim() && !out.includes(line.trim())) out.push(line.trim());
  return out;
}

export async function staffProList(status: string | null, opts: { mp: boolean; onlyId?: string }) {
  const pool = getPool();
  const trades = await tradeMap(pool);
  const st = status && ['draft', 'pending', 'verified', 'returned', 'removed'].includes(status) ? status : null;
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM jobs_pros WHERE ($1::text IS NULL OR status = $1 OR ($1 = 'pending' AND needs_review)) AND ($2::uuid IS NULL OR id = $2)
      ORDER BY needs_review DESC, updated_at DESC LIMIT 200`,
    [st, opts.onlyId ?? null]
  );
  const items = [];
  for (const r of rows) {
    const p = (await proById(pool, r.id))!;
    const { rows: c } = await pool.query<{ name: string; phone: string | null }>(`SELECT name, phone_e164 AS phone FROM contacts WHERE id = $1`, [p.contact_id]);
    const links = officialLinks(p, trades);
    items.push({
      id: p.id, contactId: p.contact_id, contactName: c[0]?.name ?? null, phone: c[0]?.phone ?? null,
      name: p.name, role: p.role, roleLabel: roleLabel(p.role), status: p.status, statusLabel: PRO_STATUS_LABEL[p.status], needsReview: p.needs_review,
      trades: p.trades.map((k) => ({ key: k, name: trades.get(k)?.name ?? k, licType: trades.get(k)?.licType ?? null, verified: p.verified_trades.includes(k) })),
      cities: p.cities, licenseNo: p.license_no, licenseState: p.license_state, licenseExpiresOn: p.license_expires_on,
      businessRegUrl: p.business_reg_url, insuranceUrl: p.insurance_url, licenseDocUrl: p.license_doc_url, intro: p.intro, photos: p.photos,
      returnReason: p.return_reason, removedReason: p.removed_reason, listed: p.listed, isPaidMember: opts.mp ? undefined : p.is_paid_member,
      verifiedAt: p.verified_at, nextReviewAt: p.next_review_at, createdAt: p.created_at,
      officialUrl: links[0]?.url ?? null, officialUrls: links, checklist: checklistFor(p, trades),
      cslbDetailUrl: p.license_no && p.trades.some((k) => trades.get(k)?.licType === 'A') ? CSLB_DETAIL_URL + encodeURIComponent(p.license_no) : null
    });
  }
  return { items };
}

export async function staffVerify(s: Staff, id: string, b: Record<string, unknown>) {
  const pool = getPool();
  const p = await proById(pool, id);
  if (!p) throw new CrmError('not_found', '找不到这个接活人');
  const actor = `staff:${s.name || s.email}`;
  const reason = typeof b.reason === 'string' ? b.reason.trim().slice(0, 500) : '';
  const trades = await tradeMap(pool);
  switch (b.action) {
    case 'approve': {
      const pick = Array.isArray(b.trades) ? b.trades.filter((k): k is string => typeof k === 'string' && p.trades.includes(k)) : p.trades;
      if (!pick.length) throw new CrmError('bad_request', '请至少勾一个核验通过的工种');
      await pool.query(
        `UPDATE jobs_pros SET status = 'verified', verified_trades = $2, verified_at = now(), verified_by = $3, needs_review = false, return_reason = NULL,
            removed_reason = NULL, next_review_at = CASE WHEN role = 'worker' THEN NULL ELSE now() + make_interval(days => $4) END, updated_at = now() WHERE id = $1`,
        [id, pick, actor, REVIEW_DAYS]
      );
      await pool.query(`INSERT INTO jobs_verifications (pro_id, kind, action, result, reason, actor) VALUES ($1, 'manual', 'approve', $2, $3, $4)`, [id, JSON.stringify({ trades: pick }), reason || null, actor]);
      const fresh = (await refreshPro(pool, id))!;
      const names = pick.map((k) => trades.get(k)?.name ?? k).join('、');
      await notifyPro(p.contact_id, id, 'verify', fresh.listed ? `核验通过（${names}），你已经上了找工人列表，有对口的活儿会通知你。` : `核验通过（${names}）。成为缴费会员后就会上找工人列表、能联系发布人。`).catch(() => undefined);
      break;
    }
    case 'return': {
      if (!reason) throw new CrmError('bad_request', '退回要写原因，本人会看到');
      await pool.query(`UPDATE jobs_pros SET status = 'returned', return_reason = $2, listed = false, needs_review = false, updated_at = now() WHERE id = $1`, [id, reason]);
      await pool.query(`INSERT INTO jobs_verifications (pro_id, kind, action, reason, actor) VALUES ($1, 'manual', 'return', $2, $3)`, [id, reason, actor]);
      await notifyPro(p.contact_id, id, 'verify', `你的接活资料被退回：${reason}。改好后在「我的接活」里重新提交。`).catch(() => undefined);
      break;
    }
    case 'remove': {
      if (!reason) throw new CrmError('bad_request', '下架要写原因');
      await takeDown(p, reason, actor, 'manual');
      break;
    }
    case 'check': {
      await checkAndRecord(id, 'auto_cslb', actor);
      break;
    }
    default:
      throw new CrmError('bad_request', 'action 只能是 approve、return、remove 或 check');
  }
  await pool.query(`INSERT INTO crm_audit_log (actor, action, target_type, target_id, reason) VALUES ($1, $2, 'jobs_pro', $3, $4)`, [actor, `jobs_pro_${String(b.action)}`, id, reason || null]);
  const { resolveException } = await import('@/lib/crm/followups');
  if (b.action !== 'check') await resolveException(`jobs_verify:${id}`, actor).catch(() => undefined);
  const after = await staffProList(null, { mp: false, onlyId: id });
  return { pro: after.items[0] ?? null };
}
