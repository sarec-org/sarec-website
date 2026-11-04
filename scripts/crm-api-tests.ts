/**
 * 工作人员后台服务 + 统一订单的集成测试（本地库）。
 * 用法：DATABASE_URL=postgres://postgres@127.0.0.1:5544/sarec_crm_dev pnpm dlx tsx scripts/crm-api-tests.ts
 * 自建测试数据（带随机后缀），不清空其他数据；需已执行 0001–0004 与 seed。
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { getPool, withTransaction } from '@/lib/db/client';
import { sendLoginCode, staffFor, verifyLoginCode, type Staff } from '@/lib/crm/auth';
import { listEvents } from '@/lib/crm/flow';
import { CrmError } from '@/lib/crm/events';
import { applyMembership, memberStatus, pendingMembershipOrder } from '@/lib/crm/membership';
import { getSetting, redeemPoints, setSetting, submitOrderNote, zelleForPayPage } from '@/lib/crm/orders';
import { pointsBalance } from '@/lib/crm/profile';
import {
  adjustPoints,
  contactDetail,
  createEvent,
  listOrders,
  onsiteRegister,
  rejectOrder,
  reversePoints,
  reviewScreenAd,
  searchPeople,
  setDisplay,
  staffCheckIn,
  updateEvent,
  verifyOrder
} from '@/lib/crm/staff';
import { guardNotProduction } from './_guard';

guardNotProduction();
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
let passed = 0;
const ok = (n: string) => {
  passed++;
  console.log(`  ✓ ${n}`);
};

async function main() {
  // 工作人员：邮箱已验证 + staff_roles 授权
  const staffEmail = `staff-${sfx}@example.com`;
  await pool.query(`INSERT INTO contacts (name, email, email_verified_at) VALUES ('测试工作人员', $1, now())`, [staffEmail]);
  await pool.query(`INSERT INTO staff_roles (email, name, roles) VALUES ($1, '小李', '{admin}')`, [staffEmail]);
  const { rows: sc } = await pool.query<{ id: string }>(`SELECT id FROM contacts WHERE email = $1`, [staffEmail]);
  const staff = (await staffFor(sc[0].id)) as Staff;
  assert.ok(staff && staff.roles.includes('admin'));
  ok('工作人员身份由 staff_roles + 已验证邮箱决定');

  console.log('后台开关“Zelle 付款”：默认关闭，关闭时不收 Zelle 付款说明');
  const zelleBefore = await getSetting<boolean | null>(pool, 'zelle_enabled', null);
  await pool.query(`DELETE FROM crm_settings WHERE key = 'zelle_enabled'`);
  assert.equal((await zelleForPayPage(pool)).enabled, false, '未设置时默认关闭');
  const zo = await applyMembership({ applicationType: 'membership', tierSlug: 'member', contactName: `开关${sfx}`, email: `zoff-${sfx}@example.com`, agree: true }, { ip: null, userAgent: 'test' }, null);
  const { rows: zc } = await pool.query<{ contact_id: string }>(`SELECT contact_id FROM orders WHERE order_no = $1`, [zo.orderNo]);
  await assert.rejects(submitOrderNote(zo.orderNo, zc[0].contact_id, 'Zelle 已付'), (e: unknown) => e instanceof CrmError && e.code === 'zelle_off');
  await setSetting(pool, 'zelle_enabled', true, 'test');
  const zp = await zelleForPayPage(pool);
  assert.equal(zp.enabled, true);
  assert.equal((await submitOrderNote(zo.orderNo, zc[0].contact_id, 'Zelle 已付')).status, 'payment_submitted');
  ok('Zelle 开关：默认关闭、关闭时拒收付款说明；打开后正常');

  console.log('收费活动：现场登记 → 待核款 → 核款 → 自动签到');
  const starts = new Date(Date.now() + 3600e3).toISOString();
  const fee = await createEvent(staff, { title: `测试收费课 ${sfx}`, startsAt: starts, feeCents: 5000, capacity: 50, topicTags: ['ai', 'bogus'] });
  const free = await createEvent(staff, { title: `测试讲座 ${sfx}`, startsAt: starts, feeCents: 0 });
  await updateEvent(staff, free.id, { locationName: '商会会议室' });
  const phone = `+1626${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;
  const on = await onsiteRegister(staff, fee.id, { name: `现场新客${sfx}`, phone, roleSub: 'investor' });
  assert.equal(on.result.kind, 'pending_payment', '收费活动未付款不显示签到成功');
  const again = await staffCheckIn(staff, fee.id, on.contactId);
  assert.equal(again.kind, 'pending_payment', '工作人员代签到同样走入场判断');
  ok('现场登记与代签到：收费活动未核款 → 待核款，不显示签到成功');

  const orderNo = (again as { orderNo: string }).orderNo;
  const open = await listOrders({ q: orderNo });
  assert.equal(open[0]?.order_no, orderNo);
  const v1 = await verifyOrder(staff, orderNo, 'CHASE-001');
  const v2 = await verifyOrder(staff, orderNo, 'CHASE-001');
  assert.equal(v1.changed, true);
  assert.equal(v2.changed, false, '重复点击不重复处理');
  const after = await staffCheckIn(staff, fee.id, on.contactId);
  assert.equal(after.kind, 'already', '核款后到场待处理的人已自动签到');
  const { rows: ck } = await pool.query(`SELECT count(*)::int n FROM points_ledger WHERE contact_id = $1 AND category = 'checkin'`, [on.contactId]);
  assert.equal(ck[0].n, 1, '签到积分只发一次');
  ok('核款确认两次只生效一次；核款后自动完成签到、签到积分一次');

  console.log('免费活动：查人 → 代签到 → 重复代签到');
  const found = await searchPeople(phone.slice(-4), free.id);
  assert.ok(found.some((p) => p.id === on.contactId));
  const f1 = await staffCheckIn(staff, free.id, on.contactId);
  const f2 = await staffCheckIn(staff, free.id, on.contactId);
  assert.equal(f1.kind, 'checked_in');
  assert.equal(f2.kind, 'already');
  ok('按手机号后四位查到人；免费活动代签到（现场临时报名 + 签到）；重复不重复');

  console.log('核实未到账：退回抵扣积分');
  await adjustPoints(staff, on.contactId, 100, '测试：活动奖励');
  const before = await pointsBalance(pool, on.contactId);
  const no2 = `T${sfx}-R`.toUpperCase();
  await withTransaction(async (db) => {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO orders (order_no, contact_id, purpose, description, amount_cents, gross_cents, points_redeemed) VALUES ($1, $2, 'other', '测试抵扣', 1000, 1500, 50) RETURNING id`,
      [no2, on.contactId]
    );
    await redeemPoints(db, on.contactId, rows[0].id, 50);
  });
  assert.equal(await pointsBalance(pool, on.contactId), before - 50);
  await assert.rejects(rejectOrder(staff, no2, '  '), CrmError, '未到账必须填原因');
  const rj = await rejectOrder(staff, no2, '核实未到账');
  assert.equal(rj.changed, true);
  assert.equal(await pointsBalance(pool, on.contactId), before, '抵扣积分全额退回');
  assert.equal((await rejectOrder(staff, no2, '核实未到账')).changed, false);
  ok('标记未到账：订单取消、抵扣积分冲回、重复操作不重复处理');

  console.log('会费：Zelle 核对到账后才生效；核实未到账订单取消、积分冲回');
  const email = `member-${sfx}@example.com`;
  const app = await applyMembership(
    { applicationType: 'membership', tierSlug: 'member', contactName: `会员${sfx}`, email, phone: '6265550199', agree: true },
    { ip: null, userAgent: 'test' },
    null
  );
  const { rows: oc } = await pool.query<{ contact_id: string }>(`SELECT contact_id FROM orders WHERE order_no = $1`, [app.orderNo]);
  const memberId = oc[0].contact_id;
  assert.equal((await memberStatus(pool, memberId)).isMember, false, '付款前不是会员');
  await submitOrderNote(app.orderNo, memberId, `Zelle 已付，备注 ${app.orderNo}`);
  assert.equal((await memberStatus(pool, memberId)).isMember, false, '提交 Zelle 付款说明后还不是正式会员');
  assert.equal((await pendingMembershipOrder(pool, memberId))?.orderNo, app.orderNo, '“我的”显示待确认到账');
  const pending = await listOrders({});
  assert.equal(pending[0].status, 'payment_submitted', '待核款排在最前');
  const { rows: appRow } = await pool.query<{ id: string }>(`SELECT related_id AS id FROM orders WHERE order_no = $1`, [app.orderNo]);
  await setDisplay(staff, appRow[0].id, 'approved', '资料齐全');
  assert.equal((await memberStatus(pool, memberId)).isMember, false, '官网展示审核不影响会员身份（也不会让人提前生效）');
  assert.equal((await verifyOrder(staff, app.orderNo, 'ZELLE-OK')).changed, true);
  const ms = await memberStatus(pool, memberId);
  assert.equal(ms.isMember, true, '确认到账后立即生效');
  assert.ok(ms.endDate);
  assert.equal(await pendingMembershipOrder(pool, memberId), null);
  assert.equal((await verifyOrder(staff, app.orderNo, 'ZELLE-OK')).changed, false, '重复确认不重复处理');
  ok('会费 Zelle：提交后待确认到账、不是会员；确认到账即正式会员；展示审核不影响身份');

  console.log('会费续费：Zelle 核实未到账 → 订单取消、积分抵扣冲回、会籍不变');
  await adjustPoints(staff, memberId, 2000, '测试：续费抵扣用积分');
  const balBefore = await pointsBalance(pool, memberId);
  const renew = await applyMembership(
    { applicationType: 'membership', tierSlug: 'member', contactName: `会员${sfx}`, email, agree: true, usePoints: true },
    { ip: null, userAgent: 'test' },
    memberId
  );
  assert.equal(renew.amountCents, 10000, '续费 $200 最多抵一半');
  assert.equal(renew.pointsRedeemed, 1000);
  assert.equal(await pointsBalance(pool, memberId), balBefore - 1000);
  await submitOrderNote(renew.orderNo, memberId, 'Zelle 已付');
  const endBefore = (await memberStatus(pool, memberId)).endDate;
  assert.equal((await rejectOrder(staff, renew.orderNo, '核实未到账')).changed, true);
  assert.equal(await pointsBalance(pool, memberId), balBefore, '抵扣积分冲回');
  const { rows: ro } = await pool.query<{ status: string }>(`SELECT status FROM orders WHERE order_no = $1`, [renew.orderNo]);
  assert.equal(ro[0].status, 'cancelled');
  assert.equal((await memberStatus(pool, memberId)).endDate, endBefore, '未到账的续费不延长有效期');
  ok('Zelle 续费核实未到账：订单取消、积分冲回、有效期不变');

  console.log('不公开活动：不出现在列表，凭链接可报名签到');
  const hidden = await createEvent(staff, { title: `不公开讲课 ${sfx}`, startsAt: starts, feeCents: 0, listed: false });
  assert.ok(!(await listEvents()).some((e) => e.slug === hidden.slug), '不公开活动不在列表里');
  const hc = await staffCheckIn(staff, hidden.id, on.contactId);
  assert.equal(hc.kind, 'checked_in', '凭链接/现场仍可报名签到');
  await updateEvent(staff, hidden.id, { listed: true });
  assert.ok((await listEvents()).some((e) => e.slug === hidden.slug), '改为公开后出现在列表');
  ok('不公开活动：列表不显示、仍可签到；改公开后显示');

  console.log('小程序审核账号：固定验证码、不发邮件、永远不是工作人员');
  const reviewer = `review-${sfx}@example.com`;
  process.env.CRM_REVIEW_EMAIL = reviewer;
  process.env.CRM_REVIEW_CODE = '135790';
  await sendLoginCode('email', reviewer);
  await assert.rejects(verifyLoginCode('email', reviewer, '000000'), CrmError);
  const rvLogin = await verifyLoginCode('email', reviewer, '135790', { name: '审核员' });
  await pool.query(`INSERT INTO staff_roles (email, name, roles) VALUES ($1, '审核员', '{admin}')`, [reviewer]);
  assert.equal(await staffFor(rvLogin.contactId), null, '即使误加了后台角色，审核账号也进不了后台');
  await assert.rejects(sendLoginCode('email', `other-${sfx}@example.com`), CrmError, '其他邮箱不受影响（本地无邮件服务时照常报错）');
  delete process.env.CRM_REVIEW_EMAIL;
  delete process.env.CRM_REVIEW_CODE;
  ok('审核账号：固定验证码可登录、错码拒绝；进不了后台；不影响其他邮箱');

  console.log('积分调整必须填原因；可撤销');
  await assert.rejects(adjustPoints(staff, on.contactId, 10, ''), (e: unknown) => e instanceof CrmError && /原因/.test(e.message));
  const adj = await adjustPoints(staff, on.contactId, 30, '补发：现场志愿者');
  const r1 = await reversePoints(staff, adj.id, '误操作');
  const r2 = await reversePoints(staff, adj.id, '误操作');
  assert.equal(r1.changed, true);
  assert.equal(r2.changed, false);
  ok('不填原因不能调整；撤销只生效一次');

  console.log('电子屏：非会员按标准月费生成订单');
  const { rows: ad } = await pool.query<{ id: string }>(
    `INSERT INTO screen_ads (contact_id, org_name, intro, months) VALUES ($1, '测试单位', '做 ADU 设计', 2) RETURNING id`,
    [on.contactId]
  );
  const rv = await reviewScreenAd(staff, ad[0].id, { action: 'approve', startMonth: '2026-12' });
  assert.equal(rv.amountCents, 10000);
  assert.ok(rv.orderNo);
  await assert.rejects(reviewScreenAd(staff, ad[0].id, { action: 'approve' }), CrmError, '不能重复审核');
  ok('电子屏审核：注册用户 $50 × 2 个月生成订单；不能重复审核');

  console.log('客户时间线');
  const d = await contactDetail(on.contactId);
  const kinds = new Set(d.timeline.map((t) => t.kind));
  for (const k of ['registration', 'checkin', 'arrival', 'order', 'paid', 'points', 'answer', 'audit']) {
    assert.ok(kinds.has(k) || (k === 'arrival' && kinds.has('checkin')), `时间线缺少 ${k}`);
  }
  assert.ok(d.answers.some((a) => a.item_code === 'Q03' && a.source === 'self_select'));
  ok('时间线含报名、签到、订单、到账、积分、资料、操作记录；答案带来源');

  if (zelleBefore === null) await pool.query(`DELETE FROM crm_settings WHERE key = 'zelle_enabled'`);
  else await setSetting(pool, 'zelle_enabled', zelleBefore, 'test');
  console.log(`\n全部通过：${passed} 组后台测试`);
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
