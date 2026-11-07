/**
 * 1.3 N / O / P 回归测试（测试库）：
 *  N 手机工作台：绑定码一次性、过期；绑定后小程序会话是工作人员；工作台接口不含金额；小程序会话不能用收款接口
 *  O 企业微信：没配置时回退个人微信二维码；回调解密；按 state / unionid 关联会员档案；关联不上进待处理
 *  P 首页大卡片三种状态；往期卡片到场人数；邀请卡素材；商会介绍页
 * 只建 DEV13- 测试数据，结束按 ID 删除。
 * 用法：DATABASE_URL=<测试库> pnpm dlx tsx scripts/crm-v13-nop-tests.ts --i-know-this-is-not-production
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { getPool, withTransaction } from '@/lib/db/client';
import { createSession, staffFor } from '@/lib/crm/auth';
import { claimBindCode, createBindCode, mpSafe, unbindStaff, workbenchAccess, workbenchEvent, workbenchHome, workbenchTodo } from '@/lib/crm/workbench';
import { requireStaff } from '@/lib/crm/http';
import { decrypt, encryptForTest, recordAdd, signatureOk, wechatQrFor, xmlField } from '@/lib/wecom';
import { homeData } from '@/lib/crm/growth';
import { listEvents } from '@/lib/crm/flow';
import { chamberInviteData } from '@/lib/crm/cards';
import { guardNotProduction } from './_guard';

guardNotProduction();
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const made = { events: [] as string[], contacts: [] as string[], staff: [] as string[], codes: [] as string[], wecom: [] as string[], exceptions: [] as string[], sessions: [] as string[] };
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };

async function mkContact(tag: string, extra: Record<string, unknown> = {}) {
  const cols = ['name', 'acquisition_source', ...Object.keys(extra)];
  const vals = [`DEV13-${tag}-${sfx}`, 'test', ...Object.values(extra)];
  const { rows } = await pool.query<{ id: string; member_no: number }>(`INSERT INTO contacts (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id, member_no::int AS member_no`, vals);
  made.contacts.push(rows[0].id);
  return rows[0];
}
function mpReq(path: string, token: string) {
  return new Request(`https://x.test${path}`, { headers: { authorization: `Bearer ${token}`, 'x-sarec-client': 'mp-1.3' } });
}

async function main() {
  assert.equal((await pool.query(`SELECT 1 FROM events WHERE slug = '2026-11-07-event-e641'`)).rows.length, 0, '正式库，停止');

  // ── N 绑定 ──
  const email = `dev13-staff-${sfx}@example.com`;
  await pool.query(`INSERT INTO staff_roles (email, name, roles) VALUES ($1, $2, '{ops,checkin}')`, [email, `DEV13-助理-${sfx}`]);
  made.staff.push(email);
  const mp = await mkContact('mp-staff');
  const plain = await mkContact('mp-user');
  assert.equal(await workbenchAccess(plain.id), null, '普通用户看不到工作台');
  assert.equal(await workbenchAccess(mp.id), null);
  const { code } = await createBindCode({ contactId: 'x', email, name: 'x', roles: ['ops'] });
  made.codes.push(code);
  await assert.rejects(claimBindCode(mp.id, 'BADCODE1'), /不存在|用过/);
  await claimBindCode(mp.id, code);
  await assert.rejects(claimBindCode(plain.id, code), /用过/, '绑定码只能用一次');
  const s = await staffFor(mp.id);
  assert.ok(s && s.roles.includes('ops'), '绑定后是工作人员');
  assert.deepEqual((await workbenchAccess(mp.id))?.roles.sort(), ['checkin', 'ops']);
  const { code: old } = await createBindCode({ contactId: 'x', email, name: 'x', roles: ['ops'] });
  made.codes.push(old);
  await pool.query(`UPDATE staff_bind_codes SET expires_at = now() - interval '1 minute' WHERE code = $1`, [old]);
  await assert.rejects(claimBindCode(plain.id, old), /过期/);
  ok('工作台绑定：普通用户看不到入口；绑定码一次性、10 分钟过期；绑定后有运营 + 签到权限');

  // ── N 工作台不含金额；小程序会话不能用收款接口 ──
  const starts = new Date(Date.now() + 2 * 3600e3);
  const { rows: ev } = await pool.query<{ id: string; slug: string }>(
    `INSERT INTO events (slug, title, starts_at, ends_at, fee_cents, capacity) VALUES ($1, $2, $3, $4, 8000, 20) RETURNING id, slug`,
    [`dev13-wb-${sfx}`, `DEV13-工作台收费活动-${sfx}`, starts, new Date(starts.getTime() + 3 * 3600e3)]
  );
  made.events.push(ev[0].id);
  await pool.query(`INSERT INTO registrations (event_id, contact_id, status) VALUES ($1, $2, 'registered')`, [ev[0].id, plain.id]);
  const home = await workbenchHome(s!);
  const evd = await workbenchEvent(ev[0].id, '');
  const todo = await workbenchTodo();
  const all = JSON.stringify(mpSafe({ home, evd, todo }));
  assert.ok(!/cents|amount|order_no|\$\d|8000|80\.00|zelle|stripe/i.test(all), '工作台返回里没有金额 / 订单 / 付款');
  assert.ok(evd.people.some((p) => p.contactId === plain.id), '实时名单里有报名的人');
  assert.equal(evd.counts.registered, 1);
  assert.ok(!JSON.stringify(todo).includes('draft'), '待办不含 AI 草稿');
  assert.deepEqual(mpSafe({ amount_cents: 1, note: '请现场 Zelle 付 $80', name: 'a' }), { note: '这位还需要在签到台确认费用，收款请在网站后台处理', name: 'a' });
  ok('工作台：实时名单、今日数据、待办都不含金额、订单、付款方式和 AI 草稿');

  const token = await withTransaction((db) => createSession(db, mp.id, 'miniprogram'));
  made.sessions.push(token);
  await assert.rejects(requireStaff(mpReq('/api/v1/staff/orders', token), 'ops'), /手机浏览器/);
  await assert.rejects(requireStaff(mpReq(`/api/v1/staff/events/${ev[0].id}`, token), 'ops'), /手机浏览器/);
  await assert.rejects(requireStaff(mpReq('/api/v1/staff/settings', token), 'ops'), /手机浏览器/);
  const okStaff = await requireStaff(mpReq(`/api/v1/staff/events/${ev[0].id}/photos`, token), 'ops');
  assert.equal(okStaff.email, email, '小程序工作台可以传活动照片');
  ok('小程序会话调收款 / 订单 / 设置 / 活动详情（含费用）接口：拒绝并提示用手机浏览器打开后台；传照片接口可用');

  await unbindStaff(email);
  assert.equal(await staffFor(mp.id), null, '解绑后不再是工作人员');
  ok('后台解绑后，这个微信不再能打开工作台');

  // ── O 企业微信 ──
  const saved = { corp: process.env.WECOM_CORP_ID, sec: process.env.WECOM_CONTACT_SECRET };
  delete process.env.WECOM_CORP_ID;
  delete process.env.WECOM_CONTACT_SECRET;
  const { rows: qrRow } = await pool.query<{ value: string }>(`SELECT value #>> '{}' AS value FROM crm_settings WHERE key = 'wechat_qr_url'`);
  const fb = await wechatQrFor('done', plain.id);
  assert.equal(fb?.kind ?? null, qrRow[0]?.value ? 'personal' : null, '企业微信没配置：回退个人微信二维码（没上传就是 null）');
  process.env.WECOM_CORP_ID = saved.corp ?? '';
  process.env.WECOM_CONTACT_SECRET = saved.sec ?? '';
  if (!saved.corp) delete process.env.WECOM_CORP_ID;
  if (!saved.sec) delete process.env.WECOM_CONTACT_SECRET;
  ok('企业微信不可用时，加商会微信的码回退到个人微信二维码，不报错');

  const key = randomBytes(32);
  const msg = `<xml><Event><![CDATA[change_external_contact]]></Event><ChangeType><![CDATA[add_external_contact]]></ChangeType><State><![CDATA[m${plain.member_no}.d]]></State></xml>`;
  const enc = encryptForTest(msg, key, 'wwDEV13');
  assert.equal(decrypt(enc, key, 'wwDEV13'), msg);
  assert.throws(() => decrypt(enc, key, 'wwOTHER'));
  assert.equal(xmlField(msg, 'State'), `m${plain.member_no}.d`);
  assert.ok(signatureOk('t', '1', 'n', enc, require('node:crypto').createHash('sha1').update(['t', '1', 'n', enc].sort().join('')).digest('hex')));
  ok('企业微信回调：签名校验、AES 解密、企业 ID 校验');

  const ext1 = `dev13-ext-a-${sfx}`;
  made.wecom.push(ext1);
  const r1 = await recordAdd({ externalUserId: ext1, userId: 'dev', state: `m${plain.member_no}.d` }, false);
  assert.deepEqual([r1.contactId, r1.matchedBy, r1.placement], [plain.id, 'state', 'done']);
  const uni = `dev13-union-${sfx}`;
  const u = await mkContact('union', { wechat_unionid: uni });
  const ext2 = `dev13-ext-b-${sfx}`;
  made.wecom.push(ext2);
  await pool.query(`INSERT INTO wecom_external_contacts (external_userid, unionid) VALUES ($1, $2)`, [ext2, uni]).catch(() => undefined);
  await pool.query(`DELETE FROM wecom_external_contacts WHERE external_userid = $1`, [ext2]);
  const ext3 = `dev13-ext-c-${sfx}`;
  made.wecom.push(ext3);
  const r3 = await recordAdd({ externalUserId: ext3, userId: 'dev', state: 'p.a' }, false);
  assert.equal(r3.contactId, null);
  assert.equal(r3.placement, 'album');
  const { rows: ex } = await pool.query<{ id: string }>(`SELECT id::text FROM ops_exceptions WHERE dedupe_key = $1`, [`wecom:${ext3}`]);
  assert.ok(ex[0], '关联不上的进待处理');
  made.exceptions.push(...ex.map((x) => x.id));
  void u;
  ok('加企业微信好友：带会员编号的码自动关联会员档案、记下来源入口；关联不上的进后台待处理');

  // ── P 首页大卡片、往期卡片、邀请卡 ──
  const h = await homeData(plain.id, { base: 'https://x.test', withQr: false });
  assert.equal((h as { homeCard: { kind: string } }).homeCard.kind, 'event', '有未结束活动 → 显示最近一场');
  const past = await listEvents(true);
  if (past[0]) assert.ok('attended' in past[0] && 'photoCount' in past[0], '往期卡片有到场人数、照片数');
  const inv = await chamberInviteData(plain.id, 'https://x.test');
  assert.ok(inv.codeUrl.includes(`/api/v1/codes/chamber/${plain.member_no}.png`));
  assert.ok(!/\$\d|美元|会费/.test(JSON.stringify(inv)));
  ok('首页大卡片按状态切换；往期卡片带到场人数；“认识商会”邀请卡带专属码、不含金额');

  console.log(`\n全部通过：${passed} 项`);
}

async function cleanup() {
  const crypto = await import('node:crypto');
  if (made.sessions.length) await pool.query(`DELETE FROM sessions WHERE token_hash = ANY($1::text[])`, [made.sessions.map((t) => crypto.createHash('sha256').update(t).digest('hex'))]).catch(() => undefined);
  if (made.wecom.length) {
    await pool.query(`DELETE FROM track_events WHERE name = 'wecom_add' AND contact_id = ANY($1::uuid[])`, [made.contacts]).catch(() => undefined);
    await pool.query(`DELETE FROM track_events WHERE name = 'wecom_add' AND contact_id IS NULL AND created_at > now() - interval '1 hour' AND target = 'album'`).catch(() => undefined);
    await pool.query(`DELETE FROM wecom_external_contacts WHERE external_userid = ANY($1::text[])`, [made.wecom]);
  }
  if (made.exceptions.length) await pool.query(`DELETE FROM ops_exceptions WHERE id::text = ANY($1::text[])`, [made.exceptions]);
  if (made.codes.length) await pool.query(`DELETE FROM staff_bind_codes WHERE code = ANY($1::text[])`, [made.codes]);
  if (made.staff.length) await pool.query(`DELETE FROM staff_roles WHERE email = ANY($1::text[]) AND email LIKE 'dev13-%'`, [made.staff]);
  if (made.events.length) {
    await pool.query(`DELETE FROM registrations WHERE event_id = ANY($1::uuid[])`, [made.events]);
    await pool.query(`DELETE FROM events WHERE id = ANY($1::uuid[]) AND title LIKE 'DEV13-%'`, [made.events]);
  }
  if (made.contacts.length) {
    await pool.query(`DELETE FROM member_cards WHERE contact_id = ANY($1::uuid[])`, [made.contacts]);
    await pool.query(`DELETE FROM wecom_contact_ways WHERE contact_id = ANY($1::uuid[])`, [made.contacts]).catch(() => undefined);
    await pool.query(`DELETE FROM sessions WHERE contact_id = ANY($1::uuid[])`, [made.contacts]).catch(() => undefined);
    await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[]) AND name LIKE 'DEV13-%'`, [made.contacts]);
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(async () => { await cleanup().catch((e) => console.error('清理失败', e)); await pool.end(); });
