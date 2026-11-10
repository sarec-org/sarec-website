/**
 * 活动“签到开始时间”（东哥 11/9 晚）—— 回归测试（测试库）。只建 DEV131- 数据，按 ID 清理。
 * 用法：DATABASE_URL=<测试库> pnpm dlx tsx scripts/crm-checkin-start-tests.ts --i-know-this-is-not-production
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { guardNotProduction } from './_guard';
guardNotProduction();
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const made = { e: [] as string[] };
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };

async function main() {
  const { checkinAt, checkinLine } = await import('@/lib/crm/checkinTime');
  const { createEvent, updateEvent } = await import('@/lib/crm/staff');
  const { publicEvent } = await import('@/lib/crm/flow');
  const admin = { contactId: '00000000-0000-0000-0000-000000000000', email: 'dev131-admin@example.com', name: 'DEV131-管理员', roles: ['admin'] as 'admin'[] };

  // 11/13 下午 2:00（洛杉矶，冬令时 UTC-8）
  const start = '2026-11-13T22:00:00.000Z';
  assert.equal(checkinAt({ starts_at: start }).toISOString(), '2026-11-13T21:30:00.000Z');
  assert.equal(checkinLine({ starts_at: start }, 'America/Los_Angeles'), '下午 1:30 签到 · 2:00 开始');
  assert.equal(checkinLine({ starts_at: '2026-11-13T19:30:00.000Z', checkin_starts_at: '2026-11-13T19:00:00.000Z' }, 'America/Los_Angeles'), '上午 11:00 签到 · 11:30 开始');
  assert.equal(checkinLine({ starts_at: '2026-11-13T20:15:00.000Z', checkin_starts_at: '2026-11-13T19:45:00.000Z' }, 'America/Los_Angeles'), '上午 11:45 签到 · 下午 12:15 开始');
  ok('没填签到时间 = 开始前 30 分钟；写法“下午 1:30 签到 · 2:00 开始”，跨上午 / 下午时两个都写');

  const ev = await createEvent(admin, { title: `DEV131-签到时间 ${sfx}`, startsAt: start, region: '洛杉矶/橙县', listed: false });
  made.e.push(ev.id);
  let row = (await pool.query(`SELECT * FROM events WHERE id = $1`, [ev.id])).rows[0];
  assert.equal(row.checkin_starts_at, null);
  assert.equal(publicEvent(row).checkinLine, '下午 1:30 签到 · 2:00 开始');
  ok('已有活动 / 没填签到时间的：对外按开始前 30 分钟显示');

  await updateEvent(admin, ev.id, { checkinStartsAt: '2026-11-13T21:15:00.000Z' });
  row = (await pool.query(`SELECT * FROM events WHERE id = $1`, [ev.id])).rows[0];
  assert.equal(new Date(row.checkin_starts_at).toISOString(), '2026-11-13T21:15:00.000Z');
  assert.equal(publicEvent(row).checkinLine, '下午 1:15 签到 · 2:00 开始');
  await assert.rejects(updateEvent(admin, ev.id, { checkinStartsAt: '2026-11-13T22:30:00.000Z' }), /签到开始时间不能晚于活动开始时间/);
  await assert.rejects(updateEvent(admin, ev.id, { startsAt: '2026-11-13T21:00:00.000Z' }), /签到开始时间不能晚于活动开始时间/);
  await updateEvent(admin, ev.id, { checkinStartsAt: null });
  row = (await pool.query(`SELECT * FROM events WHERE id = $1`, [ev.id])).rows[0];
  assert.equal(row.checkin_starts_at, null);
  ok('后台可改签到时间；不能晚于开始；清空后回到默认前 30 分钟');
  console.log(`\n全部通过：${passed} 项`);
}
async function cleanup() {
  await pool.query(`DELETE FROM crm_audit_log WHERE target_id = ANY($1::text[]) OR actor = 'staff:DEV131-管理员'`, [made.e]);
  await pool.query(`DELETE FROM event_prep_items WHERE event_id = ANY($1::uuid[])`, [made.e]).catch(() => undefined);
  await pool.query(`DELETE FROM event_prep WHERE event_id = ANY($1::uuid[])`, [made.e]).catch(() => undefined);
  await pool.query(`DELETE FROM events WHERE id = ANY($1::uuid[])`, [made.e]);
  console.log('清理完成');
}
main()
  .catch((e) => { console.error('✗ 失败：', e); process.exitCode = 1; })
  .finally(async () => { await cleanup().catch((e) => console.error('清理出错', e)); await pool.end(); });
