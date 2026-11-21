/** 找工人 · 接活儿：meta（首页、方块页要的一切）和工作人员后台（活儿、统计、投诉、邀请） */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { staffCan, type Staff } from '@/lib/crm/auth';
import { recordException, resolveException } from '@/lib/crm/followups';
import { TEST_FIXED_CODE_TEXT, testFixedCodeOn } from '@/lib/crm/testFixedCode';
import type { Viewer } from './access';
import {
  DISCLAIMER, LANGUAGES, POSTER_ROLES, PRO_ROLES, PROPERTY_TYPES, RULES, SITE_VISIT_TRADES, STAFF_PREVIEW_TEXT, STATUS_LABEL, TIMINGS,
  TURNOVER_TRADES, TRADE_SCOPE, RECRUITING_TEXT, TRADE_RECRUITING_TEXT, RECRUITING_LABEL, posterLabel, webBase, WEB_JOBS_PATH, type PostStatus
} from './constants';
import { deliver, isProduction, jobsTemplate } from './notify';
import { getSwitches } from './settings';
import { latestPosts } from './posts';
import { proBrief } from './pros';
import { groupCities, loadCities } from './cities';
import { loadGroups, loadHomeEntries, loadTrades, tradeMap, tradesWithPros } from './trades';

export async function buildMeta(v: Viewer) {
  const pool = getPool();
  const [groups, trades, entries, withPros, cityList] = await Promise.all([loadGroups(pool), loadTrades(pool), loadHomeEntries(pool), tradesWithPros(pool), loadCities(pool)]);
  const cities = groupCities(cityList);
  const s = v.switches;
  const staffPreview = v.staff && (!s.find || !s.work);
  const showLatest = !v.mp && (s.work || v.staff);
  return {
    // D28：requirePaid 保留兼容（= feeMode 是 members_only）；feeMode 三选一、freeContacts 免费联系次数、freePosts 非会员免费发活儿条数（null 不限）
    switches: { find: s.find, work: s.work, requirePaid: s.requirePaid, feeMode: s.feeMode, freeContacts: s.freeContacts, freePosts: s.freePosts },
    staffPreview,
    staffPreviewText: staffPreview ? STAFF_PREVIEW_TEXT : null,
    /** 指令 7 · D16：只在测试站给——手机验证码固定 246810，小程序在验证手机的地方显示 testFixedCodeText 这行小字 */
    ...(testFixedCodeOn() ? { testFixedCode: true, testFixedCodeText: TEST_FIXED_CODE_TEXT } : {}),
    // D27：每组带上开放工种的 key 和“组里有没有人”，列表页顶上的分组工种标签直接用
    groups: groups.map((g) => {
      const ts = trades.filter((t) => t.open && t.group === g.key);
      return { ...g, tradeKeys: ts.map((t) => t.key), hasPros: ts.some((t) => withPros.has(t.key)) };
    }),
    // D26：「全部工种和服务」方块上的数（开放工种数）和现成的字
    openTradeCount: trades.filter((t) => t.open).length,
    allTradesText: `全部 ${trades.filter((t) => t.open).length} 项 ›`,
    trades: trades.map((t) => ({
      key: t.key, name: t.name, group: t.group, licType: t.licType, open: t.open, hasPros: withPros.has(t.key), noPost: t.noPost, noNotify: t.noNotify, icon: t.icon, scope: TRADE_SCOPE[t.key] ?? null
    })),
    // D29：pinned = 常显（不管有没有人都出，没人时标“招募中”）；hasPros = 这个入口指向的工种 / 这一组里有没有核验通过的人
    homeEntries: entries.map((e) => ({
      label: e.label, icon: e.icon, target: e.target, pinned: e.pinned,
      hasPros: e.target.type === 'trade' ? withPros.has(e.target.key) : trades.some((t) => t.open && t.group === e.target.key && withPros.has(t.key))
    })),
    // D11 冷启动：一个核验通过的人都没有时，首页方块区换成一行招募说明 +「全部工种和服务」；没人的工种标“招募中”
    anyPros: trades.some((t) => t.open && withPros.has(t.key)),
    recruitingText: RECRUITING_TEXT,
    tradeRecruitingText: TRADE_RECRUITING_TEXT,
    recruitingLabel: RECRUITING_LABEL,
    cities,
    me: { pro: await proBrief(pool, v.contactId) },
    latest: showLatest ? await latestPosts(3) : [],
    options: {
      proRoles: PRO_ROLES, posterRoles: v.mp ? POSTER_ROLES.filter((r) => r.key !== 'crew') : POSTER_ROLES, timings: TIMINGS, propertyTypes: PROPERTY_TYPES,
      languages: LANGUAGES,
      // 旧字段（只有名字）：给还没改的调用方；新代码用上面的 cities（带 key）
      cityGroups: cities.map((g) => ({ region: g.region, cities: g.items.map((c) => c.name) })), turnoverTrades: TURNOVER_TRADES, siteVisitTrades: SITE_VISIT_TRADES
    },
    rules: RULES,
    disclaimer: DISCLAIMER,
    subscribeTemplate: jobsTemplate()?.id ?? null,
    webUrl: `${webBase()}${WEB_JOBS_PATH}`,
    postUrl: `${webBase()}${WEB_JOBS_PATH}/post`
  };
}

