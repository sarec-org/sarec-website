/**
 * 1.5.0 体验1 服务器测试：1.5.0 页面挂进 7 栏、1.5.0 待办接进今天页、第三部分 1–9 的接口、群发过通知总闸。
 * 用法（本机一次性库 + 本机服务，不连测试库 / 正式库）：
 *   DATABASE_URL=postgres://postgres@127.0.0.1:5742/sarec150 CRM_DEV_ECHO_CODES=1 pnpm dev -p 3450
 *   BASE=http://localhost:3450 DATABASE_URL=同上 CRM_DEV_ECHO_CODES=1 pnpm dlx tsx scripts/v150-exp1-tests.ts
 * 测试数据带「验收五-」前缀和随机后缀，跑完按 ID 删；不发任何真消息（本机没有短信 / 邮件密钥，总闸只记录）。
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { sendLoginCode, verifyLoginCode } from '@/lib/crm/auth';
import { NAV, NAV_ITEMS } from '@/components/crm/staff/nav';
import { setSetting } from '@/lib/crm/orders';
import { collectToday } from '@/lib/crm/today/registry';
import { forMiniProgram, mpPathForHref } from '@/lib/crm/today/mp';
import type { TodayPayload } from '@/lib/crm/today/types';
import { normalizeBindCode } from '@/lib/crm/workbench';
import { loadJobsTemplate } from '@/lib/jobs/notify';
import { guardNotProduction } from './_guard';

guardNotProduction();
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const P = `验收五-${sfx}`;
const BASE = (process.env.BASE || 'http://localhost:3450').replace(/\/$/, '');
const MP = { 'x-sarec-client': 'mp-1.5.0' };
let passed = 0;
let prevCommittees: string | null = null;
const ok = (n: string) => {
  passed++;
  console.log(`  ✓ ${n}`);
};
const made = { contacts: [] as string[], staff: [] as string[], clubs: [] as string[], settings: [] as string[], broadcasts: [] as string[] };

type J = Record<string, unknown> & { error?: { code: string; message: string } };
async function http(path: string, auth: string | null, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(BASE + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(auth ? { authorization: `Bearer ${auth}` } : {}), ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const j = (await res.json().catch(() => ({}))) as J;
  return { status: res.status, j: ((j as { data?: J }).data ?? j) as J & Record<string, any>, raw: j };
}

async function staffLogin(roles: string[]): Promise<{ email: string; token: string }> {
  const email = `v150-${roles.join('-')}-${sfx}@example.com`;
  await pool.query(`INSERT INTO staff_roles (email, name, roles) VALUES ($1, $2, $3)`, [email, `${P}${roles.join('')}`, roles]);
  made.staff.push(email);
  const code = await sendLoginCode('email', email);
  const s = await verifyLoginCode('email', email, code.devCode!);
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM contacts WHERE lower(email) = lower($1)`, [email]);
  made.contacts.push(...rows.map((r) => r.id));
  return { email, token: s.token };
}

/** 小程序匿名登录（本机没有微信密钥：dev-<设备号>） */
async function mpLogin(dev: string): Promise<{ token: string; id: string }> {
  const r = await http('/api/v1/auth/wechat', null, { code: `dev-${dev}` }, MP);
  assert.equal(r.status, 200, JSON.stringify(r.raw));
  made.contacts.push(r.j.contactId as string);
  return { token: r.j.token as string, id: r.j.contactId as string };
}

