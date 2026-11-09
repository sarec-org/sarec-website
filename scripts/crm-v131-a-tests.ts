/**
 * 1.3.1 A 签到与注册重做 —— 回归测试（测试库；微信、短信接口在 fetch 层拦截，不真发）。
 * 只建 DEV131- 测试数据，结束按 ID 删除。
 * 用法：DATABASE_URL=<测试库> pnpm dlx tsx scripts/crm-v131-a-tests.ts --i-know-this-is-not-production
 */
import assert from 'node:assert/strict';
import crypto, { randomBytes } from 'node:crypto';

const realFetch = globalThis.fetch;
let wxPhone = '';
globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
  const u = String((url as { url?: string })?.url ?? url);
  if (u.includes('api.weixin.qq.com/cgi-bin/stable_token')) return new Response(JSON.stringify({ access_token: 'dev131-token', expires_in: 7200 }));
  if (u.includes('api.weixin.qq.com/wxa/business/getuserphonenumber')) {
    const cc = wxPhone.startsWith('+86') ? '86' : '1';
    return new Response(JSON.stringify({ errcode: 0, phone_info: { purePhoneNumber: wxPhone.slice(cc.length + 1), countryCode: cc } }));
  }
  if (u.includes('verify.twilio.com')) throw new Error('测试里不应该调用短信接口');
  return realFetch(url as string, init);
}) as typeof fetch;
process.env.WX_APPID = 'dev131-appid';
process.env.WX_SECRET = 'dev131-secret';
delete process.env.TWILIO_ACCOUNT_SID;
delete process.env.TWILIO_AUTH_TOKEN;
delete process.env.TWILIO_VERIFY_SID;
delete process.env.TWILIO_VERIFY_SERVICE_SID;

import { getPool } from '@/lib/db/client';
import { guardNotProduction } from './_guard';

guardNotProduction();
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const made = { contacts: [] as string[], events: [] as string[], tokens: [] as string[] };
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };
const P = () => `+1626${String(1000000 + (randomBytes(3).readUIntBE(0, 3) % 8999999)).slice(0, 7)}`;
const staff = { contactId: '00000000-0000-0000-0000-000000000000', email: 'dev131-staff@example.com', name: 'DEV131-助理', roles: ['ops', 'checkin'] as ('ops' | 'checkin')[] };