// ── 工作人员：活儿 ─────────────────────────────────────────────────────
export async function staffPosts(q: { status?: string | null; mp: boolean }) {
  const pool = getPool();
  const trades = await tradeMap(pool);
  const st = q.status && ['open', 'found', 'closed', 'removed'].includes(q.status) ? q.status : null;
  const { rows } = await pool.query<{
    id: string; title: string; status: PostStatus; close_reason: string | null; staff_note: string | null; city: string; trade_key: string; poster_role: string;
    created_at: Date; expires_at: Date; budget_range: string | null; contact_count: number; notified: number; reports: number; first_contact_at: Date | null; poster_name: string;
  }>(
    `SELECT p.id, p.title, p.status, p.close_reason, p.staff_note, COALESCE(jc.name, p.city) AS city, p.trade_key, p.poster_role, p.created_at, p.expires_at, p.budget_range, p.first_contact_at,
            c.name AS poster_name,
            (SELECT count(*)::int FROM jobs_contacts jc WHERE jc.direction = 'post' AND jc.post_id = p.id) AS contact_count,
            (SELECT count(*)::int FROM jobs_notifications n WHERE n.kind = 'dispatch' AND n.post_id = p.id) AS notified,
            (SELECT count(*)::int FROM jobs_reports r WHERE r.target_type = 'post' AND r.target_id = p.id AND r.status = 'open') AS reports
       FROM jobs_posts p JOIN contacts c ON c.id = p.contact_id LEFT JOIN jobs_cities jc ON jc.key = p.city_key
      WHERE ($1::text IS NULL OR p.status = $1) ORDER BY p.created_at DESC LIMIT 300`,
    [st]
  );
  return {
    items: rows.map((r) => q.mp
      ? { id: r.id, title: r.title, status: r.status, statusLabel: STATUS_LABEL[r.status], contactCount: r.contact_count, note: r.staff_note }
      : {
          id: r.id, title: r.title, status: r.status, statusLabel: STATUS_LABEL[r.status], closeReason: r.close_reason, note: r.staff_note, city: r.city,
          tradeName: trades.get(r.trade_key)?.name ?? r.trade_key, posterLabel: posterLabel(r.poster_role), posterName: r.poster_name,
          createdAt: r.created_at, expiresAt: r.expires_at, budget: r.budget_range, contactCount: r.contact_count, notifiedCount: r.notified,
          openReports: r.reports, firstContactAt: r.first_contact_at
        })
  };
}

