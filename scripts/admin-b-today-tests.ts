/**
 * 后台综合优化 B 的测试：今天页（待办接口、排序、空列表、单类出错）、咨询分类、会员识别与草稿口气、
 * 通知邮件三按钮（口令 + 登录）、联系回填、推销垃圾汇总、notify_live 总闸、AI 日报空日不发、来源标签。
 * 用法（本机一次性库 + 本机服务）：
 *   DATABASE_URL=postgres://postgres@127.0.0.1:5639/sarec_b CRM_DEV_ECHO_CODES=1 pnpm dev -p 3427
 *   BASE=http://localhost:3427 DATABASE_URL=同上 CRM_DEV_ECHO_CODES=1 pnpm dlx tsx scripts/admin-b-today-tests.ts
 * 测试数据都带「验收优-」前缀和随机后缀；不发任何真消息（本机没有邮件 / 短信密钥，总闸只记录）。
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { sendLoginCode, verifyLoginCode } from '@/lib/crm/auth';
import { createInquiry, shouldNotifyInquiry } from '@/lib/crm/inquiries';
import { humanizeError } from '@/lib/crm/today/providers/c';
import { upsertFollowup } from '@/lib/crm/followups';
import { setSetting } from '@/lib/crm/orders';
import {
  buildDraft,
  checkActionToken,
  consumeActionToken,
  classifyInquiry,
  detectLang,
  dropJunk,
  issueActionToken,
  loadCards,
  quickAction,
  recordContactResult,
  sourceLabel
} from '@/lib/crm/followupKit';
import { buildFollowupEmail, runJunkDigest } from '@/lib/crm/followupMail';
import { gateSend, maskTarget } from '@/lib/crm/notifyGate';
import { collectToday, sortToday } from '@/lib/crm/today/registry';
import { PRIORITY, type TodayProvider } from '@/lib/crm/today/types';
import { laToday } from '@/lib/laDate';
import { guardNotProduction } from './_guard';

guardNotProduction();
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const P = `验收优-${sfx}`;
const BASE = (process.env.BASE || 'http://localhost:3427').replace(/\/$/, '');
let passed = 0;
const ok = (n: string) => {
  passed++;
  console.log(`  ✓ ${n}`);
};
const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 86400_000).toISOString().slice(0, 10);

async function http(path: string, cookie: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { cookie, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: res.status, j: (await res.json()) as Record<string, unknown> & { error?: { code: string; message: string } } };
}

async function main() {
  const today = laToday();
  console.log('分类（四.1）');
  assert.equal(classifyInquiry({ message: '想了解一下入会的流程和费用', intent: '其他' }).category, 'customer');
  assert.equal(classifyInquiry({ message: 'Hi, we are an accounting firm offering bookkeeping and tax preparation services to chambers.' }).category, 'pitch');
  assert.equal(classifyInquiry({ message: '您好，我们公司是专业会计师事务所，为您提供代账报税服务' }).category, 'pitch');
  assert.equal(classifyInquiry({ message: 'Best SEO services, backlinks cheap http://a.com http://b.com' }).category, 'spam');
  assert.equal(classifyInquiry({ message: '想找商会谈一个开发项目的融资' , intent: '找商会谈项目' }).category, 'customer');
  assert.equal(classifyInquiry({ message: '加入', intent: '加入商会' }).category, 'customer');
  assert.equal(detectLang('I want to join SAREC'), 'en');
  assert.equal(detectLang('我想入会'), 'zh');
  ok('客户咨询 / 合作或推销 / 垃圾按规则分；拿不准算客户；语言跟对方一致');

  const pitch = await createInquiry({ source: 'web_form', name: `${P}会计公司`, email: `pitch-${sfx}@example.com`, message: 'We are a CPA firm and provide bookkeeping services for your members.' });
  const cust = await createInquiry({ source: 'web_form', name: `${P}Rocco`, phone: '+16265550142', email: `rocco-${sfx}@example.com`, message: 'I would like to learn about investing in LA multifamily.' });
  const { rows: fr } = await pool.query<{ id: string; category: string; lang: string; draft: string | null; notified_at: Date | null }>(
    `SELECT id, category, lang, draft, notified_at FROM followups WHERE id = ANY($1::uuid[]) ORDER BY name`, [[pitch.followupId, cust.followupId]]
  );
  const fp = fr.find((x) => x.id === pitch.followupId)!;
  const fc = fr.find((x) => x.id === cust.followupId)!;
  assert.equal(fp.category, 'pitch');
  assert.equal(fp.draft, null, '推销不生成建议联系内容');
  assert.equal(fc.category, 'customer');
  assert.equal(fc.lang, 'en');
  ok('新咨询进来先分类并存下；推销不生成草稿');

  // J13-1：立即通知只给真实客户咨询（看 followups.category），推销 / 垃圾进每日汇总；通知链接直达这一条
  const spam = await createInquiry({ source: 'web_form', name: `${P}赌场`, email: `spam-${sfx}@example.com`, message: '线上赌场 注册就送 888 彩金 百家乐 真人荷官 http://example.com' });
  const { rows: sc } = await pool.query<{ category: string }>(`SELECT category FROM followups WHERE id = $1`, [spam.followupId]);
  assert.equal(sc[0].category, 'spam');
  assert.equal(await shouldNotifyInquiry(pitch.followupId, null), false, '推销不立即通知');
  assert.equal(await shouldNotifyInquiry(spam.followupId, null), false, '垃圾不立即通知');
  assert.equal(await shouldNotifyInquiry(cust.followupId, null), true, '客户咨询立即通知');
  const { rows: sn } = await pool.query<{ dedupe_key: string; href: string | null }>(
    `SELECT dedupe_key, href FROM staff_notices WHERE dedupe_key = ANY($1::text[])`, [[`inquiry:${pitch.followupId}`, `inquiry:${spam.followupId}`, `inquiry:${cust.followupId}`]]
  );
  assert.ok(!sn.some((x) => x.dedupe_key !== `inquiry:${cust.followupId}`), '推销 / 垃圾没有进立即通知');
  for (const x of sn) assert.equal(x.href, `/zh/staff/followups/${cust.followupId}`, '通知链接直达这一条处理页');
  ok('J13-1/J13-2：只有客户咨询立即通知（推销、垃圾不通知）；通知链接是 /zh/staff/followups/<编号>');

  // J13-4：失败异常的建议里不出现英文原文
  assert.equal(humanizeError('You need to verify a domain to send emails (resend)'), '发件域名还没在邮件服务里验证，邮件发不出去');
  assert.ok(!/[A-Za-z]{6,}/.test(humanizeError('Error: something weird happened in provider')));
  assert.equal(humanizeError('CSLB 官方名单在 GitHub 上下载失败（HTTP 503 Service Unavailable），请在「接活人核验」里一键打开详情页人工核对'), 'CSLB 官方名单在 GitHub 上下载失败，请在「接活人核验」里一键打开详情页人工核对');
  ok('J13-4：报错翻成人话，英文原文不进建议');

  console.log('会员识别和草稿口气（一.2、四.6）');
  const { rows: mc } = await pool.query<{ id: string }>(`INSERT INTO contacts (name, phone_e164) VALUES ($1, $2) RETURNING id`, [`${P}会员`, `+1626555${String(Date.now()).slice(-4)}`]);
  await pool.query(
    `INSERT INTO applications (application_type, email, contact_id, application_status, payment_status, membership_start_date, membership_end_date, selected_tier_slug)
     VALUES ('membership', $1, $2, 'approved', 'paid', $3::date - 30, $3::date + 300, 'member')`,
    [`m-${sfx}@example.com`, mc[0].id, today]
  );
  const mf = await upsertFollowup(pool, { source: 'post_event_interest', dedupeKey: `${P}:pe`, contactId: mc[0].id, name: `${P}会员`, need: '参加活动后希望了解：贷款', nextDate: addDays(today, -14) });
  const card = (await loadCards({ ids: [mf.id] }))[0];
  assert.equal(card.isMember, true);
  assert.equal(card.overdueDays, 14);
  const pres = buildDraft({ name: card.name, lang: 'zh', isMember: true, voice: 'president', by: '东哥', overdueDays: 14, source: card.source, need: card.need });
  const staff = buildDraft({ name: card.name, lang: 'zh', isMember: true, voice: 'staff', by: '小李', overdueDays: 0, source: card.source, need: card.need });
  assert.match(pres, /会长东哥/);
  assert.match(pres, /抱歉/);
  assert.match(pres, /会员/);
  assert.match(staff, /工作人员小李/);
  assert.doesNotMatch(staff, /抱歉/);
  const en = buildDraft({ name: 'Rocco', lang: 'en', isMember: true, voice: 'president', by: 'Dong', overdueDays: 3, source: 'inquiry', need: 'investing' });
  assert.match(en, /President of SAREC/);
  assert.match(en, /Sorry for the delay/);
  ok('缴费会员标"会员"；会长口气 / 工作人员口气；过期带致歉；英文咨询出英文草稿');

  assert.equal(sourceLabel('manual', 'join:abc'), '入会申请');
  assert.equal(sourceLabel('manual', 'cap_full:x:10'), '报名满员提醒');
  assert.equal(sourceLabel('manual', 'manual:123:abc'), '手动添加');
  ok('系统自动生成的不再标"手动添加"');

  console.log('今天页（三）');
  const empty = await collectToday({ email: 'x@example.com', name: 'x', roles: ['admin'] }, { providers: [], liveProviders: [] });
  assert.deepEqual(empty.items, []);
  const boom: TodayProvider = { kind: 'complaint', roles: ['ops'], list: async () => { throw new Error('x'); } };
  const fake: TodayProvider = {
    kind: 'exception', roles: ['ops'],
    list: async () => [
      { id: 'a', kind: 'exception', priority: PRIORITY.other, title: 'a', suggestion: '', actions: [], href: '/' },
      { id: 'b', kind: 'exception', priority: PRIORITY.money, title: 'b', suggestion: '', actions: [], href: '/' }
    ]
  };
  const part = await collectToday({ email: 'x@example.com', name: 'x', roles: ['ops'] }, { providers: [boom, fake], liveProviders: [] });
  assert.deepEqual(part.items.map((x) => x.id), ['b', 'a']);
  assert.deepEqual(part.failed, ['投诉']);
  const fin = await collectToday({ email: 'x@example.com', name: 'x', roles: ['checkin'] }, { providers: [fake] });
  assert.equal(fin.items.length, 0, '没权限的那类不给看');
  assert.deepEqual(sortToday([{ id: 'z', kind: 'followup', priority: 300, at: '2026-01-02', title: '', suggestion: '', actions: [], href: '' }, { id: 'y', kind: 'followup', priority: 300, at: '2026-01-01', title: '', suggestion: '', actions: [], href: '' }]).map((x) => x.id), ['y', 'z']);
  ok('空列表、单类出错不影响别的、按角色过滤、同档按时间');

  // 造各类待办
  const { rows: ev } = await pool.query<{ id: string }>(`INSERT INTO events (slug, title, starts_at) VALUES ($1, $2, now() - interval '3 days') RETURNING id`, [`ysy-${sfx}`, `${P}活动`]);
  await pool.query(`INSERT INTO event_recaps (event_id, recap_draft, stats) VALUES ($1, '这是一场很好的活动回顾。', '{"arrived": 12, "staffPhotos": 3, "guestPhotos": 1}')`, [ev[0].id]);
  const orderNo = `YSY${sfx}`.toUpperCase();
  await pool.query(`INSERT INTO orders (order_no, contact_id, purpose, amount_cents, status, description, submitted_at) VALUES ($1, $2, 'other', 15000, 'payment_submitted', $3, now())`, [orderNo, mc[0].id, `${P}会费`]);
  const { rows: pc } = await pool.query<{ id: string }>(`INSERT INTO contacts (name, email) VALUES ($1, $2) RETURNING id`, [`${P}师傅`, `pro-${sfx}@example.com`]);
  await pool.query(`INSERT INTO jobs_pros (contact_id, role, name, status) VALUES ($1, 'worker', $2, 'pending')`, [pc[0].id, `${P}师傅`]);

  const all = await collectToday({ email: 'boss@example.com', name: '东哥', roles: ['admin'] });
  const mine = all.items.filter((x) => x.title.includes(P) || x.id === `payment:${orderNo}` || x.id === `followup:${cust.followupId}`);
  const kinds = mine.map((x) => x.kind);
  const pos = (k: string) => kinds.indexOf(k as (typeof kinds)[number]);
  assert.ok(pos('recap_publish') === 0, '活动回顾置顶');
  assert.ok(pos('recap_publish') < pos('payment_pending') && pos('payment_pending') < pos('followup') && pos('followup') < pos('inquiry_new') && pos('inquiry_new') < pos('jobs_pro_verify'), `排序：${kinds.join(',')}`);
  const recap = mine.find((x) => x.kind === 'recap_publish')!;
  assert.ok(recap.actions.some((a) => a.type === 'link' && a.label === '看一眼') && recap.actions.some((a) => a.type === 'post' && a.label === '直接发布'));
  const memItem = mine.find((x) => x.id === `followup:${mf.id}`)!;
  assert.ok(memItem.tags?.includes('会员'));
  assert.ok(memItem.actions.some((a) => a.type === 'tel') && memItem.actions.some((a) => a.type === 'sms' && /会员/.test(a.body)));
  assert.ok(memItem.contactResult);
  const newItem = mine.find((x) => x.id === `followup:${cust.followupId}`)!;
  assert.equal(newItem.kind, 'inquiry_new');
  assert.ok(newItem.actions.some((a) => a.type === 'mailto' && /Hi /.test(a.body)), '英文咨询邮件草稿是英文');
  assert.ok(!all.items.some((x) => x.id === `followup:${pitch.followupId}`), '推销不单列');
  assert.ok(all.items.some((x) => x.id === 'followup:junk'), '推销和垃圾合成一条');
  ok('今天页：置顶回顾 → 钱 → 过期跟进 → 新咨询 → 待核验；卡片上有按钮；会员标出来；推销合成一条');

  console.log('联系回填（四.5）');
  let r = await recordContactResult('staff:test', '小李', mf.id, 'no_answer');
  assert.equal(r.nextDate, addDays(today, 1));
  r = await recordContactResult('staff:test', '小李', mf.id, 'scheduled', addDays(today, 7));
  assert.equal(r.status, 'meeting');
  r = await recordContactResult('staff:test', '小李', mf.id, 'reached');
  assert.equal(r.status, 'meeting', '已约谈的联系上了不往回退');
  const { rows: lc } = await pool.query<{ last_contact_result: string; last_contact_at: Date; owner: string }>(`SELECT last_contact_result, last_contact_at, owner FROM followups WHERE id = $1`, [mf.id]);
  assert.equal(lc[0].last_contact_result, 'reached');
  assert.ok(lc[0].last_contact_at);
  assert.equal(lc[0].owner, '小李');
  await assert.rejects(recordContactResult('staff:test', '小李', mf.id, 'bogus'));
  ok('没接 → 明天再提醒；已约时间 → 已约谈 + 日期；联系上了；记时间和人');

  console.log('邮件三按钮（四.2）');
  const t = await issueActionToken(cust.followupId);
  assert.equal(await checkActionToken(cust.followupId, t), true);
  assert.equal(await checkActionToken(cust.followupId, t + 'x'), false);
  assert.equal(await checkActionToken(pitch.followupId, t), false, '口令只对这一条');
  const ccard = (await loadCards({ ids: [cust.followupId] }))[0];
  const mail = buildFollowupEmail(ccard, t, 'draft', 'https://example.org');
  assert.match(mail.subject, /建议/);
  assert.ok(mail.text.split('\n')[0].includes('建议'), '第一行就是这是什么 + 建议怎么办');
  assert.ok(mail.text.includes('I would like to learn'), '正文放原话');
  for (const d of ['drop', 'claim', 'assist']) assert.ok(mail.html.includes(`/zh/staff/followups/${cust.followupId}?do=${d}&amp;t=`));
  ok('邮件标题 / 第一行 / 原话 / 三个按钮直达这一条');

  // 登录一个运营同事（HTTP）
  const opsEmail = `ysy-ops-${sfx}@example.com`;
  await pool.query(`INSERT INTO staff_roles (email, name, roles) VALUES ($1, $2, '{ops}')`, [opsEmail, `${P}助理`]);
  const code = await sendLoginCode('email', opsEmail);
  assert.ok(code.devCode, '需要 CRM_DEV_ECHO_CODES=1');
  const sess = await verifyLoginCode('email', opsEmail, code.devCode!);
  const cookie = `sarec_session=${sess.token}`;
  let h = await http(`/api/v1/staff/followups/${cust.followupId}/act`, '', { action: 'drop' });
  assert.equal(h.status, 401, '没登录不能操作');
  h = await http(`/api/v1/staff/followups/${cust.followupId}/act`, cookie, { action: 'claim', auto: true, token: 'wrong-token-123456789' });
  assert.equal(h.j.error?.code, 'bad_token', '口令不对不自动执行');
  h = await http(`/api/v1/staff/followups/${cust.followupId}/act`, cookie, { action: 'claim', auto: true, token: t });
  assert.equal(h.status, 200);
  assert.ok(!h.j.reused);
  const { rows: ow } = await pool.query<{ owner: string }>(`SELECT owner FROM followups WHERE id = $1`, [cust.followupId]);
  assert.equal(ow[0].owner, `${P}助理`);
  // J13-3：口令一次有效——同一个口令再打开，只回 reused、不再执行（处理记录不多一行、状态不变）
  const logN = async () => (await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM followup_log WHERE followup_id = $1`, [cust.followupId])).rows[0].n;
  const before = await logN();
  const stBefore = (await pool.query<{ status: string; owner: string }>(`SELECT status, owner FROM followups WHERE id = $1`, [cust.followupId])).rows[0];
  for (const d of ['claim', 'drop']) {
    h = await http(`/api/v1/staff/followups/${cust.followupId}/act`, cookie, { action: d, auto: true, token: t });
    assert.equal(h.status, 200);
    assert.equal(h.j.reused, true, '用过的口令不再执行');
  }
  assert.equal(await logN(), before, '处理记录没有多');
  assert.deepEqual((await pool.query(`SELECT status, owner FROM followups WHERE id = $1`, [cust.followupId])).rows[0], stBefore, '状态没变');
  assert.equal(await checkActionToken(cust.followupId, t), false);
  ok('J13-3：邮件按钮口令一次有效，第二次打开只看现状不执行');
  // 新一封邮件 = 新口令
  let t2 = await issueActionToken(cust.followupId);
  h = await http(`/api/v1/staff/followups/${cust.followupId}/act`, cookie, { action: 'assist', auto: true, token: t2 });
  assert.equal(h.status, 200, String(h.j.error?.message));
  assert.equal(await consumeActionToken(cust.followupId, t2), 'used');
  t2 = await issueActionToken(cust.followupId);
  h = await http(`/api/v1/staff/followups/${cust.followupId}/act`, cookie, { action: 'drop', auto: true, token: t2 });
  const { rows: st } = await pool.query<{ status: string }>(`SELECT status FROM followups WHERE id = $1`, [cust.followupId]);
  assert.equal(st[0].status, 'dropped');
  h = await http(`/api/v1/staff/followups/${cust.followupId}/act`, cookie, { action: 'drop' });
  assert.equal(h.status, 200, '重复点不出错');
  ok('三个按钮：要登录 + 口令对才自动执行（每个口令一次）；我来联系 / 转给助理 / 不跟进直接生效；重复点不出错');

  h = await http(`/api/v1/staff/followups/${mf.id}/result`, cookie, { result: 'no_answer' });
  assert.equal(h.status, 200);
  h = await http('/api/v1/staff/today', cookie);
  assert.equal(h.status, 200);
  assert.ok(Array.isArray(h.j.items));
  assert.ok(!(h.j.items as { kind: string }[]).some((x) => x.kind === 'payment_pending'), '运营看不到钱');
  h = await http(`/api/v1/staff/followups/${mf.id}/card`, cookie);
  assert.equal(h.status, 200);
  assert.equal((h.j.card as { isMember: boolean }).isMember, true);
  h = await http(`/api/v1/staff/recaps/${ev[0].id}/publish`, cookie, {});
  assert.equal(h.status, 200, String(h.j.error?.message));
  const { rows: rp } = await pool.query<{ status: string }>(`SELECT status FROM event_recaps WHERE event_id = $1`, [ev[0].id]);
  assert.equal(rp[0].status, 'published');
  h = await http(`/api/v1/staff/recaps/${ev[0].id}/publish`, cookie, {});
  assert.equal(h.j.message, '这场已经发布过了');
  ok('HTTP：今天页按角色、处理页、联系回填、活动回顾"直接发布"（重复点不重复发）');

  console.log('推销垃圾每日汇总（四.3）+ 总闸');
  const junkBefore = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM notify_log WHERE kind = '推销垃圾每日汇总'`);
  const dj = await runJunkDigest(new Date());
  assert.ok(dj.count >= 1);
  assert.equal(dj.status, 'blocked', '本机：收件人不是测试身份，只记录不发');
  const junkAfter = await pool.query<{ n: number; to_masked: string }>(`SELECT count(*)::int AS n, max(to_masked) AS to_masked FROM notify_log WHERE kind = '推销垃圾每日汇总'`);
  assert.equal(junkAfter.rows[0].n, junkBefore.rows[0].n + 1);
  assert.ok(junkAfter.rows[0].to_masked.includes('***'));
  const { rows: dg } = await pool.query<{ digested_at: Date | null }>(`SELECT digested_at FROM followups WHERE id = $1`, [pitch.followupId]);
  assert.ok(dg[0].digested_at);
  assert.equal((await runJunkDigest(new Date())).status, 'empty', '同一批不重复汇总');
  const { rows: bt } = await pool.query<{ id: string }>(`SELECT id FROM followup_batches ORDER BY created_at DESC LIMIT 1`);
  h = await http('/api/v1/staff/followups/junk', cookie, { batch: bt[0].id, token: 'nope-nope-nope-nope' });
  assert.equal(h.j.error?.code, 'bad_token');
  const d1 = await dropJunk('staff:test', [pitch.followupId]);
  assert.equal(d1.dropped, 1);
  ok('推销垃圾汇总一封（总闸记录、收件人打码）、不重复；口令不对不执行；一键全部不跟进');

  let sent = 0;
  const prevEnv = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = 'production';
  try {
    await pool.query(`DELETE FROM crm_settings WHERE key = 'notify_live'`);
    const m = { channel: 'email' as const, to: 'someone@example.com', kind: '验收优-测试', text: 'x' };
    assert.equal((await gateSend(m, async () => { sent++; })).status, 'held', '正式站总闸默认关：只记录');
    assert.equal((await gateSend(m, async () => { sent++; }, { existing: true })).status, 'sent', '改版前就在发的通知照发');
    await setSetting(pool, 'notify_live', true, 'test');
    assert.equal((await gateSend({ ...m, dedupeKey: `${P}:k` }, async () => { sent++; })).status, 'sent');
    assert.equal((await gateSend({ ...m, dedupeKey: `${P}:k` }, async () => { sent++; })).status, 'duplicate', '同一件事不重复');
    assert.equal(sent, 2);
  } finally {
    await pool.query(`DELETE FROM crm_settings WHERE key = 'notify_live'`);
    if (prevEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevEnv;
  }
  assert.equal((await gateSend({ channel: 'sms', to: '+16265550142', kind: '验收优-测试', text: 'x' }, async () => { sent++; })).status, 'sent', '测试站：555-01xx 测试号可以发');
  assert.equal((await gateSend({ channel: 'sms', to: '+16268889999', kind: '验收优-测试', text: 'x' }, async () => { sent++; })).status, 'blocked', '测试站：真号码不发');
  assert.equal(maskTarget('sms', '+16268889999'), '***9999');
  ok('总闸：正式站默认只记录、打开后才发、同一件事不重复；测试站只发测试身份');

  console.log('assist 没有助理时');
  // 本机库里可能已有其他测试留下的运营同事；这里只验证有助理时能转
  const q = await quickAction('staff:test', '东哥', mf.id, 'assist').catch((e: Error) => ({ message: e.message }));
  assert.ok(/已转给助理|还没有助理/.test(q.message));
  ok('转给助理：有助理就转，没有就说清楚去哪里加');

  console.log('AI 助手日报（四.10）');
  {
    const { runAgentDigest } = await import('@/lib/agent/digest');
    const keep = { k: process.env.RESEND_API_KEY, d: process.env.AGENT_DIGEST_EMAIL };
    process.env.RESEND_API_KEY = 'fake-not-used';
    process.env.AGENT_DIGEST_EMAIL = 'nobody@example.com';
    try {
      const day = new Date(Date.UTC(2001, 0, 2 + Math.floor(Math.random() * 3000), 20)); // 很早以前、一定没有对话的一天
      const d = await runAgentDigest(day);
      assert.equal(d.status, 'skipped_empty');
    } finally {
      if (keep.k === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = keep.k;
      if (keep.d === undefined) delete process.env.AGENT_DIGEST_EMAIL; else process.env.AGENT_DIGEST_EMAIL = keep.d;
    }
    ok('当天 0 对话 0 线索不发邮件');
  }

  console.log(`\n全部通过：${passed} 项`);
  // 清理本次数据（按 ID / 前缀）
  await pool.query(`DELETE FROM jobs_pros WHERE name LIKE $1`, [`${P}%`]);
  await pool.query(`DELETE FROM orders WHERE order_no = $1`, [orderNo]);
  await pool.query(`DELETE FROM followups WHERE name LIKE $1 OR dedupe_key LIKE $1`, [`${P}%`]);
  await pool.query(`DELETE FROM notify_log WHERE kind = '验收优-测试'`);
  await pool.end();
}

main().catch(async (e) => {
  console.error('✗ 失败：', e);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
