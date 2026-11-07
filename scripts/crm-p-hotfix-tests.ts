/**
 * 1.2 线上问题 P-1/P-2/P-3 回归（测试库）：已结束活动不在报名列表、不能报名、不能邀请；首页优先未结束的活动；会议室地址与说明。
 * 只建 DEV13- 测试数据，结束按 ID 删除。
 * 用法：DATABASE_URL=<测试库> pnpm dlx tsx scripts/crm-p-hotfix-tests.ts --i-know-this-is-not-production
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { isEventOver, listEvents, previewRegistration } from '@/lib/crm/flow';
import { posterData } from '@/lib/crm/cards';
import { homeData } from '@/lib/crm/growth';
import { roomsInfo, ROOM_NOTICE_MP } from '@/lib/crm/staff12';
import { guardNotProduction } from './_guard';

guardNotProduction();
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const made = { events: [] as string[], contacts: [] as string[] };
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };

async function main() {
  assert.equal((await pool.query(`SELECT 1 FROM events WHERE slug = '2026-11-07-event-e641'`)).rows.length, 0, '正式库，停止');
  const mkEv = async (tag: string, startH: number, durH: number | null) => {
    const s = new Date(Date.now() + startH * 3600e3);
    const { rows } = await pool.query<{ id: string; slug: string }>(
      `INSERT INTO events (slug, title, starts_at, ends_at, fee_cents, capacity) VALUES ($1, $2, $3, $4, 0, 50) RETURNING id, slug`,
      [`dev13-p-${tag}-${sfx}`, `DEV13-P-${tag}-${sfx}`, s, durH == null ? null : new Date(s.getTime() + durH * 3600e3)]
    );
    made.events.push(rows[0].id);
    return rows[0];
  };
  const ended = await mkEv('ended', -5, 2);        // 3 小时前结束
  const noEnd = await mkEv('noend', -4, null);     // 没填结束时间，开始 4 小时前 → 按 3 小时算已结束
  const live = await mkEv('live', -1, 3);          // 正在进行
  const soon = await mkEv('soon', 48, 2);          // 两天后

  const up = (await listEvents(false)).map((e) => e.slug);
  assert.ok(!up.includes(ended.slug) && !up.includes(noEnd.slug), '已结束的不在报名列表');
  assert.ok(up.includes(live.slug) && up.includes(soon.slug), '进行中和未开始的在');
  const past = (await listEvents(true)).map((e) => e.slug);
  assert.ok(past.includes(ended.slug) && past.includes(noEnd.slug) && !past.includes(soon.slug) && !past.includes(live.slug));
  ok('活动列表：已结束的移到往期，进行中 / 未开始的在报名列表');

  const { rows: c } = await pool.query<{ id: string }>(`INSERT INTO contacts (name, acquisition_source) VALUES ($1, 'test') RETURNING id`, [`DEV13-P-${sfx}`]);
  made.contacts.push(c[0].id);
  const pv = await previewRegistration(ended.slug, c[0].id);
  assert.equal(pv.event.status, 'completed');
  assert.equal(pv.event.registrationOpen, false);
  const pvLive = await previewRegistration(live.slug, c[0].id);
  assert.equal(pvLive.event.status, 'scheduled');
  assert.equal(pvLive.event.registrationOpen, true);
  const { rows: er } = await pool.query(`SELECT starts_at, ends_at, event_status FROM events WHERE id = $1`, [ended.id]);
  assert.equal(isEventOver(er[0]), true);
  ok('活动页：已结束显示“已结束”、报名关闭（报名接口也拦）；进行中的照常');

  await assert.rejects(posterData(c[0].id, ended.slug, 'https://x.test'), /已经结束/);
  await assert.rejects(posterData(c[0].id, noEnd.slug, 'https://x.test'), /已经结束/);
  ok('已结束的活动不能生成邀请海报');

  // 我报了已结束的那场，同时有未结束的活动 → 首页大卡片和邀请指向未结束的
  await pool.query(`INSERT INTO registrations (event_id, contact_id, status) VALUES ($1, $2, 'registered')`, [ended.id, c[0].id]);
  const h = await homeData(c[0].id, { base: 'https://x.test', withQr: false });
  const st = h.status as { phase: string; event: { slug: string } | null };
  assert.notEqual(st.phase, 'ended');
  assert.ok(st.event && st.event.slug !== ended.slug && st.event.slug !== noEnd.slug, '首页不指向已结束的活动');
  ok('首页：我报的那场已结束、有未结束活动时，大卡片和“邀请好友”指向未结束的活动');

  const info = await roomsInfo();
  assert.ok(!/\$|299|美元/.test(info.notice));
  if (!(await pool.query(`SELECT 1 FROM crm_settings WHERE key = 'room_notice' AND value::text NOT IN ('"会员按等级享受会议室优惠，具体请联系商会工作人员。"')`)).rows.length) assert.equal(info.notice, ROOM_NOTICE_MP);
  ok('会议室说明：小程序里是月卡说明、没有价格');
  console.log(`\n全部通过：${passed} 项`);
}
async function cleanup() {
  if (made.events.length) {
    await pool.query(`DELETE FROM registrations WHERE event_id = ANY($1::uuid[])`, [made.events]);
    await pool.query(`DELETE FROM events WHERE id = ANY($1::uuid[]) AND title LIKE 'DEV13-%'`, [made.events]);
  }
  if (made.contacts.length) {
    await pool.query(`DELETE FROM member_cards WHERE contact_id = ANY($1::uuid[])`, [made.contacts]);
    await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[]) AND name LIKE 'DEV13-%'`, [made.contacts]);
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(async () => { await cleanup().catch((e) => console.error('清理失败', e)); await pool.end(); });
