/**
 * 指令 36 第 2 条：对测试站 / 预览部署走一遍"检测完才公开"（真上传图片，经 HTTP）。
 * - 正常图：项目、头像传上去 → 只有本人看得到（测试站没有微信密钥 = 测试站不检测）→ 工作人员在「内容管理」/「今天」一键放行 → 大家看到。
 * - "不通过"模拟：测试站收不到微信推送，用同一段回调代码（handleMediaCheckResult）对测试库模拟微信推回 risky。
 * - "出错"：测试站不检测和接口出错走同一条路（留着等放行）；接收推送的路由没配 Token 时只回 403，不影响别的。
 * 用法：BASE=<预览地址> DATABASE_URL=<测试库 CRMPREVIEW_DATABASE_URL，主机 ep-empty-river> pnpm dlx tsx scripts/imgcheck-e2e-http.ts --i-know-this-is-not-production
 * 测试数据「验收六-」前缀，跑完按 ID 删（含 Blob 上的测试图片）。
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { del } from '@vercel/blob';
import { getPool } from '@/lib/db/client';
import { handleMediaCheckResult } from '@/lib/crm/mediaCheck';
import { guardNotProduction } from './_guard';

guardNotProduction();
if (!/ep-empty-river/.test(process.env.DATABASE_URL ?? '')) { console.error('只连测试库（ep-empty-river）'); process.exit(1); }
const BASE = (process.env.BASE ?? '').replace(/\/$/, '');
assert.ok(BASE && !/sinoamericanrec\.org/.test(BASE), '只对测试站 / 预览部署跑');
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const P = `验收六-${sfx}`;
const userEmail = `yanshou6-u-${sfx}@example.com`;
const staffEmail = `yanshou6-s-${sfx}@example.com`;
const blobs: string[] = [];
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };

async function call(path: string, o: { token?: string; cookie?: string; body?: unknown; form?: FormData } = {}) {
  const h: Record<string, string> = { 'X-Sarec-Client': 'mp-1.5.0' };
  if (o.token) h.Authorization = 'Bearer ' + o.token;
  if (o.cookie) h.cookie = o.cookie;
  if (o.body !== undefined) h['content-type'] = 'application/json';
  const res = await fetch(BASE + path, { method: o.body !== undefined || o.form ? 'POST' : 'GET', headers: h, body: o.form ?? (o.body !== undefined ? JSON.stringify(o.body) : undefined) });
  const text = await res.text();
  let json: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 200) }; }
  return { status: res.status, json, cookie: res.headers.get('set-cookie')?.match(/sarec_session=([^;]*)/)?.[1] };
}
async function login(email: string, client: 'miniprogram' | 'web') {
  const s = await call('/api/v1/auth/code/send', { body: { channel: 'email', target: email } });
  assert.ok(s.json.devCode, '测试站要 CRM_DEV_ECHO_CODES：' + JSON.stringify(s.json));
  const v = await call('/api/v1/auth/code/verify', { body: { channel: 'email', target: email, code: s.json.devCode, name: `${P}${client === 'web' ? '工作人员' : '用户'}`, client } });
  assert.equal(v.json.ok, true, JSON.stringify(v.json));
  return { id: v.json.data?.contactId ?? v.json.contactId, token: v.json.data?.token ?? v.json.token, cookie: v.cookie ? `sarec_session=${v.cookie}` : undefined };
}
async function jpeg(color: string) {
  return sharp({ create: { width: 640, height: 480, channels: 3, background: color } }).jpeg().toBuffer();
}
async function upload(path: string, token: string, color: string) {
  const f = new FormData();
  f.append('file', new Blob([await jpeg(color)], { type: 'image/jpeg' }), 'a.jpg');
  const r = await call(path, { token, form: f });
  assert.equal(r.json.ok, true, JSON.stringify(r.json));
  return r.json.data ?? r.json;
}
const d = (r: { json: any }) => r.json.data ?? r.json; // eslint-disable-line @typescript-eslint/no-explicit-any

async function main() {
  console.log(`BASE = ${BASE}`);
  await pool.query(`INSERT INTO staff_roles (email, name, roles) VALUES ($1, $2, '{ops}')`, [staffEmail, `${P}工作人员`]);
  const u = await login(userEmail, 'miniprogram');
  const s = await login(staffEmail, 'web');
  assert.ok(u.token && s.cookie);
  const card = d(await call('/api/v1/me/card', { token: u.token }));
  const cardToken = card.card?.token ?? card.token;
  assert.ok(cardToken, '名片 token');

  console.log('1 正常图：项目图传上去，测试站不检测 → 只有本人看得到');
  const up = await upload('/api/v1/me/profile/image', u.token, '#3a7');
  blobs.push(up.url);
  const sv = await call('/api/v1/me/profile/projects', { token: u.token, body: { title: `${P}项目`, body: '测试', images: [up.url] } });
  assert.equal(sv.json.ok, true, JSON.stringify(sv.json));
  assert.equal(d(sv).status, 'checking');
  assert.match(d(sv).message, /检测中/);
  const mine = d(await call('/api/v1/me/profile', { token: u.token }));
  const pj = mine.projects.find((x: { title: string }) => x.title === `${P}项目`);
  assert.equal(pj.status, 'checking');
  assert.match(pj.reason, /图片检测中/);
  let pub = d(await call(`/api/v1/cards/${cardToken}/profile`));
  assert.equal((pub.projects ?? pub.profile?.projects ?? []).length, 0, '别人看不到');
  ok('项目保存后 status=checking，本人看到"图片检测中"，别人的名片页看不到');

  console.log('2 后台：内容管理 / 今天 能看到并一键放行');
  const board = d(await call('/api/v1/staff/content?tab=machine', { cookie: s.cookie }));
  const it = board.items.find((x: { id: string }) => x.id === pj.id);
  assert.ok(it && it.checking, JSON.stringify(board).slice(0, 300));
  assert.match(it.note, /测试站不检测/);
  const today = d(await call('/api/v1/staff/today', { cookie: s.cookie }));
  const tc = (today.items ?? []).find((x: { id: string }) => x.id === `ugc_machine:project:${pj.id}`);
  assert.ok(tc, '今天页有这张卡');
  assert.equal(tc.actions[0].label, '放行');
  const rel = await call(tc.actions[0].endpoint, { cookie: s.cookie, body: tc.actions[0].body });
  assert.equal(rel.json.ok, true, JSON.stringify(rel.json));
  pub = d(await call(`/api/v1/cards/${cardToken}/profile`));
  assert.equal((pub.projects ?? pub.profile?.projects ?? []).length, 1, '放行后别人能看到');
  ok('「内容管理 › 机器拦下的」有这条（写着测试站不检测）；「今天」点"放行"后名片页能看到');

  console.log('3 头像：检测中别人看到旧的，本人看新的；放行后换上');
  const av = await upload('/api/v1/me/avatar', u.token, '#c33');
  blobs.push(av.avatarUrl);
  assert.equal(av.checking, true);
  assert.equal((await pool.query(`SELECT avatar_url FROM contacts WHERE id = $1`, [u.id])).rows[0].avatar_url, null, '别人看到的头像没换');
  const mc = d(await call('/api/v1/me/card', { token: u.token }));
  assert.equal((mc.card ?? mc).avatarUrl, av.avatarUrl, '本人看新头像');
  const b2 = d(await call('/api/v1/staff/content?tab=machine', { cookie: s.cookie }));
  const ai = b2.items.find((x: { kind: string; images: string[] }) => x.kind === 'image' && x.images[0] === av.avatarUrl);
  assert.ok(ai);
  const r3 = await call('/api/v1/staff/content', { cookie: s.cookie, body: { kind: 'image', id: ai.id, action: 'restore' } });
  assert.equal(r3.json.ok, true);
  assert.equal((await pool.query(`SELECT avatar_url FROM contacts WHERE id = $1`, [u.id])).rows[0].avatar_url, av.avatarUrl);
  ok('头像：上传回 checking=true；本人名片接口是新图、别人用的那一格没换；后台放行后换上');

  console.log('4 "不通过"模拟：微信推回 risky → 项目撤下，本人看到原因，同一张图再存当场拒绝');
  const up2 = await upload('/api/v1/me/profile/image', u.token, '#000');
  blobs.push(up2.url);
  const sv2 = await call('/api/v1/me/profile/projects', { token: u.token, body: { title: `${P}项目二`, images: [up2.url] } });
  assert.equal(d(sv2).status, 'checking');
  await pool.query(`UPDATE image_checks SET trace_id = $2 WHERE url = $1`, [up2.url, `trace-${sfx}-risky`]);
  await handleMediaCheckResult(`trace-${sfx}-risky`, 'risky', 20002);
  const mine2 = d(await call('/api/v1/me/profile', { token: u.token }));
  const pj2 = mine2.projects.find((x: { title: string }) => x.title === `${P}项目二`);
  assert.equal(pj2.status, 'rejected');
  assert.match(pj2.reason, /没通过微信内容检测/);
  const again = await call('/api/v1/me/profile/projects', { token: u.token, body: { id: pj2.id, title: `${P}项目二`, images: [up2.url] } });
  assert.equal(again.json.ok, false);
  assert.match(again.json.error.message, /没通过微信内容检测/);
  ok('不通过：撤下 + 原因；再用这张图保存当场拒绝（大白话）');

  console.log('5 "出错"：接收推送的路由没配 Token 只回 403，不影响别的接口');
  const push = await call('/api/v1/wx/push?signature=x&timestamp=1&nonce=1&echostr=hi');
  assert.equal(push.status, 403);
  const health = await call('/api/v1/clubs');
  assert.equal(health.status, 200);
  ok('没配 WX_PUSH_TOKEN：/api/v1/wx/push 回 403；俱乐部等接口照常');

  console.log(`\n全部通过：${passed} 项`);
}

async function cleanup() {
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM contacts WHERE email IN ($1, $2) OR name LIKE $3`, [userEmail, staffEmail, `${P}%`]);
  const ids = rows.map((r) => r.id);
  await pool.query(`DELETE FROM ugc_actions WHERE target_id IN (SELECT id::text FROM profile_projects WHERE contact_id = ANY($1::uuid[])) OR target_id IN (SELECT id::text FROM image_checks WHERE contact_id = ANY($1::uuid[])) OR target_id = ANY($1::text[]) OR note LIKE $2 OR actor = $3`, [ids, `trace-${sfx}%`, `${P}工作人员`]);
  await pool.query(`DELETE FROM image_checks WHERE contact_id = ANY($1::uuid[])`, [ids]);
  await pool.query(`DELETE FROM profile_projects WHERE contact_id = ANY($1::uuid[])`, [ids]);
  await pool.query(`DELETE FROM member_cards WHERE contact_id = ANY($1::uuid[])`, [ids]);
  await pool.query(`DELETE FROM staff_roles WHERE email = $1`, [staffEmail]);
  for (const id of ids) {
    // 和这个测试身份有关的其他行（登录码、会话、访问记录等）：按外键逐个表删
    const { rows: fks } = await pool.query<{ t: string; c: string }>(
      `SELECT tc.table_name AS t, kcu.column_name AS c FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'contacts' AND ccu.column_name = 'id'`
    );
    for (const f of fks) await pool.query(`DELETE FROM ${f.t} WHERE ${f.c} = $1`, [id]).catch(() => undefined);
    await pool.query(`DELETE FROM contacts WHERE id = $1`, [id]).catch((e) => console.error('联系人没删掉', id, e.message));
  }
  await pool.query(`DELETE FROM login_codes WHERE target IN ($1, $2)`, [userEmail, staffEmail]).catch(() => undefined);
  for (const b of blobs) await del(b).catch(() => undefined);
  console.log(`清理：联系人 ${ids.length} 个、图片 ${blobs.length} 张`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await cleanup().catch((e) => console.error('清理出错', e)); await pool.end(); });
