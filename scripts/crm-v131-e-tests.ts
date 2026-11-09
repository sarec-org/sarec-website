/**
 * 1.3.1 E 分地区 —— 回归测试（测试库）。只建 DEV131- 数据，按 ID 清理。
 * 用法：DATABASE_URL=<测试库> pnpm dlx tsx scripts/crm-v131-e-tests.ts --i-know-this-is-not-production
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { guardNotProduction } from './_guard';
guardNotProduction();
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const made = { c: [] as string[], e: [] as string[] };
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };
async function person(tag: string, extra = '') {
  const { rows } = await pool.query<{ id: string }>(`INSERT INTO contacts (name, email, acquisition_source) VALUES ($1, $2, 'test') RETURNING id`, [`DEV131-${tag}`, `dev131-${sfx}-${tag}@example.com`]);
  if (extra) await pool.query(`UPDATE contacts SET ${extra} WHERE id = $1`, [rows[0].id]);
  made.c.push(rows[0].id); return rows[0].id;
}
async function event(tag: string, region: string, scope = 'local', regions: string[] = []) {
  const { rows } = await pool.query<{ id: string }>(`INSERT INTO events (slug, title, starts_at, region, notify_scope, notify_regions, is_listed) VALUES ($1, $2, now() - interval '10 days', $3, $4, $5, false) RETURNING id`, [`dev131d-${tag}-${sfx}`, `DEV131-${tag}`, region, scope, regions]);
  made.e.push(rows[0].id); return rows[0].id;
}
async function main() {
  const rg = await import('@/lib/crm/regions');
  const la = await person('la'); const ny = await person('ny', `region_self = '纽约'`); const fan = await person('fan', `focus_regions = '{纽约}'`);
  const e1 = await event('la1', '洛杉矶/橙县'); const e2 = await event('la2', '洛杉矶/橙县'); const e3 = await event('ny1', '纽约');
  const trav = await person('trav');
  for (const e of [e1, e2, e3]) await pool.query(`INSERT INTO registrations (event_id, contact_id) VALUES ($1, $2)`, [e, trav]);
  await pool.query(`INSERT INTO registrations (event_id, contact_id) VALUES ($1, $2)`, [e3, ny]);
  await rg.inferRegions();
  assert.equal((await rg.regionOf(trav)).region, '洛杉矶/橙县');
  assert.equal((await rg.regionOf(trav)).source, 'inferred');
  assert.equal((await rg.regionOf(ny)).source, 'self');
  ok('没填的按去过最多的地区推断（参加一次外地活动不改常驻地）；本人填写的优先，分开存');
  const nyEv = await event('ny2', '纽约');
  const aud = await rg.promoAudience(nyEv);
  assert.ok(aud.includes(ny) && aud.includes(fan) && !aud.includes(la) && !aud.includes(trav));
  ok('纽约的活动只推纽约常驻和关注纽约的人');
  const all = await event('summit', '洛杉矶/橙县', 'all');
  const a2 = await rg.promoAudience(all);
  assert.ok([la, ny, fan, trav].every((x) => a2.includes(x)));
  ok('高峰论坛（全部地区）推所有人');
  const multi = await event('multi', '洛杉矶/橙县', 'regions', ['纽约']);
  const a3 = await rg.promoAudience(multi);
  assert.ok(a3.includes(ny) && a3.includes(la));
  ok('指定几个地区：本地区 + 指定地区');
  const { audience } = await import('@/lib/crm/newsletter');
  await pool.query(`UPDATE contacts SET email_verified_at = now() WHERE id = ANY($1::uuid[])`, [made.c]);
  const nl = await audience({ regions: ['纽约'] });
  const mine = nl.filter((r) => r.email.includes(sfx)).map((r) => r.contactId);
  assert.ok(mine.includes(ny) && mine.includes(fan) && !mine.includes(la));
  ok('邮件通讯按地区筛选（常驻 + 关注）');
  assert.equal(rg.tzLabel('America/New_York'), '纽约时间');
  ok('活动时间注明当地时区');
  console.log(`\n全部通过：${passed} 项`);
}
async function cleanup() {
  await pool.query(`DELETE FROM registrations WHERE event_id = ANY($1::uuid[])`, [made.e]);
  await pool.query(`DELETE FROM contact_methods WHERE contact_id = ANY($1::uuid[])`, [made.c]);
  await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[])`, [made.c]);
  await pool.query(`DELETE FROM events WHERE id = ANY($1::uuid[])`, [made.e]);
  console.log('清理完成');
}
main().catch((e) => { console.error('✗ 失败：', e); process.exitCode = 1; }).finally(async () => { await cleanup().catch((e) => console.error('清理出错', e)); await pool.end(); });
