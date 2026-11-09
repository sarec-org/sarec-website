/**
 * 1.3.1 G 首页 —— 回归测试（测试库）。用“其他”地区隔离本测试的活动，只建 DEV131- 数据，按 ID 清理。
 * 用法：DATABASE_URL=<测试库> pnpm dlx tsx scripts/crm-v131-g-tests.ts --i-know-this-is-not-production
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { guardNotProduction } from './_guard';
guardNotProduction();
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const R = '其他';
const made = { c: [] as string[], e: [] as string[] };
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };
async function event(tag: string, inH: number, extra: Record<string, unknown> = {}) {
  const s = new Date(Date.now() + inH * 3600e3);
  const base: Record<string, unknown> = { slug: `dev131d-${tag}-${sfx}`, title: `DEV131-${tag}`, starts_at: s, ends_at: new Date(s.getTime() + 3 * 3600e3), region: R, capacity: 30, ...extra };
  const cols = Object.keys(base);
  const vals = Object.values(base);
  const { rows } = await pool.query<{ id: string }>(`INSERT INTO events (${cols.join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) RETURNING id`, vals);
  made.e.push(rows[0].id);
  return rows[0].id;
}
async function main() {
  const { home131, dayWord, clock } = await import('@/lib/crm/home131');
  const nat = (await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM events WHERE is_listed AND event_status = 'scheduled' AND (notify_scope = 'all' OR region = $1) AND coalesce(ends_at, starts_at + interval '3 hours') > now()`, [R])).rows[0].n;
  const ph = (await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM events WHERE is_listed AND album_published_at IS NOT NULL AND coalesce(ends_at, starts_at + interval '3 hours') > now() - interval '7 days'`)).rows[0].n;
  if (!nat && !ph) {
    const h0 = await home131(null, { region: R });
    assert.deepEqual(h0.carousel.map((s) => s.kind).sort(), ['intro', 'join']);
    ok('没有活动：品牌态，轮播只有“加入商会”和商会介绍');
  } else console.log('  · 测试库里已有别人的活动 / 照片，跳过品牌态检查');
  const a = await event('a', 24 * 5);
  const b = await event('b', 24 * 6);
  const c = await event('c', 24 * 7);
  const h1 = await home131(null, { region: R });
  assert.ok(h1.carousel.filter((s) => s.kind === 'event').length <= 2);
  assert.ok(h1.carousel.length <= 5);
  assert.ok(!JSON.stringify(h1).match(/已报\s*\d+\s*人|\$\d|美元|付款/));
  assert.ok(h1.upcoming.length >= 3);
  assert.ok(h1.upcoming.every((u) => u.seat === null || ['名额充足', '所剩不多', '已满可候补'].includes(u.seat)));
  ok('活动最多 2 张；最多 5 张；没有金额、付款、“已报 N 人”；近期活动只给名额状态');
  await event('ny', 24 * 8, { region: '纽约' });
  const hny = await home131(null, { region: R });
  assert.ok(hny.elsewhere.some((x) => x.line.startsWith('纽约 · ')));
  assert.ok(!hny.upcoming.some((u) => u.slug.includes('-ny-')));
  ok('外地活动进公告区（纽约 · M 月 D 日 · 标题），不进近期活动');
  const { rows: me } = await pool.query<{ id: string }>(`INSERT INTO contacts (name, email, acquisition_source, region_self) VALUES ('DEV131-首页', $1, 'test', $2) RETURNING id`, [`dev131-${sfx}@example.com`, R]);
  made.c.push(me[0].id);
  await pool.query(`INSERT INTO registrations (event_id, contact_id, confirm_status) VALUES ($1, $2, 'none')`, [c, me[0].id]);
  const h2 = await home131(me[0].id);
  assert.equal(h2.todo.kind, 'registered');
  assert.equal(h2.carousel[0].key, `event:${c}`);
  assert.match(h2.carousel[0].eyebrow, /^我报名的/);
  ok('已报名：待办卡显示已报名；轮播第一张是本人已报名的临近活动');
  await pool.query(`UPDATE registrations SET confirm_status = 'asked' WHERE event_id = $1 AND contact_id = $2`, [c, me[0].id]);
  const h3 = await home131(me[0].id);
  assert.equal(h3.todo.kind, 'confirm');
  assert.match(String(h3.todo.title), /您来吗？$/);
  assert.match(String(h3.todo.sub), /前确认，过时名额让给候补/);
  assert.ok(!h3.carousel.some((s) => s.key === `event:${c}`));
  ok('需要确认出席：待办卡展开“…您来吗？”+ 我来 / 去不了；轮播不再重复这一场');
  await pool.query(`INSERT INTO home_slides (action, target, expires_at, created_by) VALUES ('hide', $1, now() + interval '1 day', 'staff:DEV131')`, [`event:${a}`]);
  await pool.query(`INSERT INTO home_slides (action, target, title, expires_at, created_by) VALUES ('pin', 'join', 'DEV131 置顶入会', now() + interval '1 day', 'staff:DEV131')`);
  await pool.query(`INSERT INTO home_slides (action, target, expires_at, created_by) VALUES ('hide', 'join', now() - interval '1 minute', 'staff:DEV131')`);
  const h4 = await home131(null, { region: R });
  assert.ok(!h4.carousel.some((s) => s.key === `event:${a}`));
  assert.equal(h4.carousel[0].key, 'join');
  assert.equal(h4.carousel[0].title, 'DEV131 置顶入会');
  ok('后台：隐藏、置顶 + 改文案生效；过了截止时间的设置自动失效');
  await pool.query(`UPDATE events SET event_status = 'cancelled' WHERE id = $1`, [b]);
  await pool.query(`INSERT INTO home_slides (action, target, expires_at, created_by) VALUES ('pin', $1, now() + interval '1 day', 'staff:DEV131')`, [`event:${b}`]);
  const h5 = await home131(null, { region: R });
  assert.ok(!h5.carousel.some((s) => s.key === `event:${b}`));
  ok('活动取消优先于手动置顶');
  const now = new Date('2026-11-08T20:00:00Z');
  assert.equal(dayWord(new Date('2026-11-09T22:00:00Z'), 'America/Los_Angeles', now), '明天');
  assert.equal(clock(new Date('2026-11-09T22:00:00Z'), 'America/Los_Angeles'), '下午 2:00');
  ok('时间写法：明天 · 下午 2:00（按活动所在地时区）');
  console.log(`\n全部通过：${passed} 项`);
}
async function cleanup() {
  await pool.query(`DELETE FROM home_slides WHERE created_by = 'staff:DEV131'`);
  await pool.query(`DELETE FROM registrations WHERE event_id = ANY($1::uuid[])`, [made.e]);
  await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[])`, [made.c]);
  await pool.query(`DELETE FROM events WHERE id = ANY($1::uuid[])`, [made.e]);
  console.log('清理完成');
}
main()
  .catch((e) => { console.error('✗ 失败：', e); process.exitCode = 1; })
  .finally(async () => { await cleanup().catch((e) => console.error('清理出错', e)); await pool.end(); });