async function contact(name: string, extra: Record<string, unknown> = {}) {
  const cols = ['name', 'wechat_openid', 'acquisition_source', ...Object.keys(extra)];
  const vals = [name, `dev131-openid-${randomBytes(4).toString('hex')}`, 'miniprogram', ...Object.values(extra)];
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO contacts (${cols.join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) RETURNING id`,
    vals
  );
  made.contacts.push(rows[0].id);
  return rows[0].id;
}
async function event(tag: string, startOffsetH: number, status = 'scheduled') {
  const starts = new Date(Date.now() + startOffsetH * 3600e3);
  const { rows } = await pool.query<{ id: string; slug: string }>(
    `INSERT INTO events (slug, title, starts_at, ends_at, fee_cents, capacity, event_status, is_listed) VALUES ($1, $2, $3, $4, 0, 30, $5, false) RETURNING id, slug`,
    [`dev131d-${tag}-${sfx}`, `DEV131-${tag}-${sfx}`, starts, new Date(starts.getTime() + 3 * 3600e3), status]
  );
  made.events.push(rows[0].id);
  return rows[0];
}
const pts = async (id: string) => (await pool.query<{ n: number }>(`SELECT coalesce(sum(points), 0)::int AS n FROM points_ledger WHERE contact_id = $1`, [id])).rows[0].n;
const arrival = async (ev: string, c: string) => (await pool.query<{ a: string }>(`SELECT arrival_status AS a FROM registrations WHERE event_id = $1 AND contact_id = $2`, [ev, c])).rows[0]?.a;

async function main() {
  const ck = await import('@/lib/crm/checkin131');
  const { sessionContact } = await import('@/lib/crm/auth');
  const dm = await import('@/lib/crm/dupMerge');
  const ev = await event('today', -0.5);

  console.log('A2 新人一屏三项');
  const shell = await contact('微信用户');
  const s1 = await ck.scan(ev.slug, shell);
  assert.equal(s1.kind, 'new');
  assert.deepEqual((s1 as { professions: string[] }).professions, ['开发商', '经纪', '贷款', '投资人', '律师会计', '建筑装修', '其他']);
  ok('系统不认识 → 新人那一屏（职业 7 个选项）');
  await assert.rejects(ck.newcomer(ev.slug, shell, { name: '', profession: '', phone: '' }), /还差：手机号、姓名、职业/);
  await assert.rejects(ck.newcomer(ev.slug, shell, { name: 'DEV131-新人', phone: P() }), /还差：职业/);
  ok('没填完 → “还差：职业”');
  const sms = await ck.sendSms(shell, '6265550100', '+1');
  assert.equal(sms.sent, false);
  assert.match(sms.message, /直接点“完成签到”/);
  ok('短信发不出 → 告诉客户直接完成签到（不卡住）');
  const n1 = await ck.newcomer(ev.slug, shell, { name: 'DEV131-新人', profession: '经纪', phone: P().slice(2), cc: '+1' });
  assert.equal(n1.step.kind, 'welcome');
  const w1 = n1.step as { greetName: string; points: number; showJoin: boolean; already: boolean };
  assert.equal(w1.greetName, 'DEV131-新人');
  assert.equal(w1.points, 15); // 签到 10 + 补一项资料 5
  assert.equal(w1.showJoin, true);
  assert.equal(await arrival(ev.id, shell), 'checked_in');
  ok('填完 → 建档 + 现场报名 + 到场，欢迎页（签到 10 + 职业 5，显示“了解入会”）');
  const again = await ck.scan(ev.slug, shell);
  assert.equal(again.kind, 'welcome');
  assert.equal((again as { already: boolean }).already, true);
  assert.equal((again as { showJoin: boolean }).showJoin, false);
  assert.equal(await pts(shell), 15);
  ok('同一场再扫：直接欢迎光临，不再问、不重复计分，“了解入会”不再出现');

  console.log('A3 来过的人 1–3 道选择题');
  const old = await contact('DEV131-老会员', { phone_e164: P() });
  const s2 = await ck.scan(ev.slug, old);
  assert.equal(s2.kind, 'questions');
  const qs = (s2 as { questions: { key: string }[] }).questions;
  assert.ok(qs.length >= 1 && qs.length <= 3);
  assert.equal(qs[0].key, 'region');
  assert.equal(await arrival(ev.id, old), 'checked_in');
  ok(`认出来 → 先记到场，再出 ${qs.length} 道题（常住地区第一）`);
  const w2 = await ck.answer(ev.slug, old, { region: { choice: '洛杉矶/橙县' }, profession: { choice: '开发商', text: '在橙县做独栋开发' } });
  assert.equal(w2.kind, 'welcome');
  assert.equal(w2.points, 5 + 5 + 5); // 只算这次答题新得的；签到 10 分在扫码那一步
  assert.equal((await ck.answer(ev.slug, old, { region: { choice: '洛杉矶/橙县' } })).points, 0);
  const { rows: rg } = await pool.query<{ region_self: string }>(`SELECT region_self FROM contacts WHERE id = $1`, [old]);
  assert.equal(rg[0].region_self, '洛杉矶/橙县');
  ok('点完 → 欢迎页；常住地区写进档案（本人填写），手填的多给 5 分');
  const s3 = await ck.scan(ev.slug, old);
  assert.equal(s3.kind, 'welcome');
  assert.equal(await pts(old), 25);
  ok('同一场重复扫码：不重复问、不重复签到、不重复计分');
  await assert.rejects(ck.answer(ev.slug, old, { bogus: { choice: 'x' } }).then(async () => { if ((await pts(old)) !== 25) throw new Error('乱填加分了'); throw new Error('ok'); }), /ok/);
  ok('题库里没有的题、选项外的值不记分');
  const ev2 = await event('next', -0.2);
  const s4 = await ck.scan(ev2.slug, old);
  assert.equal(s4.kind, 'questions');
  assert.ok(!(s4 as { questions: { key: string }[] }).questions.some((q) => q.key === 'region' || q.key === 'profession'));
  ok('下一场：只问还缺的题（已答的不再问）');
  await pool.query(`UPDATE checkin_questions SET is_active = false WHERE key IN ('focus','heard','frequency')`);
  try {
    const full = await contact('DEV131-资料齐', { phone_e164: P() });
    await ck.saveAnswers(pool, full, { region: { choice: '纽约' }, profession: { choice: '贷款' } });
    const s5 = await ck.scan(ev.slug, full);
    assert.equal(s5.kind, 'welcome');
    ok('资料齐了 → 扫码直接欢迎光临');
  } finally {
    await pool.query(`UPDATE checkin_questions SET is_active = true WHERE key IN ('focus','heard','frequency')`);
  }

  console.log('A4 内部编号：验证过的手机号认出老人，换微信不丢报名和积分');
  const phone = P();
  const main = await contact('DEV131-老客户A', { phone_e164: phone, phone_verified_at: new Date() });
  await pool.query(`INSERT INTO registrations (event_id, contact_id) VALUES ($1, $2)`, [ev.id, main]);
  const newWx = await contact('微信用户');
  assert.equal((await ck.scan(ev.slug, newWx)).kind, 'new');
  wxPhone = phone;
  const n2 = await ck.newcomer(ev.slug, newWx, { name: 'A 换了新微信', profession: '投资人', phoneCode: 'dev131code123' });
  assert.equal(n2.contactId, main);
  assert.ok(n2.token);
  made.tokens.push(n2.token!);
  assert.equal(await arrival(ev.id, main), 'checked_in');
  const { rows: mi } = await pool.query<{ merged_into: string; name: string }>(`SELECT merged_into, (SELECT name FROM contacts WHERE id = $2) AS name FROM contacts WHERE id = $1`, [newWx, main]);
  assert.equal(mi[0].merged_into, main);
  assert.equal(mi[0].name, 'DEV131-老客户A');
  ok('微信一键填的号已属于老档案 → 新微信挂到老档案下，签到记在老档案上，老档案姓名不被现场填的覆盖');
  assert.equal(await sessionContact(n2.token), main);
  const shellTok = randomBytes(16).toString('base64url');
  await pool.query(`INSERT INTO sessions (token_hash, contact_id, channel, expires_at) VALUES ($1, $2, 'miniprogram', now() + interval '1 day')`, [crypto.createHash('sha256').update(shellTok).digest('hex'), newWx]);
  made.tokens.push(shellTok);
  assert.equal(await sessionContact(shellTok), main);
  ok('旧会话 / 新会话都按主档案算（换微信不丢资格）');

  const wx2 = await contact('微信用户');
  const p3 = P();
  wxPhone = p3;
  const shown = await ck.wxPhoneStep(wx2, 'dev131code789');
  assert.equal(shown.phone, p3);
  assert.equal(shown.cc, '+1');
  assert.equal(ck.proofOk(wx2, p3, shown.proof), true);
  assert.equal(ck.proofOk(wx2, P(), shown.proof), false);
  assert.equal(ck.proofOk(main, p3, shown.proof), false);
  const n4 = await ck.newcomer(ev.slug, wx2, { name: 'DEV131-一键填', profession: '贷款', phone: p3, phoneProof: shown.proof });
  const { rows: v4 } = await pool.query<{ v: Date | null }>(`SELECT phone_verified_at AS v FROM contacts WHERE id = $1`, [n4.contactId]);
  assert.ok(v4[0].v);
  ok('一键填：先给客户看号码，提交时带签名证明；换号码、换人都不认，验证过的号写进档案');

  const busy = await contact('DEV131-有内容的微信', { phone_e164: P() });
  await pool.query(`INSERT INTO registrations (event_id, contact_id) VALUES ($1, $2)`, [ev2.id, busy]);
  const p2 = P();
  const owner2 = await contact('DEV131-另一份档案', { phone_e164: p2, phone_verified_at: new Date() });
  wxPhone = p2;
  await pool.query(`UPDATE contacts SET name = '微信用户' WHERE id = $1`, [busy]);
  const n3 = await ck.newcomer(ev.slug, busy, { name: 'X', profession: '其他', phoneCode: 'dev131code456' });
  assert.equal(n3.contactId, busy);
  assert.equal(n3.token, undefined);
  const { rows: mn } = await pool.query(`SELECT 1 FROM crm_audit_log WHERE action = 'merge_needed' AND target_id = $1`, [busy]);
  assert.ok(mn[0]);
  ok('当前档案已有报名 → 不自动合并，记“需人工合并”给助理');
  void owner2;

  console.log('补登记到场');
  const past = await event('past', -72, 'completed');
  const bp = P();
  const b1 = await dm.backfillAttendance(staff, past.id, { name: 'DEV131-漏记的人', phone: bp.slice(2), cc: '+1', note: 'DEV131 纸质签到表' });
  made.contacts.push(b1.contactId);
  assert.equal(b1.created, true);
  assert.equal(await arrival(past.id, b1.contactId), 'checked_in');
  const b2 = await dm.backfillAttendance(staff, past.id, { name: '同一个人', phone: bp.slice(2), cc: '+1' });
  assert.equal(b2.contactId, b1.contactId);
  assert.equal(await pts(b1.contactId), 10);
  const b3 = await dm.backfillAttendance(staff, past.id, { contactId: old });
  assert.equal(b3.created, false);
  const log = await dm.backfillLog(past.id);
  assert.equal(log.length, 3);
  ok('已结束的活动也能补；同一手机号认同一人、不重复计分；每次留操作记录');

  console.log('合并重复档案（可撤销）');
  const dupPhone = P();
  const k = await contact('DEV131-重复甲', { phone_e164: dupPhone });
  const m = await contact('DEV131-重复乙');
  await pool.query(`INSERT INTO contact_methods (contact_id, kind, value, status) VALUES ($1, 'phone', $2, 'unconfirmed')`, [m, dupPhone]);
  await dm.backfillAttendance(staff, past.id, { contactId: k });
  await dm.backfillAttendance(staff, past.id, { contactId: m });
  await dm.backfillAttendance(staff, ev2.id, { contactId: m });
  const sug = await dm.duplicateSuggestions(500);
  assert.ok(sug.some((x) => [x.a.id, x.b.id].includes(k) && [x.a.id, x.b.id].includes(m)));
  ok('同手机号（对方是未验证的号）→ 出现在疑似重复里');
  const before = { k: await pts(k), m: await pts(m) };
  const mr = await dm.mergeContacts(staff, k, m, 'DEV131');
  assert.equal(await pts(k), 20); // 两场签到各 10；同一场重复的那 10 分冲销
  assert.equal(await pts(m), 0);
  assert.equal(await arrival(ev2.id, k), 'checked_in');
  assert.equal(mr.pointsReversed, 1);
  const { rows: mm } = await pool.query<{ merged_into: string }>(`SELECT merged_into FROM contacts WHERE id = $1`, [m]);
  assert.equal(mm[0].merged_into, k);
  ok('合并：报名、签到、积分搬到保留档案，同一场重复积分不相加');
  await dm.undoMerge(staff, mr.mergeId);
  assert.equal(await pts(k), before.k);
  assert.equal(await pts(m), before.m);
  assert.equal(await arrival(ev2.id, m), 'checked_in');
  const { rows: mu } = await pool.query<{ merged_into: string | null }>(`SELECT merged_into FROM contacts WHERE id = $1`, [m]);
  assert.equal(mu[0].merged_into, null);
  ok('撤销：原样搬回，冲销删掉，两份档案恢复独立');
  await dm.markNotDuplicate(staff, k, m);
  assert.ok(!(await dm.duplicateSuggestions(500)).some((x) => [x.a.id, x.b.id].includes(k) && [x.a.id, x.b.id].includes(m)));
  ok('标记“不是同一人”后不再提示');
  const st = await contact('DEV131-工作人员');
  await pool.query(`INSERT INTO staff_roles (email, name, roles, mp_contact_id) VALUES ($1, 'DEV131', '{checkin}', $2)`, [`dev131-${sfx}@example.com`, st]);
  await assert.rejects(dm.mergeContacts(staff, k, st), /工作人员账号/);
  const stPhone = P();
  await pool.query(`UPDATE contacts SET phone_e164 = $2, phone_verified_at = now() WHERE id = $1`, [st, stPhone]);
  const wx3 = await contact('微信用户');
  wxPhone = stPhone;
  const n5 = await ck.newcomer(ev.slug, wx3, { name: '冒充', profession: '其他', phoneCode: 'dev131codeSTAFF' });
  assert.equal(n5.contactId, wx3);
  assert.equal(n5.token, undefined);
  ok('验证过的号属于工作人员档案 → 不自动挂、不发工作人员会话（测试 P2-A1）');
  await pool.query(`DELETE FROM staff_roles WHERE email = $1`, [`dev131-${sfx}@example.com`]);
  ok('工作人员账号不能被合并掉（合并不会带来或丢掉管理员权限）');

  console.log(`\n全部通过：${passed} 项`);
}

async function cleanup() {
  const ids = made.contacts;
  await pool.query(`DELETE FROM contact_not_duplicates WHERE a_id = ANY($1::uuid[]) OR b_id = ANY($1::uuid[])`, [ids]);
  await pool.query(`DELETE FROM contact_merges WHERE kept_id = ANY($1::uuid[]) OR merged_id = ANY($1::uuid[])`, [ids]);
  await pool.query(`UPDATE contacts SET merged_into = NULL WHERE id = ANY($1::uuid[])`, [ids]);
  await pool.query(`DELETE FROM points_ledger WHERE contact_id = ANY($1::uuid[])`, [ids]);
  await pool.query(`DELETE FROM profile_answers WHERE contact_id = ANY($1::uuid[])`, [ids]);
  await pool.query(`DELETE FROM profile_tasks WHERE contact_id = ANY($1::uuid[])`, [ids]);
  await pool.query(`DELETE FROM registrations WHERE event_id = ANY($1::uuid[]) OR contact_id = ANY($1::uuid[])`, [made.events.concat([]), ]).catch(() => undefined);
  await pool.query(`DELETE FROM registrations WHERE contact_id = ANY($1::uuid[])`, [ids]);
  await pool.query(`DELETE FROM registrations WHERE event_id = ANY($1::uuid[])`, [made.events]);
  await pool.query(`DELETE FROM crm_audit_log WHERE target_id = ANY($1::text[])`, [ids]);
  await pool.query(`DELETE FROM contact_methods WHERE contact_id = ANY($1::uuid[])`, [ids]);
  await pool.query(`DELETE FROM sessions WHERE contact_id = ANY($1::uuid[])`, [ids]);
  await pool.query(`DELETE FROM phone_verify_sends WHERE contact_id = ANY($1::uuid[])`, [ids]);
  await pool.query(`DELETE FROM track_events WHERE contact_id = ANY($1::uuid[])`, [ids]);
  await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[])`, [ids]);
  await pool.query(`DELETE FROM events WHERE id = ANY($1::uuid[])`, [made.events]);
  const { rows } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM contacts WHERE name LIKE 'DEV131-%'`);
  console.log(`清理完成（剩余 DEV131- 档案：${rows[0].n}）`);
}

main()
  .catch((e) => { console.error('✗ 失败：', e); process.exitCode = 1; })
  .finally(async () => { await cleanup().catch((e) => console.error('清理出错', e)); await pool.end(); });
