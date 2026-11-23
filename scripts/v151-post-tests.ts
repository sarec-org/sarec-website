/**
 * 1.5.1 指令 46：小程序里直接填「发布活儿」——接口自测（只连测试库 / 本机服务）。
 *   BASE=http://localhost:3151 DATABASE_URL=<测试库> pnpm dlx tsx scripts/v151-post-tests.ts --i-know-this-is-not-production
 * 测试数据：名字「验收八-」开头、手机号用 555 虚构号；收尾按 ID 删干净，开关 jobs_post_in_app 恢复成跑之前的样子（原来没有记录就删掉 = 默认新方式）。
 * 不建接活人（名字带「验收」的接活人会被当成测试身份真发短信），派活只会碰到「演示-」接活人，测试站对他们一律不发（blocked）。
 */
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { guardNotProduction } from './_guard';

guardNotProduction();
const BASE = (process.env.BASE || 'http://localhost:3151').replace(/\/$/, '');
const pool = getPool();
const MP = { 'X-Sarec-Client': 'mp-1.5.1' };
const uniq = randomBytes(3).toString('hex');
const contacts: string[] = [];
const staffEmails: string[] = [];
const staffActors: string[] = [];
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };

async function freePhone(): Promise<string> {
  for (let i = 0; i < 100; i++) {
    const p = `+1949555${String(100 + Math.floor(Math.random() * 100)).padStart(4, '0')}`;
    if (!(await pool.query(`SELECT 1 FROM contacts WHERE phone_e164 = $1`, [p])).rows[0]) return p;
  }
  throw new Error('没有空的 555 测试号');
}
async function person(name: string, opts: { phone?: boolean; staff?: boolean } = {}) {
  const email = `v151-${uniq}-${contacts.length}@example.com`;
  const phone = opts.phone ? await freePhone() : null;
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO contacts (name, email, email_verified_at, phone_e164, phone_verified_at, acquisition_source)
     VALUES ($1, $2, now(), $3, CASE WHEN $3::text IS NULL THEN NULL ELSE now() END, 'test') RETURNING id`,
    [`验收八-${name}`, email, phone]
  );
  const id = rows[0].id;
  contacts.push(id);
  if (opts.staff) {
    const staffName = `验收八-${name}-${uniq}`;
    await pool.query(`INSERT INTO staff_roles (email, name, roles) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`, [email, staffName, ['admin']]);
    staffEmails.push(email);
    staffActors.push(`staff:${staffName}`, `staff:${email}`);
  }
  const token = randomBytes(32).toString('base64url');
  await pool.query(`INSERT INTO sessions (token_hash, contact_id, channel, expires_at) VALUES ($1, $2, 'web', now() + interval '1 day')`, [
    createHash('sha256').update(token, 'utf8').digest('hex'), id
  ]);
  return { id, token, phone };
}
type Res = { status: number; j: Record<string, any> };
async function call(method: string, path: string, who?: { token: string } | null, b?: unknown, headers: Record<string, string> = {}): Promise<Res> {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers: { ...(b ? { 'Content-Type': 'application/json' } : {}), ...(who ? { Authorization: `Bearer ${who.token}` } : {}), ...headers },
    body: b ? JSON.stringify(b) : undefined
  });
  return { status: res.status, j: (await res.json().catch(() => ({}))) as Record<string, any> };
}

let savedSetting: { value: unknown } | null | undefined;

async function main() {
  const { rows: s0 } = await pool.query<{ value: unknown }>(`SELECT value FROM crm_settings WHERE key = 'jobs_post_in_app'`);
  savedSetting = s0[0] ?? null;

  const noPhone = await person('没验证手机');
  const poster = await person('客户', { phone: true });
  const other = await person('路人', { phone: true });
  const staff = await person('工作人员', { staff: true });

  // 挑一个有「演示-」接活人的工种 + 城市（派活能看到通知了几位）；没有就用第一个开放工种 + 第一个城市
  const { rows: pick } = await pool.query<{ trade: string; city: string }>(
    `SELECT t AS trade, c AS city FROM jobs_pros p, unnest(p.verified_trades) t, unnest(p.cities) c
      WHERE p.listed AND p.role <> 'worker' LIMIT 1`
  );
  let meta = await call('GET', '/jobs/meta', poster, undefined, MP);
  assert.equal(meta.status, 200);
  assert.equal(meta.j.postMode, 'in_app');
  ok('meta.postMode 默认 in_app（后台没设过开关 = 新方式）');
  const trade = pick[0]?.trade ?? meta.j.trades.find((t: any) => t.open && !t.noPost).key;
  const city = pick[0]?.city ?? meta.j.cities[0].items[0].key;

  let r = await call('GET', '/jobs/requests', noPhone, undefined, MP);
  assert.equal(r.status, 200);
  assert.equal(r.j.phone, null);
  assert.equal(r.j.mode, 'in_app');
  r = await call('POST', '/jobs/requests', noPhone, { trade, cityKey: city, description: '厨房水龙头漏水，想这周修好' }, MP);
  assert.equal(r.status, 400);
  assert.equal(r.j.error.code, 'need_phone');
  ok('没验证手机：表单 phone=null；交 → 400 need_phone（小程序去验证手机页）');

  r = await call('GET', '/jobs/requests', poster, undefined, MP);
  assert.equal(r.j.phone, poster.phone);
  ok('已验证手机：表单自动带出');

  r = await call('POST', '/jobs/requests', poster, { trade, description: '修水龙头' }, MP);
  assert.equal(r.status, 400);
  r = await call('POST', '/jobs/requests', poster, { trade, cityKey: city, description: ' ' }, MP);
  assert.equal(r.status, 400);
  r = await call('POST', '/jobs/requests', poster, { trade: 'no_such', cityKey: city, description: '修水龙头' }, MP);
  assert.equal(r.status, 400);
  ok('少城市 / 一句话空 / 工种不存在 → 400 人话');

  r = await call('POST', '/jobs/requests', poster, { trade, cityKey: city, description: '验收八 厨房水龙头漏水，想这周修好' }, MP);
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.equal(r.j.message, '收到了，商会会帮你联系合适的师傅');
  const id1 = r.j.id as string;
  const { rows: p1 } = await pool.query<{ status: string; source: string; phone: string; sec_status: string }>(`SELECT status, source, phone, sec_status FROM jobs_posts WHERE id = $1`, [id1]);
  assert.equal(p1[0].status, 'pending');
  assert.equal(p1[0].source, 'mp');
  assert.equal(p1[0].phone, poster.phone);
  ok(`交上来：status=pending、source=mp、带已验证手机；内容检测=${p1[0].sec_status}（测试站没微信密钥 = unchecked）`);

  // 没公开：网站列表没有，别人看详情 404，本人能看
  r = await call('GET', '/jobs/posts?limit=50');
  assert.ok(!r.j.items.some((x: any) => x.id === id1));
  r = await call('GET', `/jobs/posts/${id1}`, other);
  assert.equal(r.status, 404);
  r = await call('GET', `/jobs/posts/${id1}`, poster);
  assert.equal(r.status, 200);
  assert.equal(r.j.post.statusLabel, '商会在看');
  r = await call('GET', '/jobs/posts', poster, undefined, MP);
  assert.equal(r.status, 404);
  ok('不公开：网站「全部活儿」没有、别人看不到、本人看到「商会在看」；小程序照旧拿不到任何活儿列表');

  // 本人不能绕过工作人员自己改成找人中
  r = await call('PATCH', `/jobs/posts/${id1}`, poster, { status: 'open' });
  assert.equal(r.status, 409);
  ok('本人不能自己把「商会在看」改成找人中（409）');

  // 后台：今天 + 活儿列表
  r = await call('GET', '/staff/today', staff);
  assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300));
  const item = r.j.items.find((x: any) => x.id === `jobs_request:${id1}`);
  assert.ok(item, '「今天」里有这一条');
  assert.equal(item.actions[0].label, '派给师傅');
  ok(`「今天」里有：${item.title}（按钮：${item.actions.map((a: any) => a.label).join(' / ')}）`);
  r = await call('GET', '/workbench/jobs/posts?status=pending', staff);
  const row = r.j.items.find((x: any) => x.id === id1);
  assert.ok(row?.fromMp && row.description.includes('水龙头') && row.phone === poster.phone);
  ok('找工人后台「活儿 › 小程序交来·待派」：带原话和电话');

  r = await call('POST', `/workbench/jobs/posts/${id1}`, staff, { action: 'approve' });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.equal(r.j.post.status, 'open');
  const { rows: p2 } = await pool.query<{ sec_status: string; sec_note: string; n: number }>(
    `SELECT sec_status, sec_note, (SELECT count(*)::int FROM jobs_notifications WHERE post_id = $1 AND kind = 'dispatch') AS n FROM jobs_posts WHERE id = $1`, [id1]
  );
  assert.equal(p2[0].sec_status, 'pass');
  const { rows: sent } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM jobs_notifications WHERE post_id = $1 AND status = 'sent'`, [id1]);
  assert.equal(sent[0].n, 0, '测试站对演示接活人不真发');
  ok(`派给师傅 → 找人中；人工看过记 pass（${p2[0].sec_note}）；派活 ${p2[0].n} 位（${r.j.message}；测试站一条都没真发）`);
  r = await call('POST', `/workbench/jobs/posts/${id1}`, staff, { action: 'approve' });
  assert.equal(r.status, 409);
  r = await call('GET', '/jobs/posts?limit=50');
  assert.ok(!r.j.items.some((x: any) => x.id === id1));
  ok('重复派 409；派了以后网站公开列表照样不列（只通知对口的人）');

  // 不派
  r = await call('POST', '/jobs/requests', poster, { trade, cityKey: city, description: '验收八 第二条：门锁坏了' }, MP);
  const id2 = r.j.id as string;
  r = await call('POST', `/workbench/jobs/posts/${id2}`, staff, { action: 'remove', note: '验收八 不派' });
  assert.equal(r.j.post.status, 'removed');
  const { rows: n2 } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM jobs_notifications WHERE post_id = $1`, [id2]);
  assert.equal(n2[0].n, 0);
  ok('不派 → 下架，一个人都不通知');

  // 开关切回老方式
  r = await call('PATCH', '/workbench/jobs/switches', staff, { postInApp: false });
  assert.equal(r.status, 200);
  assert.equal(r.j.switches.postInApp, false);
  meta = await call('GET', '/jobs/meta', poster, undefined, MP);
  assert.equal(meta.j.postMode, 'sheet');
  r = await call('POST', '/jobs/requests', poster, { trade, cityKey: city, description: '验收八 第三条' }, MP);
  assert.equal(r.status, 403);
  assert.equal(r.j.error.code, 'not_open');
  r = await call('GET', '/workbench/jobs/switches', staff);
  assert.ok(r.j.log.some((x: any) => x.key === 'jobs_post_in_app' && x.after === false));
  ok('后台切回老方式：meta.postMode=sheet、小程序交 → 403（小程序照旧弹「加商会微信＋复制网址」）；操作记录有这一条');
  r = await call('PATCH', '/workbench/jobs/switches', staff, { postInApp: true });
  meta = await call('GET', '/jobs/meta', poster, undefined, MP);
  assert.equal(meta.j.postMode, 'in_app');
  ok('改回新方式：马上生效');

  // 一天最多 5 条
  for (let i = 0; i < 4; i++) await call('POST', '/jobs/requests', other, { trade, cityKey: city, description: `验收八 限次 ${i}` }, MP);
  r = await call('POST', '/jobs/requests', other, { trade, cityKey: city, description: '验收八 限次 4' }, MP);
  assert.equal(r.status, 200);
  r = await call('POST', '/jobs/requests', other, { trade, cityKey: city, description: '验收八 限次 5' }, MP);
  assert.equal(r.status, 429);
  ok('同一人一天最多交 5 条，第 6 条 429 人话');

  console.log(`\n全部通过：${passed} 项`);
}

main()
  .catch((e) => { console.error('✗ 失败：', e); process.exitCode = 1; })
  .finally(async () => {
    const ids = contacts;
    await pool.query(`DELETE FROM ops_exceptions WHERE ref IN (SELECT id::text FROM jobs_posts WHERE contact_id = ANY($1::uuid[]))`, [ids]).catch((e) => console.error(e.message));
    await pool.query(`DELETE FROM jobs_notifications WHERE post_id IN (SELECT id FROM jobs_posts WHERE contact_id = ANY($1::uuid[]))`, [ids]).catch((e) => console.error(e.message));
    await pool.query(`DELETE FROM crm_audit_log WHERE target_type = 'jobs_post' AND target_id IN (SELECT id::text FROM jobs_posts WHERE contact_id = ANY($1::uuid[]))`, [ids]).catch(() => undefined);
    await pool.query(`DELETE FROM jobs_posts WHERE contact_id = ANY($1::uuid[])`, [ids]).catch((e) => console.error(e.message));
    await pool.query(`DELETE FROM crm_audit_log WHERE actor = ANY($1::text[])`, [staffActors]).catch(() => undefined);
    await pool.query(`DELETE FROM track_events WHERE contact_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
    await pool.query(`DELETE FROM sessions WHERE contact_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
    await pool.query(`DELETE FROM staff_roles WHERE email = ANY($1)`, [staffEmails]).catch(() => undefined);
    await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[])`, [ids]).catch((e) => console.error('contacts', e.message));
    if (savedSetting === null) await pool.query(`DELETE FROM crm_settings WHERE key = 'jobs_post_in_app'`).catch(() => undefined);
    else if (savedSetting) await pool.query(`UPDATE crm_settings SET value = $1 WHERE key = 'jobs_post_in_app'`, [JSON.stringify(savedSetting.value)]).catch(() => undefined);
    await pool.end();
  });
