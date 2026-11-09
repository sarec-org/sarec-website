/**
 * 1.3.1 B 报名人数与确认候补 —— 回归测试（测试库；短信 / 微信在 fetch 层拦截，不真发）。只建 DEV131- 数据，按 ID 清理。
 * 用法：DATABASE_URL=<测试库> pnpm dlx tsx scripts/crm-v131-b-tests.ts --i-know-this-is-not-production
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
const sms: string[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
  const u = String((url as { url?: string })?.url ?? url);
  if (u.includes('api.twilio.com')) { sms.push(new URLSearchParams(String(init?.body ?? '')).get('Body') ?? ''); return new Response(JSON.stringify({ sid: 'SMdev' }), { status: 201 }); }
  if (u.includes('api.weixin.qq.com') || u.includes('api.resend.com')) throw new Error('测试里不应该调用 ' + u);
  return realFetch(url as string, init);
}) as typeof fetch;
process.env.TWILIO_ACCOUNT_SID = 'ACdev131'; process.env.TWILIO_AUTH_TOKEN = 'dev131'; process.env.TWILIO_FROM_NUMBER = '+15550000000';
delete process.env.WX_APPID; delete process.env.RESEND_API_KEY;
import { getPool, withTransaction } from '@/lib/db/client';
import { guardNotProduction } from './_guard';
guardNotProduction();
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const made = { contacts: [] as string[], events: [] as string[] };
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };
const staff = { contactId: '00000000-0000-0000-0000-000000000000', email: 'dev131-staff@example.com', name: 'DEV131-助理', roles: ['ops', 'checkin'] as ('ops' | 'checkin')[] };
let n = 0;
async function person(tag: string, phone = true) {
  n++;
  const { rows } = await pool.query<{ id: string }>(`INSERT INTO contacts (name, phone_e164, acquisition_source) VALUES ($1, $2, 'test') RETURNING id`, [`DEV131-${tag}`, phone ? `+1626${String(1000000 + n * 7919 + randomBytes(1)[0]).slice(-7)}` : null]);
  if (!phone) await pool.query(`UPDATE contacts SET email = $2 WHERE id = $1`, [rows[0].id, `dev131-${sfx}-${n}@example.com`]);
  made.contacts.push(rows[0].id);
  return rows[0].id;
}
async function event(tag: string, startsInH: number, cap: number, hard: number | null) {
  const s = new Date(Date.now() + startsInH * 3600e3);
  const { rows } = await pool.query<{ id: string; slug: string }>(
    `INSERT INTO events (slug, title, starts_at, ends_at, capacity, hard_capacity, is_listed) VALUES ($1, $2, $3, $4, $5, $6, false) RETURNING id, slug`,
    [`dev131d-${tag}-${sfx}`, `DEV131-${tag}`, s, new Date(s.getTime() + 3 * 3600e3), cap, hard]
  );
  made.events.push(rows[0].id);
  return rows[0];
}
async function reg(slug: string, c: string, source: 'online' | 'onsite' = 'online') {
  const { getEventBySlug, startRegistration } = await import('@/lib/crm/events');
  return withTransaction(async (db) => (await startRegistration(db, (await getEventBySlug(db, slug))!, c, { source })).registration);
}
const st = async (ev: string, c: string) => (await pool.query<{ status: string; confirm_status: string; unreachable: boolean }>(`SELECT status, confirm_status, unreachable FROM registrations WHERE event_id = $1 AND contact_id = $2`, [ev, c])).rows[0];

async function main() {
  const seats = await import('@/lib/crm/seats');
  console.log('B1 活上限');
  assert.deepEqual([seats.seatStatus(30, 10).label, seats.seatStatus(30, 26).label, seats.seatStatus(30, 30).label], ['名额充足', '所剩不多', '已满可候补']);
  ok('只给标签：名额充足 / 所剩不多 / 已满可候补');
  const e1 = await event('cap', 72, 2, 3);
  const [a, b, c, d] = [await person('甲'), await person('乙'), await person('丙'), await person('丁')];
  await reg(e1.slug, a); await reg(e1.slug, b);
  const rc = await reg(e1.slug, c);
  assert.equal(rc.status, 'waitlisted');
  assert.equal(await seats.waitlistPosition(pool, e1.id, c), 1);
  await reg(e1.slug, d);
  assert.equal(await seats.waitlistPosition(pool, e1.id, d), 2);
  const { rows: al } = await pool.query(`SELECT 1 FROM followups WHERE dedupe_key = $1`, [`cap_full:${e1.id}:2`]);
  assert.ok(al[0]);
  ok('报到当前上限 → 后面的进候补（第 1、2 位），工作人员收到一次提醒');
  const up = await seats.raiseCapacity(staff, e1.id, { add: 10 });
  assert.equal(up.capacity, 3);
  await assert.rejects(seats.raiseCapacity(staff, e1.id, { add: 10 }), /已到硬上限 3 人/);
  ok('+10 不超过硬上限（到 3 为止）；到硬上限锁死，只能候补');
  const { getEventBySlug, startRegistration } = await import('@/lib/crm/events');
  void getEventBySlug; void startRegistration;

  console.log('B2 确认时间线（东哥没打开时什么都不做）');
  const e2 = await event('tl', 30, 3, 5);
  const p = [await person('一'), await person('二'), await person('三'), await person('候补四'), await person('候补五')];
  for (const x of p) await reg(e2.slug, x);
  const shift = async (id: string, h: number) => pool.query(`UPDATE events SET starts_at = now() + make_interval(secs => $2), ends_at = now() + make_interval(secs => $2 + 10800) WHERE id = $1`, [id, h * 3600]);
  await shift(e2.id, 23.5); // 报名时在 24 小时外，现在进入前 24 小时
  const off = await seats.runConfirmTimeline(new Date());
  assert.equal(off.enabled, false);
  assert.equal((await st(e2.id, p[0])).confirm_status, 'none');
  assert.equal(sms.length, 0);
  ok('时间线开关没打开：一条消息都不发、一个人都不转');
  const t0 = Date.now();
  const r1 = await seats.runConfirmTimeline(new Date(t0), { force: true });
  assert.ok(r1.asked >= 3);
  assert.match(sms[0], /明天的活动您来吗/);
  assert.match(sms[0], /\/zh\/confirm\/[0-9a-f-]+\?t=/);
  ok('前 24 小时：问“明天的活动您来吗？”，短信带一键确认链接');
  const regOf = async (c: string) => (await pool.query<{ id: string }>(`SELECT id FROM registrations WHERE event_id = $1 AND contact_id = $2`, [e2.id, c])).rows[0].id;
  const info = await seats.confirmInfo(await regOf(p[0]));
  assert.equal(info.state, 'ask');
  assert.equal((await st(e2.id, p[0])).confirm_status, 'asked');
  ok('打开确认页不会自动确认（要再点一下）');
  await seats.answerConfirm(await regOf(p[0]), true);
  const r2 = await seats.runConfirmTimeline(new Date(t0 + 1.6 * 3600e3), { force: true });
  assert.equal(r2.reminded, 2);
  assert.ok(sms.some((x) => x.includes('1 小时内未确认将转候补')));
  ok('前 22 小时：没回的再问一次（已确认的不再催）');
  const before = sms.length;
  const r3 = await seats.runConfirmTimeline(new Date(t0 + 2.6 * 3600e3), { force: true });
  assert.equal(r3.released, 2);
  assert.equal((await st(e2.id, p[1])).status, 'waitlisted');
  assert.equal((await st(e2.id, p[0])).status, 'registered');
  assert.equal(r3.offers, 2);
  assert.equal((await st(e2.id, p[3])).confirm_status, 'offered');
  assert.equal((await st(e2.id, p[4])).confirm_status, 'offered');
  assert.equal((await st(e2.id, p[1])).confirm_status, 'released');
  assert.ok(sms.slice(before).some((x) => x.includes('已转入候补名单')) && sms.slice(before).some((x) => x.includes('有名额了')));
  ok('前 21 小时：没回的转候补（排在原候补后面，不马上拿回刚释放的名额），候补按顺序递补');
  const posReleased = (await seats.waitlistPosition(pool, e2.id, p[1])) ?? 0;
  const posOld = (await seats.waitlistPosition(pool, e2.id, p[4])) ?? 0;
  assert.ok(posReleased > posOld);
  const y = await seats.answerConfirm(await regOf(p[3]), true);
  assert.equal(y.state, 'confirmed');
  assert.equal((await st(e2.id, p[3])).status, 'registered');
  ok('递补的人点“我来” → 转正式报名');
  const r4 = await seats.runConfirmTimeline(new Date(t0 + 6.7 * 3600e3), { force: true });
  assert.ok(r4.expired >= 1);
  assert.equal((await st(e2.id, p[4])).confirm_status, 'offer_expired');
  assert.equal((await st(e2.id, p[1])).confirm_status, 'offered');
  ok('递补 4 小时没确认 → 传给下一位（同一座位不同时发给多人）');
  const late = await seats.answerConfirm(await regOf(p[4]), true);
  assert.equal(late.state, 'waitlist');
  ok('过了确认期限再点“我来”：说清名额已让出，仍在候补');

  console.log('B3 边界');
  const e3 = await event('edge', 30, 10, 20);
  const nophone = await person('没手机', false);
  await reg(e3.slug, nophone);
  await shift(e3.id, 23.8);
  const r5 = await seats.runConfirmTimeline(new Date(), { force: true });
  assert.ok(r5.unreachable >= 1);
  const { rows: ex } = await pool.query(`SELECT 1 FROM ops_exceptions WHERE dedupe_key LIKE 'confirm_unreachable:%' AND ref = (SELECT id::text FROM registrations WHERE event_id = $1 AND contact_id = $2)`, [e3.id, nophone]);
  assert.ok(ex[0]);
  await seats.runConfirmTimeline(new Date(Date.now() + 3 * 3600e3), { force: true });
  assert.equal((await st(e3.id, nophone)).status, 'registered');
  ok('消息全部发不出去：进异常名单，不转候补');
  const e4 = await event('soon', 10, 10, 20);
  const last = await person('临时报名');
  await reg(e4.slug, last);
  assert.equal((await st(e4.id, last)).confirm_status, 'confirmed');
  ok('活动前 24 小时内才报名：报名即确认出席');
  const e5 = await event('short', 2, 1, 2);
  const s1 = await person('短窗一'); const s2 = await person('短窗二');
  await reg(e5.slug, s1); await reg(e5.slug, s2);
  await withTransaction(async (db) => { await db.query(`UPDATE registrations SET status = 'cancelled' WHERE event_id = $1 AND contact_id = $2`, [e5.id, s1]); await seats.fillSeats(db, e5.id, new Date(), true); });
  const { rows: oe } = await pool.query<{ h: number }>(`SELECT extract(epoch FROM offer_expires_at - now()) / 3600 AS h FROM registrations WHERE event_id = $1 AND contact_id = $2`, [e5.id, s2]);
  assert.ok(oe[0].h <= 1.01 && oe[0].h > 0.9);
  ok('距开场不足 4 小时：确认窗口缩短为 1 小时');

  console.log('连续爽约');
  const flake = await person('爽约');
  for (const tag of ['past1', 'past2']) {
    const e = await event(tag, -48, 10, 20);
    await pool.query(`INSERT INTO registrations (event_id, contact_id, status, confirm_status) VALUES ($1, $2, 'registered', 'asked')`, [e.id, flake]);
  }
  const e6 = await event('next', 72, 10, 20);
  await reg(e6.slug, flake);
  assert.equal((await st(e6.id, flake)).status, 'waitlisted');
  ok('连续两次报了名、没确认也没来 → 下次报名进候补');
  await seats.setNoshowExempt(staff, flake, true);
  const e7 = await event('next2', 72, 10, 20);
  await reg(e7.slug, flake);
  assert.equal((await st(e7.id, flake)).status, 'registered');
  ok('后台解除后照常报名');
  await seats.staffAdmit(staff, e6.id, flake);
  assert.equal((await st(e6.id, flake)).status, 'registered');
  ok('现场工作人员手动放人（候补转正式）');
  const board = await seats.confirmBoard(e2.id);
  assert.equal(board.confirmed, 2);
  assert.ok(board.waitlist >= 2);
  ok(`工作台三组数：已确认 ${board.confirmed} / 未确认 ${board.unconfirmed} / 候补 ${board.waitlist}`);
  const rid = await regOf(p[0]);
  assert.equal(seats.confirmTokenOk(rid, seats.confirmToken(rid)), true);
  assert.equal(seats.confirmTokenOk(rid, 'x' + seats.confirmToken(rid).slice(1)), false);
  ok('确认链接签名：伪造的打不开');
  console.log(`\n全部通过：${passed} 项`);
}
async function cleanup() {
  await pool.query(`DELETE FROM ops_exceptions WHERE dedupe_key LIKE 'confirm_unreachable:%' AND ref IN (SELECT id::text FROM registrations WHERE event_id = ANY($1::uuid[]))`, [made.events]);
  await pool.query(`DELETE FROM confirm_sends WHERE registration_id IN (SELECT id FROM registrations WHERE event_id = ANY($1::uuid[]))`, [made.events]);
  await pool.query(`DELETE FROM followups WHERE event_id = ANY($1::uuid[])`, [made.events]);
  await pool.query(`DELETE FROM crm_audit_log WHERE actor = 'staff:DEV131-助理'`);
  await pool.query(`DELETE FROM points_ledger WHERE contact_id = ANY($1::uuid[])`, [made.contacts]);
  await pool.query(`DELETE FROM profile_tasks WHERE contact_id = ANY($1::uuid[])`, [made.contacts]);
  await pool.query(`DELETE FROM registrations WHERE event_id = ANY($1::uuid[])`, [made.events]);
  await pool.query(`DELETE FROM contact_methods WHERE contact_id = ANY($1::uuid[])`, [made.contacts]);
  await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[])`, [made.contacts]);
  await pool.query(`DELETE FROM events WHERE id = ANY($1::uuid[])`, [made.events]);
  console.log('清理完成');
}
main().catch((e) => { console.error('✗ 失败：', e); process.exitCode = 1; }).finally(async () => { await cleanup().catch((e) => console.error('清理出错', e)); await pool.end(); });
