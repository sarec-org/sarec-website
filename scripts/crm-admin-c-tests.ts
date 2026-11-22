/**
 * 后台综合优化（子任务 C）集成测试（本机一次性库）：
 *   入会申请自动发链接 / 3 天未缴费进今天；手机通知分级、夜间攒到早上、同一件事不重复、每天超 10 条合并、每日汇总；
 *   重复档案自动合并与撤销；内部账号排除；专委会意向补填；活动自动已结束；到场必须有手机号；迁移前后客户 / 会员 / 报名 / 签到数一致。
 * 用法：DATABASE_URL=postgres://postgres@127.0.0.1:5561/sarec_c pnpm dlx tsx scripts/crm-admin-c-tests.ts
 * 不真发任何消息：发送换成假的（setTransportForTest），只记下“本该发出的”。
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { getPool } from '@/lib/db/client';
import { staffFor, type Staff } from '@/lib/crm/auth';
import { CrmError } from '@/lib/crm/events';
import { autoSendJoinLink, listJoinRequests, markJoinNudged, submitJoin } from '@/lib/crm/join';
import { setTransportForTest } from '@/lib/crm/notifySend';
import type { NotifyMessage } from '@/lib/crm/notifyGate';
import { DAILY_CAP, flushHeld, notifyStaff, recipients, runDigest } from '@/lib/crm/staffNotify';
import { autoMergeVerified, uncertainPairs, verifiedPhonePairs } from '@/lib/crm/autoMerge';
import { undoMerge } from '@/lib/crm/dupMerge';
import { setAccountKind } from '@/lib/crm/accountKind';
import { committeeInterestList, committees, setCommitteeInterest } from '@/lib/crm/staff12';
import { autoCompleteEvents } from '@/lib/crm/eventFlow';
import { C_PROVIDERS } from '@/lib/crm/today/providers/c';
import { todayContext } from '@/lib/crm/today/registry';
import { contactCounts, createEvent, listOrders, onsiteRegister, searchContacts } from '@/lib/crm/staff';
import { referralLeaderboard } from '@/lib/crm/growth';
import { recognized } from '@/lib/crm/checkin131';
import { laToday, laWallToIso } from '@/lib/laDate';
import { guardNotProduction } from './_guard';

guardNotProduction();
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
let passed = 0;
const ok = (n: string) => {
  passed++;
  console.log(`  ✓ ${n}`);
};
const sent: NotifyMessage[] = [];
setTransportForTest(async (m) => {
  sent.push(m);
});
const fakePhone = () => `+1626${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;
const at = (hhmm: string, dayOffset = 0) => new Date(laWallToIso(laToday(new Date(Date.now() + dayOffset * 86400_000)), hhmm));

async function counts() {
  const { rows } = await pool.query<{ contacts: number; members: number; regs: number; checkins: number }>(
    `SELECT (SELECT count(*)::int FROM contacts) AS contacts,
            (SELECT count(DISTINCT contact_id)::int FROM applications WHERE application_status IN ('approved','paid','second_payment_due')) AS members,
            (SELECT count(*)::int FROM registrations) AS regs,
            (SELECT count(*)::int FROM registrations WHERE arrival_status = 'checked_in') AS checkins`
  );
  return rows[0];
}

async function contact(name: string, phone: string | null, opts: { email?: string; verified?: boolean } = {}) {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO contacts (name, phone_e164, phone_verified_at, email) VALUES ($1, $2, CASE WHEN $3 THEN now() END, $4) RETURNING id`,
    [name, phone, !!opts.verified, opts.email ?? null]
  );
  return rows[0].id;
}

async function main() {
  // ── 0. 迁移前后数字一致（0040 再跑一遍：幂等、不改数据） ───────────────────────
  console.log('迁移 0040：重复执行不改客户 / 会员 / 报名 / 签到数');
  const before = await counts();
  await pool.query(readFileSync('db/migrations/0040_flow.sql', 'utf8'));
  await pool.query(readFileSync('db/migrations/0040_flow.sql', 'utf8'));
  assert.deepEqual(await counts(), before);
  ok('0040 跑两遍：客户数、会员数、报名数、签到数前后一致');

  // 只留这次测试的工作人员（测完恢复）
  const { rows: wasActive } = await pool.query<{ email: string }>(`SELECT email FROM staff_roles WHERE is_active`);
  await pool.query(`UPDATE staff_roles SET is_active = false`);
  await pool.query(`DELETE FROM crm_settings WHERE key IN ('notify_owner', 'notify_live')`);
  const ownerPhone = '+19495550101';
  const ownerEmail = `owner-${sfx}@example.com`;
  const ownerContact = await contact('东哥测试', null, { email: ownerEmail });
  await pool.query(`UPDATE contacts SET email_verified_at = now() WHERE id = $1`, [ownerContact]);
  await pool.query(`INSERT INTO staff_roles (email, name, roles, phone) VALUES ($1, '东哥测试', '{admin}', $2)`, [ownerEmail, ownerPhone]);
  const staff = (await staffFor(ownerContact)) as Staff;
  try {
    // ── 1. 入会申请自动发缴费链接 ───────────────────────────────────────
    console.log('入会申请：一提交就自动发网站缴费链接（短信 + 邮件），记在申请上');
    const appl = await contact('微信用户', null);
    const ph = '+19495550150';
    sent.length = 0;
    const r = await submitJoin(appl, { name: `验收优-申请${sfx}`, phone: ph, company: '测试公司' });
    await pool.query(`UPDATE contacts SET email = $2 WHERE id = $1`, [appl, `a-${sfx}@example.com`]);
    const [j] = await listJoinRequests(null, r.id);
    assert.equal(j.status, 'link_sent', '测试号码（555-01xx）在本机算测试身份：真发 → 已发缴费链接');
    assert.ok(j.auto_link_at && j.link_log.length >= 1);
    assert.equal(j.link_log[0].channel, 'sms');
    assert.equal(j.link_log[0].status, 'sent');
    assert.match(j.link_log[0].to, /\*\*\*0150$/, '收件人打码');
    assert.ok(sent.some((m) => m.channel === 'sms' && m.to === ph && /zh\/join/.test(m.text)), '短信里是网站入会链接');
    assert.ok(!sent.some((m) => /\$\d/.test(m.text)), '不出现金额');
    assert.ok(r.linkSent);
    ok('提交即发短信缴费链接；发了什么、什么时候、发给谁（打码）记在申请上');
    const again = await autoSendJoinLink(r.id);
    assert.equal(again.skipped, '已经发过');
    ok('同一份申请不重复自动发');

    // 非测试号码：本机 / 测试站不真发，只记录
    sent.length = 0;
    const appl2 = await contact('微信用户', null);
    const r2 = await submitJoin(appl2, { name: `验收优-真号${sfx}`, phone: fakePhone() });
    const [j2] = await listJoinRequests(null, r2.id);
    assert.equal(j2.status, 'new');
    assert.equal(j2.link_log[0].status, 'blocked');
    assert.ok(!sent.some((m) => m.kind === '入会缴费链接'), '非测试身份一条都不真发');
    ok('测试站 / 本机：非测试身份只记录（blocked），不真发');

    // 正式站 + 总闸关：held
    process.env.VERCEL_ENV = 'production';
    const appl3 = await contact('微信用户', null);
    const r3 = await submitJoin(appl3, { name: `验收优-正式${sfx}`, phone: '+19495550151' });
    delete process.env.VERCEL_ENV;
    const [j3] = await listJoinRequests(null, r3.id);
    assert.equal(j3.link_log[0].status, 'held');
    assert.equal(j3.status, 'new');
    ok('正式站总闸关着（默认）：只记录本该发什么（held），不真发');

    // 内部账号：不发
    const internal = await contact('微信用户', null);
    await setAccountKind('test', internal, 'internal');
    sent.length = 0;
    const r4 = await submitJoin(internal, { name: `验收优-内部${sfx}`, phone: '+19495550152' });
    const [j4] = await listJoinRequests(null, r4.id);
    assert.equal(j4.link_log.length, 0);
    assert.equal(sent.length, 0, '内部账号：不发链接、不通知工作人员');
    ok('内部账号的申请不自动发、不通知（东哥本人测试的那条按内部账号排除）');

    // 3 天未缴费进今天；跟过一次就不再出现；内部账号不进
    await pool.query(`UPDATE join_requests SET created_at = now() - interval '4 days' WHERE id = ANY($1::uuid[])`, [[r.id, r4.id]]);
    const ctx = todayContext(staff);
    const joinP = C_PROVIDERS.find((p) => p.kind === 'join_unpaid')!;
    let items = await joinP.list(ctx);
    assert.ok(items.some((i) => i.id === `join_unpaid:${r.id}`));
    assert.ok(!items.some((i) => i.id === `join_unpaid:${r4.id}`), '内部账号不进待办');
    const it = items.find((i) => i.id === `join_unpaid:${r.id}`)!;
    assert.ok(it.priority < 200 && it.actions.some((a) => a.type === 'tel'));
    await markJoinNudged(staff, r.id);
    items = await joinP.list(ctx);
    assert.ok(!items.some((i) => i.id === `join_unpaid:${r.id}`));
    ok('3 天没缴费进「今天」（钱的那一档，带打电话按钮）；点“我跟进了”后消失');

    // ── 2. 手机通知 ─────────────────────────────────────────────────
    console.log('手机通知：分级、夜间攒、去重、超 10 条合并、每日汇总');
    let rec = await recipients();
    assert.equal(rec.length, 1);
    assert.equal(rec[0].channel, 'sms', '东哥默认短信');
    assert.ok(rec[0].isOwner && rec[0].categories.includes('inquiry'));
    const noon = at('12:00');
    sent.length = 0;
    let n = await notifyStaff({ category: 'join_request', key: `t1:${sfx}`, title: '有一条新入会申请', href: '/zh/staff/join-requests?id=x' }, noon);
    assert.equal(n.sent, 1);
    assert.match(sent[0].text, /有一条新入会申请/);
    assert.match(sent[0].text, /\/zh\/staff\/join-requests\?id=x/, '链接直达那一条');
    n = await notifyStaff({ category: 'join_request', key: `t1:${sfx}`, title: '有一条新入会申请' }, noon);
    assert.equal(n.sent, 0, '同一件事不重复');
    ok('白天立即通知（短信、只写“有一条新入会申请”、链接直达处理页）；同一件事不重复');

    sent.length = 0;
    const night = at('23:30');
    n = await notifyStaff({ category: 'inquiry', key: `t2:${sfx}`, title: '有一条新客户咨询' }, night);
    assert.equal(n.held, 1);
    n = await notifyStaff({ category: 'zelle_pending', key: `t3:${sfx}`, title: '有一笔 Zelle 付款待核对' }, night);
    assert.equal(sent.length, 0, '晚上 9 点后不发');
    n = await notifyStaff({ category: 'system_fault', key: `t4:${sfx}`, title: '系统故障：测试' }, night);
    assert.equal(n.sent, 1, '系统故障夜里照发');
    sent.length = 0;
    const early = at('07:30', 1);
    assert.equal((await flushHeld(early)).items, 0, '早 8 点前还不发');
    const morning = at('08:05', 1);
    const f = await flushHeld(morning);
    assert.equal(f.items, 2);
    assert.equal(sent.length, 1, '夜里攒的合成一条');
    assert.match(sent[0].text, /夜里来了 2 件事/);
    assert.equal((await flushHeld(morning)).items, 0);
    ok('晚 9 点到早 8 点攒着，早上合成一条发；系统故障除外');

    sent.length = 0;
    const day2 = at('13:00', 2);
    for (let i = 0; i < DAILY_CAP + 3; i++) await notifyStaff({ category: 'inquiry', key: `cap${i}:${sfx}`, title: '有一条新客户咨询' }, day2);
    assert.equal(sent.length, DAILY_CAP + 1, '10 条之后只再发一条“后面的合并”');
    assert.match(sent[sent.length - 1].text, /超过 10 条/);
    ok('每天立即通知超过 10 条：后面的并进一条');

    sent.length = 0;
    const before830 = await runDigest(at('08:10', 3), async () => [{ title: '一件事', priority: 100 }]);
    assert.equal(before830.skipped, 'not_time');
    const empty = await runDigest(at('08:31', 3), async () => []);
    assert.equal(empty.sent, 0, '没有待办不发');
    const d = await runDigest(at('08:35', 4), async () => [{ title: '待核款 1 笔', priority: 100 }, { title: '跟进过期', priority: 200 }]);
    assert.equal(d.sent, 1);
    assert.match(sent[0].text, /今天有 2 件事，最要紧的是：待核款 1 笔/);
    assert.match(sent[0].text, /\/zh\/staff$/);
    assert.equal((await runDigest(at('09:00', 4), async () => [{ title: 'x', priority: 1 }])).sent, 0, '一天只发一条');
    ok('每日汇总：8:30 以后一条（几件事 + 最要紧的一件 + 今天页链接）；没有待办不发；一天一条');

    // 新同事到岗：跟进类默认发给他，钱和异常仍发东哥
    const colleague = `ops-${sfx}@example.com`;
    await pool.query(`INSERT INTO staff_roles (email, name, roles, phone) VALUES ($1, '新同事', '{ops}', '+19495550102')`, [colleague]);
    rec = await recipients();
    const o = rec.find((x) => x.isOwner)!;
    const c = rec.find((x) => x.key === colleague)!;
    assert.ok(c.categories.includes('inquiry') && c.categories.includes('join_request'));
    assert.ok(!o.categories.includes('inquiry') && o.categories.includes('zelle_pending') && o.categories.includes('system_fault'));
    sent.length = 0;
    await notifyStaff({ category: 'paid_join', key: `pj:${sfx}`, title: '有一位新会员缴费入会了' }, at('12:00', 5));
    assert.deepEqual(sent.map((m) => m.to), [ownerPhone]);
    ok('新同事到岗：跟进类默认发给他；钱和异常发东哥');
    await pool.query(`UPDATE staff_roles SET is_active = false WHERE email = $1`, [colleague]);

    // ── 3. 重复档案自动合并与撤销 ─────────────────────────────────────
    console.log('重复档案：手机号相同且已验证 → 自动合并、可撤销；同名拿不准 → 进今天');
    const vp = fakePhone();
    const a1 = await contact(`验收优-重复${sfx}`, vp, { verified: true });
    const a2 = await contact(`验收优-重复${sfx}`, null);
    await pool.query(`INSERT INTO contact_methods (contact_id, kind, value, status, source, confirmed_at) VALUES ($1, 'phone', $2, 'confirmed', 'test', now())`, [a2, vp]);
    const ev = await createEvent(staff, { title: `验收优-活动${sfx}`, startsAt: new Date(Date.now() + 86400e3).toISOString() });
    await pool.query(`INSERT INTO registrations (event_id, contact_id, status, source) VALUES ($1, $2, 'registered', 'staff')`, [ev.id, a2]);
    const c0 = await counts();
    assert.ok((await verifiedPhonePairs()).some((p) => [p.keptId, p.mergedId].sort().join() === [a1, a2].sort().join()));
    const dry = await autoMergeVerified({ apply: false });
    assert.ok(dry.items.length >= 1);
    assert.equal((await pool.query(`SELECT merged_into FROM contacts WHERE id = $1`, [a2])).rows[0].merged_into, null, '预演不改数据');
    const m = await autoMergeVerified({ apply: true });
    const mine = m.items.find((x) => [x.keptId, x.mergedId].includes(a1))!;
    assert.ok(mine.mergeId);
    assert.equal((await pool.query(`SELECT auto FROM contact_merges WHERE id = $1`, [mine.mergeId])).rows[0].auto, true);
    const c1 = await counts();
    assert.equal(c1.regs, c0.regs);
    assert.equal(c1.checkins, c0.checkins);
    assert.equal(c1.contacts, c0.contacts, '档案只标 merged_into，不删');
    await undoMerge(staff, mine.mergeId!);
    assert.equal((await pool.query(`SELECT merged_into FROM contacts WHERE id = $1`, [mine.mergedId])).rows[0].merged_into, null);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM registrations WHERE contact_id = $1`, [a2])).rows[0].n, 1, '撤销后报名搬回');
    ok('手机号相同且两边已验证：自动合并留记录（自动），报名 / 签到数不变；撤销后原样搬回');
    await pool.query(`INSERT INTO contact_not_duplicates (a_id, b_id, marked_by) VALUES (LEAST($1::uuid, $2::uuid), GREATEST($1::uuid, $2::uuid), 'test') ON CONFLICT DO NOTHING`, [a1, a2]);
    const s1 = await contact(`验收优-同名${sfx}`, fakePhone());
    const s2 = await contact(`验收优-同名${sfx}`, fakePhone());
    await pool.query(`UPDATE contacts SET account_kind = NULL WHERE id = ANY($1::uuid[])`, [[s1, s2]]);
    const un = await uncertainPairs(60);
    assert.ok(un.some((p) => [p.a.id, p.b.id].sort().join() === [s1, s2].sort().join()), '同名进“拿不准”');
    ok('只有同名这类拿不准的进「今天」让人确认');

    // ── 4. 内部账号 / 审核演示排除 ────────────────────────────────────
    console.log('内部账号：不进待办、统计、推荐排行；核款里审核演示订单单独放');
    const cc0 = await contactCounts();
    const ia = await contact(`东哥小号${sfx}`, fakePhone());
    let cc1 = await contactCounts();
    assert.equal(cc1.customers, cc0.customers + 1);
    await setAccountKind('test', ia, 'internal');
    cc1 = await contactCounts();
    assert.equal(cc1.customers, cc0.customers, '内部账号不算客户数');
    assert.equal(cc1.internal, cc0.internal + 1);
    const friend = await contact(`验收优-朋友${sfx}`, fakePhone());
    await pool.query(`UPDATE contacts SET referred_by = $2 WHERE id = $1`, [friend, ia]);
    assert.ok(!(await referralLeaderboard()).some((x: { id: string }) => x.id === ia), '不进推荐排行');
    const { rows: ord } = await pool.query<{ order_no: string }>(
      `INSERT INTO orders (order_no, contact_id, purpose, amount_cents, status) VALUES ($1, $2, 'other', 100, 'payment_submitted') RETURNING order_no`,
      [`T-${sfx}`, ia]
    );
    assert.ok(!(await listOrders({ status: 'open' })).some((x) => x.order_no === ord[0].order_no), '不在待处理');
    assert.ok((await listOrders({ status: 'demo' })).some((x) => x.order_no === ord[0].order_no), '在“审核演示 / 测试订单”里');
    ok('内部账号：不算客户、不进推荐排行；订单从“待处理”拿走，单独放');

    // ── 5. 客户列表：未登记的微信用户分出去 ──────────────────────────────
    const wx = await contact('微信用户', null);
    const list = await searchContacts({}, 5000);
    assert.ok(!list.some((x) => x.id === wx), '默认客户列表不含只打开过的微信用户');
    assert.ok((await searchContacts({ view: 'opened' }, 5000)).some((x) => x.id === wx));
    const t = list.map((x) => new Date(x.last_active_at).getTime());
    assert.ok(t.every((v, i) => i === 0 || t[i - 1] >= v), '按最近有动作排序');
    ok('没姓名手机号的“微信用户”单列“只打开过、未登记”；默认按最近有动作排序');

    // ── 6. 专委会意向 ────────────────────────────────────────────────
    console.log('专委会意向：必须有姓名和手机号');
    const key = (await committees(null))[0]?.key;
    assert.ok(key);
    const anon = await contact('微信用户', null);
    await assert.rejects(setCommitteeInterest(anon, key, true), (e: unknown) => e instanceof CrmError && e.code === 'need_name_phone');
    await setCommitteeInterest(anon, key, true, { legacy: true });
    assert.equal((await committees(anon)).find((x) => x.key === key)?.needsFill, true, '旧版小程序：记下但标待补填');
    await setCommitteeInterest(anon, key, true, { name: `验收优-意向${sfx}`, phone: '9495550153' });
    const row = (await committeeInterestList()).find((x) => x.contact_id === anon)!;
    assert.equal(row.name, `验收优-意向${sfx}`);
    assert.equal(row.phone, '+19495550153');
    assert.equal(row.needs_fill, false);
    ok('没姓名手机号返回 need_name_phone；旧版标待补填；补填后后台名单显示真实姓名和手机');

    // ── 7. 活动自动“已结束” ─────────────────────────────────────────
    const old = await createEvent(staff, { title: `验收优-旧活动${sfx}`, startsAt: new Date(Date.now() - 10 * 3600e3).toISOString() });
    await autoCompleteEvents();
    assert.equal((await pool.query(`SELECT event_status FROM events WHERE id = $1`, [old.id])).rows[0].event_status, 'completed');
    ok('活动结束后自动变“已结束”');

    // ── 8. 到场必须有手机号 ─────────────────────────────────────────
    const noPhone = await contact(`验收优-无手机${sfx}`, null, { email: `np-${sfx}@example.com` });
    await pool.query(`INSERT INTO registrations (event_id, contact_id, status, source) VALUES ($1, $2, 'registered', 'staff')`, [ev.id, noPhone]);
    assert.equal(await recognized(pool, noPhone, ev.id), false, '有姓名、邮箱、也报了名，但没手机号：要先补手机号');
    await assert.rejects(onsiteRegister(staff, ev.id, { name: `验收优-现场${sfx}`, email: `os-${sfx}@example.com` }), (e: unknown) => e instanceof CrmError && e.code === 'need_phone');
    ok('扫码签到 / 现场登记：没有手机号的不能直接记到场');
  } finally {
    setTransportForTest(null);
    await pool.query(`UPDATE staff_roles SET is_active = false WHERE email = $1`, [ownerEmail]);
    if (wasActive.length) await pool.query(`UPDATE staff_roles SET is_active = true WHERE email = ANY($1::text[])`, [wasActive.map((x) => x.email)]);
  }
  console.log(`\n全部通过：${passed} 项`);
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
