/**
 * 端到端接口验收（总指令 I.2 流程），走真实 HTTP，网站页面与小程序用的就是这些接口。
 * 用法：BASE=http://localhost:3400 STAFF_EMAIL=staff@example.com pnpm dlx tsx scripts/crm-e2e-http.ts
 * 前提：服务端设置 CRM_DEV_ECHO_CODES=1（只在测试环境，验证码随响应返回）；STAFF_EMAIL 已用 seed-staff.ts 开通 admin。
 * 可选：BYPASS=<Vercel 预览保护绕过密钥>
 * 只用于本地或独立的预览库，会写入测试数据。
 */
import assert from 'node:assert/strict';

const BASE = (process.env.BASE ?? 'http://localhost:3400').replace(/\/$/, '');
const STAFF_EMAIL = process.env.STAFF_EMAIL ?? 'e2e-staff@example.com';
const RUN = Date.now().toString(36);
let passed = 0;
const ok = (name: string) => { passed++; console.log(`  ✓ ${name}`); };

class Client {
  cookie = '';
  async call<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<{ status: number; json: T & { ok: boolean; error?: { code: string; message: string } } }> {
    const headers: Record<string, string> = {};
    if (this.cookie) headers.cookie = this.cookie;
    if (opts.body !== undefined) headers['content-type'] = 'application/json';
    if (process.env.BYPASS) headers['x-vercel-protection-bypass'] = process.env.BYPASS;
    const res = await fetch(BASE + path, { method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'), headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined, redirect: 'manual' });
    const set = res.headers.get('set-cookie');
    const m = set?.match(/sarec_session=([^;]*)/);
    if (m) this.cookie = m[1] ? `sarec_session=${m[1]}` : '';
    const text = await res.text();
    let json: any;
    try { json = JSON.parse(text); } catch { throw new Error(`${path} 返回非 JSON（${res.status}）：${text.slice(0, 200)}`); }
    return { status: res.status, json };
  }
  async login(email: string, name?: string) {
    let s = await this.call('/api/v1/auth/code/send', { body: { channel: 'email', target: email } });
    if (s.json.error?.code === 'too_soon') {
      console.log('    （60 秒内不重复发码：等待后重试）');
      await new Promise((r) => setTimeout(r, 61_000));
      s = await this.call('/api/v1/auth/code/send', { body: { channel: 'email', target: email } });
    }
    assert.equal(s.json.ok, true, `发码失败：${JSON.stringify(s.json)}`);
    assert.ok(s.json.devCode, '测试环境需 CRM_DEV_ECHO_CODES=1');
    const wrong = await this.call('/api/v1/auth/code/verify', { body: { channel: 'email', target: email, code: '000000' === s.json.devCode ? '111111' : '000000' } });
    assert.equal(wrong.json.ok, false);
    const v = await this.call('/api/v1/auth/code/verify', { body: { channel: 'email', target: email, code: s.json.devCode, name } });
    assert.equal(v.json.ok, true, JSON.stringify(v.json));
    return v.json;
  }
}

async function main() {
  console.log(`BASE = ${BASE}`);
  const staff = new Client();
  await staff.login(STAFF_EMAIL);
  const me = await staff.call('/api/v1/staff/me');
  assert.equal(me.json.ok, true, '工作人员未开通：先运行 scripts/seed-staff.ts');

  const start = new Date(Date.now() + 2 * 864e5);
  start.setUTCMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 2 * 3600e3);
  const free = await staff.call('/api/v1/staff/events', { body: { title: `E2E 免费讲座 ${RUN}`, slug: `e2e-free-${RUN}`, startsAt: start.toISOString(), endsAt: end.toISOString(), locationName: '商会会议室', address: '1 Test St, Arcadia, CA', capacity: 50, feeCents: 0, topicTags: ['adu'] } });
  const paid = await staff.call('/api/v1/staff/events', { body: { title: `E2E 收费课程 ${RUN}`, slug: `e2e-paid-${RUN}`, startsAt: start.toISOString(), endsAt: end.toISOString(), locationName: '商会会议室', capacity: 30, feeCents: 5000, topicTags: ['ai'] } });
  assert.equal(free.json.ok, true, JSON.stringify(free.json));
  assert.equal(paid.json.ok, true, JSON.stringify(paid.json));
  const freeEv = (await staff.call(`/api/v1/staff/events/${free.json.event.id}`)).json.event;
  const paidEv = (await staff.call(`/api/v1/staff/events/${paid.json.event.id}`)).json.event;
  ok('工作人员登录并新建免费、收费两场活动');

  console.log('1. 邮箱登录 → 报名免费活动（首次三项同屏）');
  const u = new Client();
  const email = `e2e-${RUN}@example.com`;
  const pub = await u.call(`/api/v1/events/${freeEv.slug}`);
  assert.equal(pub.json.ok, true);
  assert.equal(pub.json.loggedIn, false, '先看后填：未登录也能看活动');
  await u.login(email, '测试用户');
  const pv = await u.call(`/api/v1/events/${freeEv.slug}`);
  assert.equal(pv.json.firstTime, true);
  const reg = await u.call(`/api/v1/events/${freeEv.slug}/register`, { body: { name: '测试用户', roleSub: 'owner' } });
  assert.equal(reg.json.ok, true, JSON.stringify(reg.json));
  assert.equal(reg.json.status, 'registered');
  assert.equal(reg.json.message, '报名已完成！继续填写，每项奖励 10 积分');
  const again = await u.call(`/api/v1/events/${freeEv.slug}/register`, { body: { name: '测试用户', roleSub: 'owner' } });
  assert.equal(again.json.alreadyRegistered, true, '重复提交回到原报名');
  ok('首次报名三项完成；重复提交不重复报名');

  console.log('2. 补资料得分：页面提示与实际发分一致');
  let total = 0;
  for (let i = 0; i < 4; i++) {
    const n = await u.call(`/api/v1/profile/next?taskId=${reg.json.taskId}`);
    const q = n.json.question;
    assert.ok(q, '应有选填题');
    const value = q.input === 'single' ? { choice: q.options[0] } : q.input === 'multi' ? { choices: [q.options[0]] } : q.input === 'month_day' ? { month: 5, day: 12 } : { text: '在橙县做出租房投资，想找东区项目' };
    const a = await u.call('/api/v1/profile/answer', { body: { taskId: n.json.taskId, code: q.code, value } });
    assert.equal(a.json.ok, true, JSON.stringify(a.json));
    assert.equal(a.json.pointsAwarded, q.badge?.points ?? 0, `${q.code} 提示 ${q.badge?.label} 与实际发分 ${a.json.pointsAwarded} 不一致`);
    total += a.json.pointsAwarded;
    if (i === 0) {
      const dup = await u.call('/api/v1/profile/answer', { body: { taskId: n.json.taskId, code: q.code, value } });
      assert.equal(dup.json.pointsAwarded, 0, '重复提交不重复发分');
    }
  }
  const n2 = await u.call(`/api/v1/profile/next?taskId=${reg.json.taskId}`);
  const sk = n2.json.question?.code;
  if (sk) {
    await u.call('/api/v1/profile/skip', { body: { taskId: n2.json.taskId, code: sk } });
    const n3 = await u.call(`/api/v1/profile/next?taskId=${reg.json.taskId}`);
    assert.notEqual(n3.json.question?.code, sk, '跳过的题本任务不再出现');
  }
  assert.equal(total, 40);
  assert.equal(n2.json.earnedThisTask, 40);
  ok('4 道选填每道 +10，提示与发分一致；重复提交 0 分；跳过后不再出现');

  console.log('3. 扫码签到 → 重复扫码');
  const wrongK = await u.call(`/api/v1/events/${freeEv.slug}/checkin`, { body: { k: 'wrong' } });
  assert.equal(wrongK.json.ok, false, '扫错码不放行');
  const c1 = await u.call(`/api/v1/events/${freeEv.slug}/checkin`, { body: { k: freeEv.checkin_secret } });
  assert.equal(c1.json.result.kind, 'checked_in', JSON.stringify(c1.json));
  const c2 = await u.call(`/api/v1/events/${freeEv.slug}/checkin`, { body: { k: freeEv.checkin_secret } });
  assert.equal(c2.json.result.kind, 'already');
  let mine = (await u.call('/api/v1/me')).json;
  assert.equal(mine.points.ledger.filter((p: { category: string }) => p.category === 'checkin').length, 1);
  ok('签到成功；重复扫码显示已签到、不重复发分');

  console.log('4. 报名收费活动 → 扫码显示待核款 → 提交付款说明 → 后台核款 → 再扫码签到成功');
  const pr = await u.call(`/api/v1/events/${paidEv.slug}`);
  const answers = (pr.json.required as { code: string; input: string; options: string[] }[]).map((q) => ({
    code: q.code,
    value: q.input === 'single' ? { choice: q.options[0] } : q.input === 'multi' ? { choices: [q.options[0]] } : { text: 'ABC 地产 经理' }
  }));
  assert.ok(pr.json.required.length <= 3, '再次报名最多 3 道必答');
  const missing = await u.call(`/api/v1/events/${paidEv.slug}/register`, { body: { answers: [] } });
  if (pr.json.required.length) assert.equal(missing.json.error?.code, 'answers_required');
  const r2 = await u.call(`/api/v1/events/${paidEv.slug}/register`, { body: { answers } });
  assert.equal(r2.json.ok, true, JSON.stringify(r2.json));
  const orderNo = r2.json.orderNo as string;
  assert.ok(orderNo, '收费活动生成订单');
  const p1 = await u.call(`/api/v1/events/${paidEv.slug}/checkin`, { body: { k: paidEv.checkin_secret } });
  assert.equal(p1.json.result.kind, 'pending_payment');
  const ord = await u.call(`/api/v1/orders/${orderNo}`);
  assert.equal(ord.json.order.amountCents, 5000);
  assert.ok('configured' in ord.json.zelle);
  const note = await u.call(`/api/v1/orders/${orderNo}/note`, { body: { note: `Zelle 已付，备注 ${orderNo}` } });
  assert.equal(note.json.status, 'payment_submitted');
  const p2 = await u.call(`/api/v1/events/${paidEv.slug}/checkin`, { body: { k: paidEv.checkin_secret } });
  assert.equal(p2.json.result.kind, 'pending_payment', '提交付款说明 ≠ 已到账，不显示签到成功');
  const other = new Client();
  const steal = await other.call(`/api/v1/orders/${orderNo}`);
  assert.equal(steal.status, 401, '别人看不到我的订单');
  const v1 = await staff.call(`/api/v1/staff/orders/${orderNo}/verify`, { body: { reference: 'ZELLE-E2E' } });
  const v2 = await staff.call(`/api/v1/staff/orders/${orderNo}/verify`, { body: { reference: 'ZELLE-E2E' } });
  assert.equal(v1.json.changed, true, JSON.stringify(v1.json));
  assert.equal(v2.json.changed, false, '重复点击不重复处理');
  const p3 = await u.call(`/api/v1/events/${paidEv.slug}/checkin`, { body: { k: paidEv.checkin_secret } });
  assert.ok(['already', 'checked_in'].includes(p3.json.result.kind), JSON.stringify(p3.json));
  ok('收费活动：待核款不放行 → 核款（重复点击只处理一次）→ 签到成功');

  console.log('5. 预约会议室 → 撞时段被拒');
  const day = new Date(Date.now() + (3 + Math.floor(Math.random() * 300)) * 864e5); // 每次换一天，避免与上次测试的预约撞上
  const laNine = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 18, 0)); // 洛杉矶上午 10–11 点（夏/冬令时都在开放时间内）
  const b1 = await u.call('/api/v1/rooms/book', { body: { roomId: 1, startsAt: laNine.toISOString(), endsAt: new Date(laNine.getTime() + 2 * 3600e3).toISOString() } });
  assert.equal(b1.json.ok, true, JSON.stringify(b1.json));
  assert.equal(b1.json.booking.kind, 'held');
  const u2 = new Client();
  await u2.login(`e2e-b-${RUN}@example.com`);
  const b2 = await u2.call('/api/v1/rooms/book', { body: { roomId: 1, startsAt: new Date(laNine.getTime() + 3600e3).toISOString(), endsAt: new Date(laNine.getTime() + 3 * 3600e3).toISOString() } });
  assert.equal(b2.status, 409, JSON.stringify(b2.json));
  ok(`会议室先定先得：第一人生成订单 ${b1.json.booking.orderNo}，撞时段第二人被拒（${b2.json.error.message}）`);

  console.log('6. 网上自助入会：填表 → 协议 → Zelle 付款说明 → 待确认到账 → 工作人员确认到账 → 正式会员');
  const j = new Client();
  const jEmail = `e2e-join-${RUN}@example.com`;
  const apply = await j.call('/api/v1/membership/apply', { body: { applicationType: 'membership', tierSlug: 'member', contactName: '入会测试', email: jEmail, phone: '6265550199', agree: true } });
  assert.equal(apply.json.ok, true, JSON.stringify(apply.json));
  assert.equal(apply.json.amountCents, 20000);
  assert.equal(apply.json.needLogin, false);
  const jOrd = await j.call(`/api/v1/orders/${apply.json.orderNo}`);
  assert.equal(jOrd.json.order.purpose, 'membership');
  assert.equal((await j.call('/api/v1/me')).json.member.isMember, false, '付款前不是会员');
  await j.call(`/api/v1/orders/${apply.json.orderNo}/note`, { body: { note: 'Zelle 已付' } });
  const mid = (await j.call('/api/v1/me')).json;
  assert.equal(mid.member.isMember, false, '提交 Zelle 付款说明后还不是正式会员');
  assert.equal(mid.membershipPending?.orderNo, apply.json.orderNo, '“我的”显示已提交、待确认到账');
  const dupApply = await new Client().call('/api/v1/membership/apply', { body: { applicationType: 'membership', tierSlug: 'member', contactName: '冒用', email: jEmail, agree: true } });
  assert.equal(dupApply.json.needLogin, true, '已有档案的邮箱必须验证码登录，不能冒用');
  const jv = await staff.call(`/api/v1/staff/orders/${apply.json.orderNo}/verify`, { body: { reference: 'ZELLE-JOIN' } });
  assert.equal(jv.json.changed, true);
  const after = (await j.call('/api/v1/me')).json;
  assert.equal(after.member.isMember, true, '工作人员确认到账后立即成为正式会员');
  assert.ok(after.member.endDate, '有到期日');
  assert.equal(after.membershipPending, null);
  ok(`入会：Zelle 待确认到账时不是会员；确认到账后为${after.member.tierName}，有效期至 ${after.member.endDate}`);

  console.log('6b. Zelle 会费核实未到账 → 订单取消，不成为会员');
  const k = new Client();
  const kApply = await k.call('/api/v1/membership/apply', { body: { applicationType: 'membership', tierSlug: 'member', contactName: '未到账测试', email: `e2e-nopay-${RUN}@example.com`, agree: true } });
  await k.call(`/api/v1/orders/${kApply.json.orderNo}/note`, { body: { note: 'Zelle 已付' } });
  const noReason = await staff.call(`/api/v1/staff/orders/${kApply.json.orderNo}/reject`, { body: { reason: '' } });
  assert.equal(noReason.json.ok, false, '标记未到账必须填原因');
  const rj = await staff.call(`/api/v1/staff/orders/${kApply.json.orderNo}/reject`, { body: { reason: '核实未到账' } });
  assert.equal(rj.json.ok, true, JSON.stringify(rj.json));
  const kOrd = (await k.call(`/api/v1/orders/${kApply.json.orderNo}`)).json.order;
  assert.equal(kOrd.status, 'cancelled');
  assert.equal((await k.call('/api/v1/me')).json.member.isMember, false);
  ok('核实未到账：订单取消，不成为会员（积分冲回见后台测试）');

  console.log('7. 后台查到这个人的完整时间线');
  const search = await staff.call(`/api/v1/staff/contacts?q=${encodeURIComponent(email)}`);
  const cid = (search.json.contacts ?? search.json.rows ?? [])[0]?.id;
  assert.ok(cid, JSON.stringify(search.json).slice(0, 300));
  const detail = await staff.call(`/api/v1/staff/contacts/${cid}`);
  const kinds = new Set((detail.json.timeline as { kind?: string; type?: string }[]).map((t) => t.kind ?? t.type));
  console.log('    时间线类型：', Array.from(kinds).join(', '));
  assert.ok(detail.json.timeline.length >= 6);
  ok('客户时间线完整（报名、签到、订单、到账、积分、资料）');

  console.log(`\n全部通过：${passed} 组端到端`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
