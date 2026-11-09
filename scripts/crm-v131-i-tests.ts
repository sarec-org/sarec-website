/**
 * 1.3.1 I 共用触达记录 + 频率控制 —— 回归测试（测试库）。只建 DEV131- 数据，按 ID 清理。
 * 用法：DATABASE_URL=<测试库> pnpm dlx tsx scripts/crm-v131-i-tests.ts --i-know-this-is-not-production
 */
import assert from 'node:assert/strict';
import { getPool } from '@/lib/db/client';
import { guardNotProduction } from './_guard';
guardNotProduction();
const pool = getPool();
const made: string[] = [];
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };
async function main() {
  const t = await import('@/lib/crm/touch');
  const { rows } = await pool.query<{ id: string }>(`INSERT INTO contacts (name, email, acquisition_source) VALUES ('DEV131-触达', 'dev131-touch@example.com', 'test') RETURNING id`);
  const c = rows[0].id;
  made.push(c);
  assert.equal(await t.touchedToday(pool, c, 'photos'), false);
  ok('今天没收到过任何推送 → 照片通知照常推');
  await t.recordTouch(pool, c, 'reminder', 'wx', true);
  assert.equal(await t.touchedToday(pool, c, 'photos'), true);
  assert.equal(await t.touchedToday(pool, c, 'reminder'), false);
  ok('今天已经收到开课提醒 → 照片通知不再推（改首页显示）；同类型不算');
  await pool.query(`UPDATE contact_touches SET created_at = now() - interval '25 hours' WHERE contact_id = $1`, [c]);
  assert.equal(await t.touchedToday(pool, c, 'photos'), false);
  ok('超过 24 小时恢复正常');
  console.log(`\n全部通过：${passed} 项`);
}
main()
  .catch((e) => { console.error('✗ 失败：', e); process.exitCode = 1; })
  .finally(async () => {
    await pool.query(`DELETE FROM contact_touches WHERE contact_id = ANY($1::uuid[])`, [made]).catch(() => undefined);
    await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[])`, [made]).catch(() => undefined);
    await pool.end();
  });