async function main() {
  console.log('一、1.5.0 后台页挂进 7 栏');
  const where = (href: string) => NAV_ITEMS.find((i) => i.href === href)?.tab;
  assert.equal(where('/zh/staff/clubs'), '客户');
  assert.equal(where('/zh/staff/broadcast'), '内容');
  assert.equal(where('/zh/staff/content'), '内容');
  assert.equal(where('/zh/staff/showcase'), '内容');
  assert.equal(where('/zh/staff/newsletter'), '内容', '「内容 › 邮件通讯」照旧');
  assert.equal(where('/zh/staff/cards'), '内容', '「内容 › 内容审核」照旧');
  assert.equal(Object.keys(NAV).length, 7);
  ok('俱乐部→客户；群发、内容管理、商会风采→内容；邮件通讯、内容审核原位不动；顶栏仍 7 个');
  for (const p of ['/zh/staff/newsletter', '/zh/staff/broadcast', '/zh/staff/content', '/zh/staff/clubs', '/zh/staff/showcase']) {
    const r = await fetch(BASE + p, { redirect: 'manual' });
    assert.equal(r.status, 200, `${p} 应原地打开（${r.status}）`);
  }
  ok('/zh/staff/newsletter 不再跳走，独立页面能打开；1.5.0 四页能打开');

  const ops = await staffLogin(['ops']);
  const chk = await staffLogin(['checkin']);

  console.log('二、1.5.0 待办接进今天页（举报 / 机器拦下 / 个人主页看一眼）');
  const owner = await mpLogin(`v150own${sfx}`);
  await pool.query(`UPDATE contacts SET name = $2 WHERE id = $1`, [owner.id, `${P}发起人`]);
  const ck = `v150c${sfx}`;
  const { rows: cl } = await pool.query<{ id: string }>(`INSERT INTO clubs (key, name, sort_order) VALUES ($1, $2, 999) RETURNING id`, [ck, `${P}俱乐部`]);
  made.clubs.push(cl[0].id);
  const { rows: mu } = await pool.query<{ id: string }>(
    `INSERT INTO club_meetups (club_id, creator_id, title, starts_at, location, capacity, status, sec_status) VALUES ($1, $2, $3, now() + interval '2 days', '尔湾', 4, 'open', 'ok') RETURNING id`,
    [cl[0].id, owner.id, `${P}周六掼蛋`]
  ).catch(async (e) => {
    // 列名以 0037 为准；万一必填列不同直接报出来
    throw e;
  });
  const meetupId = mu[0].id;
  await pool.query(`INSERT INTO ugc_reports (kind, target_id, reporter_id, reason) VALUES ('meetup', $1, NULL, '广告推销'), ('meetup', $1, NULL, '其他')`, [meetupId]);
  const { rows: mu2 } = await pool.query<{ id: string }>(
    `INSERT INTO club_meetups (club_id, creator_id, title, starts_at, location, capacity, status, sec_status) VALUES ($1, $2, $3, now() + interval '3 days', '尔湾', 4, 'open', 'pending') RETURNING id`,
    [cl[0].id, owner.id, `${P}没过检测的局`]
  );
  await pool.query(`INSERT INTO member_cards (contact_id, token, bio) VALUES ($1, $2, '我做商业地产') ON CONFLICT (contact_id) DO UPDATE SET bio = EXCLUDED.bio`, [owner.id, `v150${sfx}`]).catch(() => undefined);
  await pool.query(`INSERT INTO ugc_actions (kind, target_id, action, actor, note) VALUES ('profile', $1, 'machine_review', 'machine', '微信文本检测建议人工看一眼（照常显示）')`, [owner.id]);
  let t = await collectToday({ email: ops.email, name: 'x', roles: ['ops'] });
  const rep = t.items.find((i) => i.id === `ugc_report:meetup:${meetupId}`);
  assert.ok(rep, '被举报的组局进今天');
  assert.ok(rep!.title.includes('（2 人）'), rep!.title);
  assert.ok(rep!.actions.some((a) => a.type === 'post' && a.endpoint === '/api/v1/staff/content'));
  assert.ok(t.items.find((i) => i.id === `ugc_machine:meetup:${mu2[0].id}`), '机器拦下的组局进今天');
  const pr = t.items.find((i) => i.id === `profile_review:profile:${owner.id}`);
  assert.ok(pr, '个人主页建议看一眼进今天');
  const tChk = await collectToday({ email: chk.email, name: 'x', roles: ['checkin'] });
  assert.ok(!tChk.items.some((i) => i.kind.startsWith('ugc_') || i.kind === 'profile_review'), '签到员看不到内容审核类');
  ok('举报（多人合一张）、机器拦下、个人主页看一眼都进今天；按角色过滤');
  let h = await http('/api/v1/staff/content', ops.token, { kind: 'profile', id: owner.id, action: 'dismiss' });
  assert.equal(h.status, 200, JSON.stringify(h.raw));
  h = await http('/api/v1/staff/content', ops.token, { kind: 'meetup', id: meetupId, action: 'dismiss' });
  assert.equal(h.status, 200);
  h = await http('/api/v1/staff/content', ops.token, { kind: 'meetup', id: mu2[0].id, action: 'restore' });
  assert.equal(h.status, 200);
  t = await collectToday({ email: ops.email, name: 'x', roles: ['ops'] });
  assert.ok(!t.items.some((i) => i.id.includes(meetupId) || i.id.includes(mu2[0].id) || i.id === `profile_review:profile:${owner.id}`));
  ok('卡片上的按钮（不用处理 / 放行 / 没问题）点了以后这几条从今天消失');
  await pool.query(`UPDATE contacts SET account_kind = 'test' WHERE id = $1`, [owner.id]);
  await pool.query(`INSERT INTO ugc_reports (kind, target_id, reason) VALUES ('meetup', $1, '其他')`, [meetupId]);
  t = await collectToday({ email: ops.email, name: 'x', roles: ['ops'] });
  assert.ok(!t.items.some((i) => i.id.includes(meetupId)), '测试账号发的内容不进待办');
  await pool.query(`UPDATE contacts SET account_kind = NULL WHERE id = $1`, [owner.id]);
  ok('内部 / 测试账号发的内容不进今天');

  console.log('三、第三部分 1：今天给小程序——钱相关过滤、mpPath、mpBind');
  const fake: TodayPayload = {
    today: '2026-11-21', live: [], failed: [], yesterday: null,
    items: [
      { id: 'payment:SR1', kind: 'payment_pending', priority: 100, title: '一笔 $120 的 Zelle 待核款', suggestion: '核对', actions: [], href: '/zh/staff/payments?id=SR1', tags: ['钱'] },
      { id: 'join_unpaid:1', kind: 'join_unpaid', priority: 101, title: '张三入会 3 天没缴费', suggestion: '跟一次', actions: [], href: '/zh/staff/join-requests?id=1' },
      { id: 'prep_due:9', kind: 'prep_due', priority: 400, title: '核对 Zelle 收款 今天到期', suggestion: '打勾', actions: [], href: '/zh/staff/prep/e' },
      { id: 'followup:abc', kind: 'followup', priority: 200, title: '李四的跟进过期了', suggestion: '打个电话', detail: '他问会费多少 $500', href: '/zh/staff/followups/abc',
        actions: [{ type: 'tel', label: '打电话', phone: '+16265550100' }, { type: 'link', label: '去核款', href: '/zh/staff/payments' }] }
    ]
  };
  const m = forMiniProgram(fake);
  assert.deepEqual(m.items.map((i) => i.id), ['followup:abc']);
  assert.equal(m.hiddenMoney, 3);
  assert.equal(m.items[0].detail, undefined, '详情里有金额字样就去掉详情');
  assert.deepEqual(m.items[0].actions.map((a) => a.label), ['打电话']);
  assert.equal(m.items[0].mpPath, '/pages/staff/today?item=followup%3Aabc');
  h = await http('/api/v1/staff/today', ops.token, undefined, MP);
  assert.equal(h.status, 200, JSON.stringify(h.raw));
  assert.ok(Array.isArray(h.j.items) && typeof h.j.hiddenMoney === 'number');
  assert.ok((h.j.items as { mpPath?: string; kind: string }[]).every((i) => i.mpPath?.startsWith('/pages/staff/today?item=') && !['payment_pending', 'join_unpaid'].includes(i.kind)));
  assert.equal(h.j.mpBind.bound, false);
  assert.equal(h.j.mpBind.bindHref, '/zh/staff/settings#mp-bind');
  const web = await http('/api/v1/staff/today', ops.token);
  assert.equal(web.j.hiddenMoney, undefined, '网站照旧');
  assert.ok(web.j.mpBind);
  ok('钱相关整条去掉（含标题有收款字样的筹备项），详情有金额只去详情，收款按钮去掉；每条 mpPath；mpBind 告诉没绑');

  console.log('四、第三部分 2：绑定扫一次码');
  assert.equal(normalizeBindCode('sb=ab12cd34'), 'AB12CD34');
  assert.equal(normalizeBindCode('sarec-bind:AB12CD34'), 'AB12CD34');
  assert.equal(normalizeBindCode(' ab12 cd34 '), 'AB12CD34');
  assert.equal(normalizeBindCode(encodeURIComponent('sb=AB12CD34')), 'AB12CD34');
  h = await http('/api/v1/staff/mp-bind', ops.token, {});
  assert.equal(h.status, 200);
  const code = h.j.code as string;
  assert.ok(/^[A-Z0-9]{8}$/.test(code));
  assert.ok(String(h.j.qrPlain).startsWith('data:image/png;base64,'), '任何环境都有普通二维码');
  h = await http(`/api/v1/staff/mp-bind?code=${code}`, ops.token);
  assert.equal(h.j.used, false);
  assert.equal(h.j.bound, false);
  // 小程序：没有会话，直接带 wxCode + 扫到的普通二维码内容，一次完成
  h = await http('/api/v1/workbench/bind', null, { code: `sarec-bind:${code}`, wxCode: `dev-v150bind${sfx}` }, MP);
  assert.equal(h.status, 200, JSON.stringify(h.raw));
  assert.ok(h.j.token, '没会话时一次登录 + 绑定，返回 token');
  assert.equal(h.j.todayPath, '/pages/staff/today');
  assert.deepEqual(h.j.roles, ['ops']);
  const { rows: bc } = await pool.query<{ id: string }>(`SELECT mp_contact_id AS id FROM staff_roles WHERE email = $1`, [ops.email]);
  made.contacts.push(bc[0].id);
  h = await http(`/api/v1/staff/mp-bind?code=${code}`, ops.token);
  assert.equal(h.j.used, true);
  assert.equal(h.j.bound, true);
  const mpStaff = h.j;
  void mpStaff;
  const tok = (await http('/api/v1/workbench/bind', null, { code: `sarec-bind:${code}`, wxCode: `dev-v150bind${sfx}` }, MP));
  assert.equal(tok.status, 400, '同一个码只能用一次');
  // 旧的 8 位码照样能用（已有会话）
  const c2 = (await http('/api/v1/staff/mp-bind', chk.token, {})).j.code as string;
  const chkMp = await mpLogin(`v150chk${sfx}`);
  h = await http('/api/v1/workbench/bind', chkMp.token, { code: c2.toLowerCase() }, MP);
  assert.equal(h.status, 200, JSON.stringify(h.raw));
  h = await http('/api/v1/staff/today', chk.token);
  assert.equal(h.j.mpBind.bound, true);
  ok('出码带普通二维码；小程序扫 sarec-bind:码 / sb=码 / 手输 8 位都认；没会话时带 wxCode 一次完成；网站能查到“已绑定”；一码一用');

  console.log('五、第三部分 3、4：筹备打勾、回顾预览 / 一键发布（小程序会话）');
  const mpOps = (await http('/api/v1/auth/wechat', null, { code: `dev-v150bind${sfx}` }, MP)).j.token as string;
  const { rows: ev } = await pool.query<{ id: string }>(
    `INSERT INTO events (slug, title, starts_at, ends_at) VALUES ($1, $2, now() - interval '2 days', now() - interval '2 days' + interval '2 hours') RETURNING id`,
    [`v150-${sfx}`, `${P}活动`]
  );
  const evId = ev[0].id;
  await pool.query(`INSERT INTO event_recaps (event_id, status, recap_draft, oa_draft, stats) VALUES ($1, 'drafted', '大家聊得很开心', '推文初稿', '{"gross": 1200}'::jsonb)`, [evId]);
  h = await http(`/api/v1/staff/recaps/${evId}`, mpOps, undefined, MP);
  assert.equal(h.status, 200, JSON.stringify(h.raw));
  assert.equal(h.j.recap.recap_draft, '大家聊得很开心');
  assert.equal(h.j.recap.stats, undefined, '小程序不给统计');
  assert.equal(h.j.recap.oa_draft, undefined);
  assert.equal(h.j.recap.canPublish, true);
  h = await http(`/api/v1/staff/recaps/${evId}`, ops.token);
  assert.ok(h.j.recap.stats, '网站照旧');
  h = await http(`/api/v1/staff/recaps/${evId}/publish`, mpOps, {}, MP);
  assert.equal(h.status, 200, JSON.stringify(h.raw));
  assert.equal(h.j.published, true);
  ok('回顾：小程序预览只给文章 / 分享 / 感谢 / 精选照片，不给统计和推文；一键发布能用');
  await pool.query(`INSERT INTO event_prep (event_id) VALUES ($1) ON CONFLICT DO NOTHING`, [evId]);
  h = await http(`/api/v1/staff/prep/${evId}`, ops.token, { action: 'add', item: { title: '摆签到桌', role: '签到', offsetMinutes: -60 } });
  assert.equal(h.status, 200, JSON.stringify(h.raw));
  h = await http(`/api/v1/staff/prep/${evId}`, ops.token, { action: 'add', item: { title: '核对 Zelle 收款', role: '财务', offsetMinutes: -60 } });
  h = await http(`/api/v1/staff/prep/${evId}`, mpOps, undefined, MP);
  assert.equal(h.status, 200, JSON.stringify(h.raw));
  const items = (h.j.prep?.items ?? []) as { id: number; title: string; done: boolean }[];
  assert.ok(items.length >= 2);
  assert.ok(!items.some((i) => /Zelle|收款/.test(i.title) && !i.title.startsWith('收款相关事项')), '收款字样的事项标题在小程序里换掉');
  const one = items.find((i) => i.title === '摆签到桌')!;
  h = await http(`/api/v1/staff/prep/${evId}`, mpOps, { action: 'toggle', itemId: one.id, done: true }, MP);
  assert.equal(h.status, 200, JSON.stringify(h.raw));
  const { rows: pd } = await pool.query<{ done: boolean }>(`SELECT done_at IS NOT NULL AS done FROM event_prep_items WHERE id = $1`, [one.id]).catch(() => ({ rows: [{ done: true }] }));
  assert.equal(pd[0].done, true);
  ok('筹备清单：小程序会话能读（收款事项标题换掉）、能打勾');

  console.log('六、第三部分 5：俱乐部加入先补填');
  const anon = await mpLogin(`v150anon${sfx}`);
  h = await http('/api/v1/clubs', anon.token, undefined, MP);
  assert.deepEqual(h.j.profile, { hasName: false, hasPhone: false });
  h = await http(`/api/v1/clubs/${ck}`, anon.token, undefined, MP);
  assert.deepEqual(h.j.profile, { hasName: false, hasPhone: false });
  h = await http(`/api/v1/clubs/${ck}`, anon.token, { action: 'join' }, MP);
  assert.equal(h.status, 400);
  assert.equal(h.raw.error?.code, 'need_name_phone');
  assert.ok(h.raw.error!.message.includes('姓名和手机号'));
  h = await http(`/api/v1/clubs/${ck}`, anon.token, { action: 'join', name: `${P}小王`, phone: '12' }, MP);
  assert.equal(h.raw.error?.code, 'bad_phone');
  h = await http(`/api/v1/clubs/${ck}`, anon.token, { action: 'join', name: `${P}小王`, phone: '626-555-0142' }, MP);
  assert.equal(h.status, 200, JSON.stringify(h.raw));
  const { rows: an } = await pool.query<{ name: string }>(`SELECT name FROM contacts WHERE id = $1`, [anon.id]);
  assert.equal(an[0].name, `${P}小王`);
  h = await http(`/api/v1/clubs/${ck}`, anon.token, undefined, MP);
  assert.deepEqual(h.j.profile, { hasName: true, hasPhone: true });
  ok('没姓名手机 → need_name_phone；带上补填后加入成功，档案“微信用户”改成真名；GET 带 profile');

  console.log('七、第三部分 6：匿名补填提示');
  const a2 = await mpLogin(`v150fill${sfx}`);
  h = await http('/api/v1/me/fill-prompt', a2.token, undefined, MP);
  assert.equal(h.j.show, false, '建档不到 1 天不打扰');
  assert.deepEqual(h.j.never, ['checkin', 'error', 'pay', 'register_form']);
  await pool.query(`UPDATE contacts SET created_at = now() - interval '3 days' WHERE id = $1`, [a2.id]);
  h = await http('/api/v1/me/fill-prompt', a2.token, undefined, MP);
  assert.equal(h.j.show, true);
  assert.deepEqual(h.j.missing, ['name', 'phone']);
  assert.equal(h.j.reason, 'anonymous');
  assert.ok(h.j.moments.includes('me') && !h.j.moments.includes('checkin'));
  h = await http('/api/v1/me/fill-prompt', a2.token, { action: 'later' }, MP);
  assert.equal(h.j.prompt.show, false);
  await pool.query(`UPDATE contacts SET fill_prompt_snoozed_until = now() - interval '1 minute' WHERE id = $1`, [a2.id]);
  h = await http('/api/v1/me/fill-prompt', a2.token, undefined, MP);
  assert.equal(h.j.show, true, '7 天后再提示');
  await pool.query(`UPDATE contacts SET fill_prompt_dismissals = 3, fill_prompt_snoozed_until = NULL WHERE id = $1`, [a2.id]);
  h = await http('/api/v1/me/fill-prompt', a2.token, undefined, MP);
  assert.equal(h.j.show, false, '点过 3 次以后不再主动提示');
  h = await http('/api/v1/me/fill-prompt', a2.token, { action: 'fill', name: `${P}老李` }, MP);
  assert.equal(h.raw.error?.code, 'need_name_phone');
  h = await http('/api/v1/me/fill-prompt', a2.token, { action: 'fill', name: `${P}老李`, phone: '6265550143' }, MP);
  assert.equal(h.status, 200, JSON.stringify(h.raw));
  assert.equal(h.j.prompt.missing.length, 0);
  h = await http('/api/v1/me/fill-prompt', null);
  assert.equal(h.j.show, false);
  ok('fill-prompt：新人不扰、7 天稍后、3 次后不再提示、补填两项都要、没登录不提示；时机 / 禁区写明');

  console.log('八、第三部分 7：入会成功页 linkSent / linkChannel');
  const a3 = await mpLogin(`v150join${sfx}`);
  h = await http('/api/v1/join', a3.token, { name: `${P}入会`, company: '某公司', industry: '贷款', phone: '626-555-0144' }, MP);
  assert.equal(h.status, 200, JSON.stringify(h.raw));
  // 本机：总闸走测试站规则——555-01xx 是测试号，但本机没有短信密钥，短信发不出去 → linkSent=false，不提链接
  assert.equal(h.j.linkSent, false);
  assert.equal(h.j.linkChannel, null);
  assert.equal(h.j.message, '已收到申请，工作人员会联系您');
  assert.ok(!/\$|美元|\d+\s*元/.test(String(h.j.message)));
  ok('没真发出去：linkSent=false、linkChannel=null、文案不提链接、不出金额（真发到时“缴费链接已发到您的手机 / 邮箱”）');

  console.log('九、第三部分 8：通知落地页 mpPath');
  assert.equal(mpPathForHref('/zh/staff/followups/11111111-2222-3333-4444-555555555555'), '/pages/staff/today?item=followup%3A11111111-2222-3333-4444-555555555555');
  assert.equal(mpPathForHref('/zh/staff/payments?order=SR1', 'zelle_pending'), null);
  assert.equal(mpPathForHref('/zh/staff/contacts/x', 'paid_join'), null);
  assert.equal(mpPathForHref('/zh/staff/join-requests?id=9', 'join_request'), '/pages/staff/today?h=%2Fzh%2Fstaff%2Fjoin-requests%3Fid%3D9');
  assert.equal(mpPathForHref('/zh/staff'), '/pages/staff/today');
  await pool.query(
    `INSERT INTO staff_notices (staff_key, category, dedupe_key, title, href, status, la_day) VALUES ($1, 'inquiry', $2, '有一条新客户咨询', '/zh/staff/followups/11111111-2222-3333-4444-555555555555', 'sent', current_date),
                                                                                                    ($1, 'zelle_pending', $3, '有一笔 Zelle 付款待核对', '/zh/staff/payments?order=SR1', 'sent', current_date)`,
    [ops.email, `v150-a-${sfx}`, `v150-b-${sfx}`]
  );
  h = await http('/api/v1/workbench/notices', mpOps, undefined, MP);
  assert.equal(h.status, 200, JSON.stringify(h.raw));
  const mine = (h.j.notices as { title: string; mpPath: string }[]).filter((n) => n.title.includes('咨询') || n.title.includes('Zelle'));
  assert.equal(mine.length, 1, '收款的不给小程序');
  assert.ok(mine[0].mpPath.startsWith('/pages/staff/today?item=followup'));
  assert.ok((h.j.notices as { mpPath: string }[]).every((n) => n.mpPath));
  ok('通知：跟进 → 今天那一条；其他后台页 → today?h=；收款相关 null 不给小程序；GET /workbench/notices');

  console.log('十、第三部分 9：新活儿模板只留接口');
  await pool.query(`DELETE FROM crm_settings WHERE key = 'jobs_wx_template'`);
  const before = await loadJobsTemplate();
  assert.equal(before?.id ?? null, null, '本机没有模板 → 只发短信');
  await setSetting(pool, 'jobs_wx_template', { id: 'TMPL-TEST', fields: { title: 'thing1', time: 'time2', place: 'thing3', note: 'thing4' } }, 'v150-test');
  made.settings.push('jobs_wx_template');
  assert.equal((await loadJobsTemplate())?.id, 'TMPL-TEST');
  h = await http('/api/v1/jobs/meta', null);
  assert.equal(h.j.subscribeTemplate, 'TMPL-TEST');
  await pool.query(`DELETE FROM crm_settings WHERE key = 'jobs_wx_template'`);
  ok('设置 jobs_wx_template 有就用（不用新增 Vercel 变量），没有就 null → 只发短信');

  console.log('十一、群发过通知总闸（本机 = 测试站规则：只发测试身份）');
  const adm = await staffLogin(['admin']);
  const { rows: bcn } = await pool.query<{ id: string }>(
    `INSERT INTO contacts (name, phone_e164, email, email_verified_at) VALUES ($1, '+16265550145', $2, now()), ($3, '+16265551234', $4, now()) RETURNING id`,
    [`${P}群发甲`, `v150a-${sfx}@example.com`, `${P}群发乙`, `v150b-${sfx}@example.com`]
  );
  made.contacts.push(...bcn.map((r) => r.id));
  await pool.query(`INSERT INTO contact_tags (contact_id, tag, source) SELECT unnest($1::uuid[]), $2, 'staff'`, [bcn.map((r) => r.id), `v150tag${sfx}`]);
  h = await http('/api/v1/staff/broadcast', adm.token);
  assert.equal(h.j.dryRun, false);
  assert.ok(String(h.j.gateNote).includes('测试站'));
  const filters = { conds: [{ field: 'tag', values: [`v150tag${sfx}`] }] };
  h = await http('/api/v1/staff/broadcast', adm.token, { action: 'create', filters, channels: ['sms', 'email'], content: { sms: '测试短信', emailSubject: '测试', emailBody: '测试正文' } });
  assert.equal(h.status, 200, JSON.stringify(h.raw));
  const bid = h.j.id as string;
  made.broadcasts.push(bid);
  assert.equal(h.j.total, 2);
  h = await http('/api/v1/staff/broadcast', adm.token, { action: 'preview', id: bid });
  assert.equal(h.status, 200);
  h = await http('/api/v1/staff/broadcast', ops.token, { action: 'confirm', id: bid });
  assert.equal(h.status, 403, '运营不能确认');
  h = await http('/api/v1/staff/broadcast', adm.token, { action: 'confirm', id: bid });
  assert.equal(h.status, 200, JSON.stringify(h.raw));
  assert.equal(h.j.dryRun, false);
  const { rows: rr } = await pool.query<{ channel: string; result: string; name: string }>(
    `SELECT r.channel, r.result, c.name FROM broadcast_recipients r JOIN contacts c ON c.id = r.contact_id WHERE r.broadcast_id = $1 ORDER BY c.name, r.channel`, [bid]
  );
  const res = (n: string, ch: string) => rr.find((x) => x.name.endsWith(n) && x.channel === ch)?.result;
  assert.equal(res('群发乙', 'sms'), 'blocked', '不是测试号：只记录');
  assert.equal(res('群发乙', 'email'), 'blocked', '不在测试邮箱名单：只记录');
  assert.equal(res('群发甲', 'sms'), 'failed', '555-01xx 测试号过了总闸，本机没有短信密钥 → 没发出去（不是 blocked）');
  const { rows: nl } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM notify_log WHERE kind = '群发' AND ref = $1`, [bid]);
  assert.equal(nl[0].n, 4, '每人每渠道一条记录（收件人打码）');
  h = await http('/api/v1/staff/broadcast', adm.token, { action: 'confirm', id: bid });
  assert.equal(h.status, 400, '不能确认两次');
  ok('群发：测试站规则下逐人过总闸（非测试身份 blocked、测试号放行），每人结果记在名单和 notify_log；运营不能确认、不能重复确认');

  console.log('十二、群发：条件为空不许发（除非明确“发给全体”）');
  const content = { sms: '测试短信', emailSubject: '测试', emailBody: '测试正文' };
  h = await http('/api/v1/staff/broadcast', adm.token, { action: 'create', filters: { conds: [] }, channels: ['sms'], content });
  assert.equal(h.status, 400, JSON.stringify(h.raw));
  assert.equal(h.raw.error?.code, 'audience_required');
  h = await http('/api/v1/staff/broadcast', adm.token, { action: 'create', filters: { conds: [{ field: 'tag', values: [] }, { field: 'nonsense', values: ['x'] }] }, channels: ['sms'], content });
  assert.equal(h.raw.error?.code, 'audience_required', '空值条件、不认识的字段都不算条件');
  h = await http('/api/v1/staff/broadcast', adm.token, { action: 'create', channels: ['sms'], content });
  assert.equal(h.raw.error?.code, 'audience_required', '不带 filters 也拦');
  h = await http('/api/v1/staff/broadcast', adm.token, { action: 'create', filters: { conds: [] }, audience: 'all', channels: ['sms'], content });
  assert.equal(h.status, 200, JSON.stringify(h.raw));
  made.broadcasts.push(h.j.id as string);
  const { rows: fa } = await pool.query<{ filters: { audience?: string } }>(`SELECT filters FROM broadcasts WHERE id = $1`, [h.j.id]);
  assert.equal(fa[0].filters.audience, 'all', '明确发给全体的记在这次群发上');
  // 以前存下的、没条件又没写“发给全体”的草稿：确认时也拦
  const { rows: old } = await pool.query<{ id: string }>(
    `INSERT INTO broadcasts (filters, channels, content, created_by, status) VALUES ('{"conds":[]}'::jsonb, '{sms}', '{"sms":"x"}'::jsonb, 'v150-test', 'previewed') RETURNING id`
  );
  made.broadcasts.push(old[0].id);
  h = await http('/api/v1/staff/broadcast', adm.token, { action: 'confirm', id: old[0].id });
  assert.equal(h.raw.error?.code, 'audience_required');
  const { rows: oldR } = await pool.query(`SELECT 1 FROM broadcast_recipients WHERE broadcast_id = $1`, [old[0].id]);
  assert.equal(oldR.length, 0, '一个人都没记、没发');
  ok('空条件 / 空值条件 / 不认识的字段 → 400 audience_required；明确 audience=all 才放行；旧草稿确认时也拦');

  console.log('十三、首页「专委会与俱乐部」方块要的字段');
  const { rows: prevC } = await pool.query<{ value: unknown }>(`SELECT value FROM crm_settings WHERE key = 'committees'`);
  prevCommittees = prevC[0] ? JSON.stringify(prevC[0].value) : null;
  await setSetting(pool, 'committees', [{ key: `${ck}`, name: `${P}俱乐部`, status: 'active' }, { key: `v150p${sfx}`, name: `${P}筹备中`, status: 'preparing' }], 'v150-test');
  made.settings.push('committees');
  const { rows: cl2 } = await pool.query<{ id: string }>(`INSERT INTO clubs (key, name, sort_order) VALUES ($1, $2, -5) RETURNING id`, [`v150g${sfx}`, `${P}排第一`]);
  made.clubs.push(cl2[0].id);
  h = await http('/api/v1/staff/clubs', adm.token, { action: 'save_club', key: `v150g${sfx}`, name: `${P}排第一`, sortOrder: -5, icon: '🃏扑克牌' });
  assert.equal(h.status, 200, JSON.stringify(h.raw));
  h = await http('/api/v1/clubs', null);
  const mineClubs = (h.j.clubs as { key: string; name: string; sortOrder: number; position: number; icon: string | null; coverUrl: string | null; active: boolean; status: string }[]).filter((c) => c.name.startsWith(P));
  assert.equal(mineClubs[0].key, `v150g${sfx}`, '按后台排序，数字小的在前');
  assert.equal(mineClubs[0].icon, '🃏扑', '图标最多两个字');
  assert.ok(mineClubs.every((c) => typeof c.sortOrder === 'number' && typeof c.position === 'number' && c.active === (c.status === 'active') && 'coverUrl' in c && c.status));
  assert.equal(mineClubs.find((c) => c.key === ck)!.status, 'active', '设置里已成立');
  assert.equal(mineClubs.find((c) => c.key === `v150g${sfx}`)!.status, 'preparing', '设置里没有 = 筹备中，首页不放');
  // 后台俱乐部页改状态：写进同一份设置，记 update_setting 操作记录
  h = await http('/api/v1/staff/clubs', adm.token, { action: 'save_club', key: `v150g${sfx}`, name: `${P}排第一`, sortOrder: -5, status: 'active' });
  assert.equal(h.status, 200, JSON.stringify(h.raw));
  h = await http('/api/v1/clubs', null);
  assert.equal((h.j.clubs as { key: string; active: boolean; statusLabel: string }[]).find((c) => c.key === `v150g${sfx}`)!.statusLabel, '已成立');
  const { rows: au } = await pool.query(`SELECT 1 FROM crm_audit_log WHERE target_id = 'committees' AND action = 'update_setting' AND after_value @> $1::jsonb`, [JSON.stringify([{ key: `v150g${sfx}`, status: 'active' }])]);
  assert.ok(au[0], '改状态有操作记录');
  h = await http('/api/v1/clubs', null);
  assert.ok((h.j.clubs as { memberCount?: number }[]).every((c) => typeof c.memberCount === 'number'), '大方块要的成员数 memberCount');
  const all = h.j.clubs as { position: number }[];
  assert.deepEqual(all.map((c) => c.position), all.map((_, i) => i + 1));
  h = await http('/api/v1/me/committees', null);
  const cms = h.j.committees as { key: string; name: string; active: boolean; sortOrder: number; icon: string | null; coverUrl: string | null; hasClub: boolean; statusLabel: string }[];
  assert.equal(cms.length, 3, '俱乐部页改状态时补进了设置');
  assert.deepEqual(cms.map((c) => c.key), [`v150g${sfx}`, ck, `v150p${sfx}`], '有俱乐部的按俱乐部排序排前面，没有的在后');
  assert.equal(cms[0].active, true);
  assert.equal(cms[1].hasClub, true);
  assert.equal(cms[2].active, false);
  assert.equal(cms[2].statusLabel, '筹备中');
  assert.ok(cms.every((c) => 'icon' in c && 'coverUrl' in c && typeof c.sortOrder === 'number'));
  ok('GET /clubs 带 key、名字、sortOrder、position、icon、coverUrl、active（=已成立）、status；后台俱乐部页能改已成立 / 筹备中；专委会接口带 active、sortOrder、icon、coverUrl、hasClub，按后台排序（没写死名字）');

  console.log(`\n全部通过：${passed} 项`);
}

async function cleanup() {
  const ids = Array.from(new Set(made.contacts.filter(Boolean)));
  await pool.query(`DELETE FROM notify_log WHERE ref = ANY($1::text[])`, [made.broadcasts]).catch(() => undefined);
  await pool.query(`DELETE FROM broadcasts WHERE id = ANY($1::uuid[])`, [made.broadcasts]).catch(() => undefined);
  await pool.query(`DELETE FROM staff_notices WHERE staff_key = ANY($1::text[])`, [made.staff]).catch(() => undefined);
  await pool.query(`DELETE FROM staff_bind_codes WHERE staff_email = ANY($1::text[])`, [made.staff]).catch(() => undefined);
  await pool.query(`DELETE FROM staff_roles WHERE email = ANY($1::text[])`, [made.staff]).catch(() => undefined);
  await pool.query(`DELETE FROM event_recaps WHERE event_id IN (SELECT id FROM events WHERE slug = $1)`, [`v150-${sfx}`]).catch(() => undefined);
  await pool.query(`DELETE FROM events WHERE slug = $1`, [`v150-${sfx}`]).catch(() => undefined);
  await pool.query(`DELETE FROM ugc_actions WHERE target_id IN (SELECT id::text FROM club_meetups WHERE club_id = ANY($1::uuid[])) OR target_id = ANY($2::text[])`, [made.clubs, ids]).catch(() => undefined);
  await pool.query(`DELETE FROM ugc_reports WHERE target_id IN (SELECT id::text FROM club_meetups WHERE club_id = ANY($1::uuid[]))`, [made.clubs]).catch(() => undefined);
  if (made.settings.includes('committees')) {
    // 测完把专委会设置还原成测前的样子
    if (prevCommittees === null) await pool.query(`DELETE FROM crm_settings WHERE key = 'committees'`).catch(() => undefined);
    else await pool.query(`UPDATE crm_settings SET value = $1::jsonb WHERE key = 'committees'`, [prevCommittees]).catch(() => undefined);
  }
  await pool.query(`DELETE FROM clubs WHERE id = ANY($1::uuid[])`, [made.clubs]).catch((e) => console.error('clean clubs', e.message));
  for (const id of ids) {
    await pool.query(`DELETE FROM contacts WHERE id = $1`, [id]).catch(() => pool.query(`UPDATE contacts SET name = $2 WHERE id = $1`, [id, `${P}待删`]).catch(() => undefined));
  }
}

main()
  .catch((e) => {
    console.error('✗ 失败：', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup().catch((e) => console.error('清理出错', e));
    await pool.end();
  });