export async function staffPostAction(s: Staff, id: string, b: Record<string, unknown>) {
  const pool = getPool();
  const actor = `staff:${s.name || s.email}`;
  const note = typeof b.note === 'string' ? b.note.trim().slice(0, 1000) : '';
  if (b.action === 'remove') {
    const { rowCount } = await pool.query(
      `UPDATE jobs_posts SET status = 'removed', close_reason = 'staff', removed_by = $2, staff_note = COALESCE(NULLIF($3, ''), staff_note), updated_at = now() WHERE id = $1`,
      [id, actor, note]
    );
    if (!rowCount) throw new CrmError('not_found', '找不到这个活儿');
  } else if (b.action === 'note') {
    const { rowCount } = await pool.query(`UPDATE jobs_posts SET staff_note = $2, updated_at = now() WHERE id = $1`, [id, note || null]);
    if (!rowCount) throw new CrmError('not_found', '找不到这个活儿');
  } else {
    throw new CrmError('bad_request', 'action 只能是 remove 或 note');
  }
  await pool.query(`INSERT INTO crm_audit_log (actor, action, target_type, target_id, reason) VALUES ($1, $2, 'jobs_post', $3, $4)`, [actor, `jobs_post_${b.action}`, id, note || null]);
  const { rows } = await pool.query<{ id: string; title: string; status: PostStatus; staff_note: string | null }>(`SELECT id, title, status, staff_note FROM jobs_posts WHERE id = $1`, [id]);
  return { post: { id: rows[0].id, title: rows[0].title, status: rows[0].status, statusLabel: STATUS_LABEL[rows[0].status], note: rows[0].staff_note } };
}

// ── 统计：每个工种的点击数、活儿数、联系次数、成了的数、平均多久有人联系 ──
export async function stats(days = 90) {
  const pool = getPool();
  const trades = await loadTrades(pool);
  const { rows: clicks } = await pool.query<{ target: string; n: number }>(
    `SELECT target, count(*)::int AS n FROM track_events WHERE name IN ('jobs_trade', 'jobs_home_entry') AND created_at > now() - make_interval(days => $1) GROUP BY target`,
    [days]
  );
  const { rows: posts } = await pool.query<{ trade_key: string; posts: number; contacts: number; deals: number; avg_hours: number | null; contacted: number }>(
    `SELECT p.trade_key, count(*)::int AS posts,
            coalesce(sum((SELECT count(*) FROM jobs_contacts jc WHERE jc.direction = 'post' AND jc.post_id = p.id)), 0)::int AS contacts,
            count(*) FILTER (WHERE EXISTS (SELECT 1 FROM jobs_followups f WHERE f.post_id = p.id AND f.deal) OR p.status = 'found')::int AS deals,
            avg(extract(epoch FROM (p.first_contact_at - p.created_at)) / 3600) FILTER (WHERE p.first_contact_at IS NOT NULL) AS avg_hours,
            count(*) FILTER (WHERE p.first_contact_at IS NOT NULL)::int AS contacted
       FROM jobs_posts p WHERE p.created_at > now() - make_interval(days => $1) GROUP BY p.trade_key`,
    [days]
  );
  const { rows: pros } = await pool.query<{ status: string; n: number }>(`SELECT status, count(*)::int AS n FROM jobs_pros GROUP BY status`);
  const { rows: listedPros } = await pool.query<{ k: string; n: number }>(`SELECT unnest(verified_trades) AS k, count(*)::int AS n FROM jobs_pros WHERE listed GROUP BY 1`);
  const { rows: fu } = await pool.query<{ sent: number; answered: number; reached: number; deal: number; satisfied: number }>(
    `SELECT count(*)::int AS sent, count(answered_at)::int AS answered, count(*) FILTER (WHERE reached)::int AS reached,
            count(*) FILTER (WHERE deal)::int AS deal, count(*) FILTER (WHERE satisfied)::int AS satisfied FROM jobs_followups WHERE created_at > now() - make_interval(days => $1)`,
    [days]
  );
  // D28：免费额度——用过免费额度的人数、用完后入会的人数（先刷新用完过的人的会员状态）
  const { rows: usedUp } = await pool.query<{ id: string }>(`SELECT id FROM jobs_pros WHERE free_used_up_at IS NOT NULL AND joined_after_quota_at IS NULL`).catch(() => ({ rows: [] as { id: string }[] }));
  if (usedUp.length) {
    const { refreshPro } = await import('./pros');
    for (const r of usedUp.slice(0, 200)) await refreshPro(pool, r.id).catch(() => undefined);
  }
  const { rows: fq } = await pool.query<{ used: number; used_up: number; joined: number }>(
    `SELECT (SELECT count(DISTINCT viewer_contact_id) FROM jobs_contacts WHERE direction = 'post' AND free_used)::int AS used,
            (SELECT count(*) FROM jobs_pros WHERE free_used_up_at IS NOT NULL)::int AS used_up,
            (SELECT count(*) FROM jobs_pros WHERE joined_after_quota_at IS NOT NULL)::int AS joined`
  ).catch(() => ({ rows: [{ used: 0, used_up: 0, joined: 0 }] }));
  const c = new Map(clicks.map((r) => [r.target, r.n]));
  const p = new Map(posts.map((r) => [r.trade_key, r]));
  const l = new Map(listedPros.map((r) => [r.k, r.n]));
  return {
    days,
    trades: trades.map((t) => {
      const x = p.get(t.key);
      return {
        key: t.key, name: t.name, group: t.group, clicks: c.get(t.key) ?? 0, pros: l.get(t.key) ?? 0, posts: x?.posts ?? 0, contacts: x?.contacts ?? 0,
        deals: x?.deals ?? 0, avgHoursToContact: x?.avg_hours != null ? Math.round(Number(x.avg_hours) * 10) / 10 : null
      };
    }),
    pros: Object.fromEntries(pros.map((r) => [r.status, r.n])),
    followups: fu[0],
    /** D28：freeUsedPeople 用了免费额度的人数（看过至少一条被扣了次数）；usedUpPeople 用完的人数；joinedAfterUsedUp 用完后入会的人数 */
    freeQuota: { freeUsedPeople: fq[0]?.used ?? 0, usedUpPeople: fq[0]?.used_up ?? 0, joinedAfterUsedUp: fq[0]?.joined ?? 0 }
  };
}

// ── 投诉 ────────────────────────────────────────────────────────────────
export async function staffReports(status: string | null) {
  const { rows } = await getPool().query(
    `SELECT r.id, r.target_type AS "targetType", r.target_id AS "targetId", r.reason, r.status, r.handled_by AS "handledBy", r.handled_note AS "handledNote", r.created_at AS "createdAt",
            COALESCE(pr.name, po.title) AS "targetLabel", c.name AS "reporterName"
       FROM jobs_reports r LEFT JOIN jobs_pros pr ON r.target_type = 'pro' AND pr.id = r.target_id
       LEFT JOIN jobs_posts po ON r.target_type = 'post' AND po.id = r.target_id LEFT JOIN contacts c ON c.id = r.reporter_contact_id
      WHERE ($1::text IS NULL OR r.status = $1) ORDER BY r.created_at DESC LIMIT 300`,
    [status === 'open' || status === 'handled' ? status : null]
  );
  return { items: rows };
}
export async function handleReport(s: Staff, id: string, b: Record<string, unknown>) {
  const actor = `staff:${s.name || s.email}`;
  const note = typeof b.note === 'string' ? b.note.trim().slice(0, 1000) : null;
  const { rowCount } = await getPool().query(`UPDATE jobs_reports SET status = 'handled', handled_by = $2, handled_note = $3 WHERE id = $1`, [id, actor, note]);
  if (!rowCount) throw new CrmError('not_found', '找不到这条反馈');
  await resolveException(`jobs_report:${id}`, actor).catch(() => undefined);
  return { id, status: 'handled' };
}

// ── 邀请现有会员来登记接活（按行业标签筛） ────────────────────────────
export async function inviteCandidates(roleCategory: string | null, roleSub: string | null) {
  const { rows } = await getPool().query(
    `SELECT c.id, c.name, c.role_category AS "roleCategory", c.role_sub AS "roleSub",
            EXISTS (SELECT 1 FROM jobs_pros p WHERE p.contact_id = c.id) AS "registered",
            (SELECT max(n.created_at) FROM jobs_notifications n WHERE n.kind = 'invite' AND n.status <> 'dry_run' AND n.contact_id = c.id) AS "invitedAt"
       FROM contacts c
      WHERE c.merged_into IS NULL AND ($1::text IS NULL OR c.role_category = $1) AND ($2::text IS NULL OR c.role_sub = $2)
        AND (c.role_category IS NOT NULL OR $1::text IS NULL)
        AND EXISTS (SELECT 1 FROM applications a WHERE a.contact_id = c.id)
      ORDER BY c.name LIMIT 500`,
    [roleCategory || null, roleSub || null]
  );
  return { items: rows };
}
/**
 * 发邀请。默认演练（dryRun 不是 false 就是演练）：只记一行 status='dry_run'，一条都不发。
 * 真发（dryRun:false）要：管理员；正式环境两个开关都开着；测试站只会发给测试身份（其他人记 blocked，见 notify.ts 的保险）。
 */
export async function sendInvites(s: Staff, b: Record<string, unknown>) {
  const ids = (Array.isArray(b.contactIds) ? b.contactIds : []).filter((x): x is string => typeof x === 'string' && /^[0-9a-f-]{36}$/i.test(x)).slice(0, 200);
  if (!ids.length) throw new CrmError('bad_request', '请先勾选要邀请的会员');
  const dryRun = b.dryRun !== false;
  const pool = getPool();
  if (!dryRun) {
    if (!staffCan(s, 'admin')) throw new CrmError('forbidden', '真正发送邀请只限管理员；可以先演练看看会发给谁');
    if (isProduction()) {
      const sw = await getSwitches(pool);
      if (!sw.find || !sw.work) throw new CrmError('conflict', '「找工人」「接活」两个开关都打开后才能真正发送邀请');
    }
  }
  const out = { dryRun, sent: 0, blocked: 0, failed: 0, skipped: 0, wouldSend: 0 };
  const text = `SAREC：商会新开了「找工人·接活儿」。登记一次，有对口的活儿会第一时间通知你：${webBase()}${WEB_JOBS_PATH}/register`;
  for (const id of ids) {
    const { rows } = await pool.query(
      `SELECT 1 FROM jobs_notifications WHERE kind = 'invite' AND contact_id = $1 AND status <> 'dry_run' AND created_at > now() - interval '30 days'`,
      [id]
    );
    if (rows[0]) { out.skipped++; continue; }
    if (dryRun) {
      await pool.query(`INSERT INTO jobs_notifications (kind, contact_id, channel, status, detail) VALUES ('invite', $1, 'none', 'dry_run', $2)`, [id, text.slice(0, 300)]);
      out.wouldSend++;
      continue;
    }
    const st = await deliver(pool, { kind: 'invite', contactId: id, sms: text });
    if (st === 'sent') out.sent++; else if (st === 'blocked') out.blocked++; else out.failed++;
  }
  await pool.query(`INSERT INTO crm_audit_log (actor, action, target_type, target_id, after_value) VALUES ($1, $2, 'contacts', 'batch', $3)`, [
    `staff:${s.name || s.email}`, dryRun ? 'jobs_invite_dry_run' : 'jobs_invite', JSON.stringify({ ids: ids.length, ...out })
  ]);
  return out;
}

export { recordException };
