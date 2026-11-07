/**
 * 1.3 M 回归测试：活动筹备清单（模板 → 生成 → 打勾 / 加 / 删 → 复盘同步进模板）、
 * 私企面对面收费（付款链接签名、小程序不显示金额、已付 → 已确认）、会后电子名册。
 * 只建 DEV13- 开头的测试数据，结束按 ID 删除。不发邮件（不设 RESEND_API_KEY 运行）。
 * 用法：DATABASE_URL=<测试库> pnpm dlx tsx scripts/crm-v13-prep-tests.ts --i-know-this-is-not-production
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { addPrepItem, applyRetroToTemplate, createEventPrep, deletePrepItem, getEventPrep, listTemplates, saveTemplate, saveTemplateItem, updatePrepItem, assignRole, saveRetro } from '@/lib/crm/prep';
import { payLink, payToken, payTokenOk } from '@/lib/crm/payLinks';
import { buildRoster, rosterByToken, rosterForParticipant } from '@/lib/crm/roster';
import { myOverviewMp, previewRegistration } from '@/lib/crm/flow';
import { guardNotProduction } from './_guard';

guardNotProduction();
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
let passed = 0;
const ok = (n: string) => {
  passed++;
  console.log(`  ✓ ${n}`);
};
const made = { events: [] as string[], contacts: [] as string[], templates: [] as number[], orders: [] as string[] };

async function main() {
  const { rows: g } = await pool.query(`SELECT 1 FROM events WHERE slug = '2026-11-07-event-e641'`);
  assert.equal(g.length, 0, '这是正式库，停止');

  // ── 模板：新建一个 DEV13 模板（不动 lecture / face）──
  const face = (await listTemplates()).find((t) => t.key === 'face')!;
  assert.ok(face && face.items.length === 11, 'face 模板 11 项');
  assert.equal(face.settings.pitchMinutes, 3);
  assert.equal(face.items.find((i) => i.sort_order === 8)?.role, '总负责 / 主持、摄影摄像');
  ok('内置模板：私企面对面 11 项、限时 3 分钟、多角色项');
  const lecture = (await listTemplates()).find((t) => t.key === 'lecture')!;
  assert.equal(lecture.items.length, 16);
  ok('内置模板：讲座 16 项');

  const tpl = await saveTemplate({ key: `dev13-${sfx}`, name: `DEV13-模板-${sfx}`, roles: ['总负责 / 主持', '签到接待', '摄影摄像'], shootingList: '拍正面', settings: { pitchMinutes: 3, collectIntro: true } });
  made.templates.push(tpl.id);
  const a = await saveTemplateItem(tpl.id, { title: '后台建活动', role: '总负责 / 主持', anchor: 'start', offsetMinutes: -14 * 1440 });
  const b = await saveTemplateItem(tpl.id, { title: '贴签到码', role: '签到接待、摄影摄像', anchor: 'start', offsetMinutes: -60 });
  await saveTemplateItem(tpl.id, { title: '大合影', role: '摄影摄像', anchor: 'end', offsetMinutes: -10 });
  const t1 = (await listTemplates()).find((t) => t.id === tpl.id)!;
  assert.equal(t1.items.length, 3);
  assert.equal(t1.items.find((i) => i.id === a.id)?.when_label, '提前 14 天', '自动生成显示文字');
  ok('模板：新建、加 3 项、自动生成“提前 14 天”');

  // ── 活动 + 生成清单 ──
  const starts = new Date(Date.now() + 20 * 86400e3);
  const { rows: ev } = await pool.query<{ id: string; slug: string }>(
    `INSERT INTO events (slug, title, starts_at, ends_at, fee_cents, capacity) VALUES ($1, $2, $3, $4, 5000, 20) RETURNING id, slug`,
    [`dev13-face-${sfx}`, `DEV13-私企面对面-${sfx}`, starts, new Date(starts.getTime() + 3 * 3600e3)]
  );
  made.events.push(ev[0].id);
  const cr = await createEventPrep(ev[0].id, `dev13-${sfx}`);
  assert.equal(cr.created, true);
  assert.deepEqual(await createEventPrep(ev[0].id, `dev13-${sfx}`), { created: false }, '重复生成不重复');
  let p = (await getEventPrep(ev[0].id))!;
  assert.equal(p.items.length, 3);
  const first = p.items.find((i) => i.title === '后台建活动')!;
  assert.equal(new Date(first.due_at).getTime(), starts.getTime() - 14 * 86400e3, '截止时间 = 开始前 14 天');
  const last = p.items.find((i) => i.title === '大合影')!;
  assert.equal(new Date(last.due_at).getTime(), starts.getTime() + 3 * 3600e3 - 10 * 60e3, '相对结束');
  ok('生成清单：拷贝模板、截止时间按开始 / 结束算、重复生成不重复');

  await assignRole(ev[0].id, '签到接待', { name: 'DEV13 小王', contact: 'dev13@example.com' });
  await updatePrepItem(ev[0].id, first.id, 'DEV13 测试', { done: true, note: '已建好' });
  p = (await getEventPrep(ev[0].id))!;
  assert.ok(p.items.find((i) => i.id === first.id)?.done_at);
  assert.equal(p.items.find((i) => i.id === first.id)?.done_by, 'DEV13 测试');
  assert.equal(p.assignees['签到接待']?.name, 'DEV13 小王');
  await updatePrepItem(ev[0].id, first.id, 'DEV13 测试', { done: false });
  assert.equal((await getEventPrep(ev[0].id))!.items.find((i) => i.id === first.id)?.done_at, null);
  ok('打勾 / 取消打勾、记录谁做的、备注、分配负责人');

  // ── 复盘：这场加一项、删一项、改一项 → 一键同步进模板 ──
  const added = await addPrepItem(ev[0].id, { title: '准备计时器', role: '总负责 / 主持', anchor: 'start', offsetMinutes: -2 * 1440 });
  const toDel = p.items.find((i) => i.from_template_item === b.id)!;
  await deletePrepItem(ev[0].id, toDel.id);
  await updatePrepItem(ev[0].id, last.id, 'x', { title: '大合影（拍 5 张以上）' });
  await saveRetro(ev[0].id, '缺计时器；签到码不用单独贴');
  const r = await applyRetroToTemplate(ev[0].id);
  assert.deepEqual(r, { added: 1, removed: 1, edited: 1 });
  const t2 = (await listTemplates()).find((t) => t.id === tpl.id)!;
  assert.ok(t2.items.some((i) => i.title === '准备计时器' && i.offset_minutes === -2880));
  assert.ok(!t2.items.some((i) => i.id === b.id));
  assert.ok(t2.items.some((i) => i.title === '大合影（拍 5 张以上）'));
  assert.deepEqual(await applyRetroToTemplate(ev[0].id), { added: 0, removed: 0, edited: 0 }, '再点一次不重复');
  void added;
  ok('复盘：新增 1、删除 1、改字 1 同步进模板；再点一次不重复');

  // ── 私企面对面：报名 → 小程序只显示“收费待确认”，已付 → 已确认；一句话介绍；电子名册 ──
  const mk = async (name: string) => {
    const { rows } = await pool.query<{ id: string }>(`INSERT INTO contacts (name, acquisition_source) VALUES ($1, 'test') RETURNING id`, [name]);
    made.contacts.push(rows[0].id);
    return rows[0].id;
  };
  const c1 = await mk(`DEV13-甲-${sfx}`);
  const c2 = await mk(`DEV13-乙-${sfx}`);
  const c3 = await mk(`DEV13-丙-${sfx}`);
  for (const c of [c1, c2, c3]) await pool.query(`INSERT INTO registrations (event_id, contact_id, status) VALUES ($1, $2, 'registered')`, [ev[0].id, c]);
  const orderNo = `DEV13${sfx}`.toUpperCase();
  await pool.query(`INSERT INTO orders (order_no, contact_id, purpose, related_id, description, amount_cents) VALUES ($1, $2, 'event_fee', $3, 'DEV13', 5000)`, [orderNo, c1, ev[0].id]);
  made.orders.push(orderNo);

  let pv = await previewRegistration(ev[0].slug, c1);
  assert.equal(pv.feeConfirmed, false);
  assert.equal(pv.collectIntro, true, '没填介绍 → 提示填一句话介绍');
  assert.equal(pv.rosterReady, false);
  let mp = await myOverviewMp(c1);
  let mine = mp.registrations.find((x) => x.slug === ev[0].slug)!;
  assert.equal(mine.fee_confirmed, false);
  assert.ok(!/\$|5000|50\.00/.test(JSON.stringify(mine)), '小程序数据里没有金额');
  ok('小程序：收费待确认、提示一句话介绍、数据里没有金额');

  assert.ok(payLink(orderNo).includes(`/zh/pay/${orderNo}?t=`));
  assert.ok(payTokenOk(orderNo, payToken(orderNo)));
  assert.ok(!payTokenOk(orderNo, payToken(orderNo + 'X')));
  assert.ok(!payTokenOk(orderNo, ''));
  ok('付款链接：签名对才能打开本人订单，别的订单的签名不行');

  await pool.query(`UPDATE orders SET status = 'paid' WHERE order_no = $1`, [orderNo]);
  pv = await previewRegistration(ev[0].slug, c1);
  assert.equal(pv.feeConfirmed, true);
  mp = await myOverviewMp(c1);
  assert.equal(mp.registrations.find((x) => x.slug === ev[0].slug)!.fee_confirmed, true);
  ok('已付 → 小程序显示“已确认”');

  await pool.query(`INSERT INTO member_cards (contact_id, intro, company, show_phone) VALUES ($1, '做零售物业', 'DEV13 公司', false) ON CONFLICT (contact_id) DO UPDATE SET intro = EXCLUDED.intro`, [c1]);
  assert.equal((await previewRegistration(ev[0].slug, c1)).collectIntro, false, '填过介绍不再提示');
  await pool.query(`INSERT INTO member_cards (contact_id, intro, hidden_at) VALUES ($1, '被下架的人', now()) ON CONFLICT (contact_id) DO UPDATE SET hidden_at = now()`, [c3]);
  ok('填过一句话介绍不再提示');

  // 甲、丙到场，乙没来
  await pool.query(`UPDATE registrations SET arrival_status = 'checked_in', checked_in_at = now() WHERE event_id = $1 AND contact_id = ANY($2::uuid[])`, [ev[0].id, [c1, c3]]);
  const ro = await buildRoster(ev[0].id, { send: false });
  assert.equal(ro.entries, 1, '只收到场的人，下架的人不进');
  const view = await rosterByToken(ro.token);
  assert.equal(view.entries[0].intro, '做零售物业');
  assert.equal(view.entries[0].phone, null, '没选公开的联系方式不显示');
  assert.ok(view.entries.every((e) => !e.name.includes('乙')));
  await assert.rejects(rosterForParticipant(ev[0].slug, c2), /到场/);
  assert.equal((await rosterForParticipant(ev[0].slug, c1)).entries.length, 1);
  assert.equal((await previewRegistration(ev[0].slug, c1)).rosterReady, true);
  assert.equal((await myOverviewMp(c1)).registrations.find((x) => x.slug === ev[0].slug)!.roster, true);
  await assert.rejects(rosterByToken('not-a-token'));
  ok('电子名册：只收到场的人、尊重公开设置、没到场的人看不到、小程序“我的报名”能打开');

  console.log(`\n全部通过：${passed} 项`);
}

async function cleanup() {
  if (made.orders.length) await pool.query(`DELETE FROM orders WHERE order_no = ANY($1::text[]) AND order_no LIKE 'DEV13%'`, [made.orders]);
  if (made.events.length) {
    await pool.query(`DELETE FROM registrations WHERE event_id = ANY($1::uuid[])`, [made.events]);
    await pool.query(`DELETE FROM events WHERE id = ANY($1::uuid[]) AND title LIKE 'DEV13-%'`, [made.events]);
  }
  if (made.contacts.length) {
    await pool.query(`DELETE FROM member_cards WHERE contact_id = ANY($1::uuid[])`, [made.contacts]);
    await pool.query(`DELETE FROM contact_methods WHERE contact_id = ANY($1::uuid[])`, [made.contacts]).catch(() => undefined);
    await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[]) AND name LIKE 'DEV13-%'`, [made.contacts]);
  }
  if (made.templates.length) await pool.query(`DELETE FROM prep_templates WHERE id = ANY($1::bigint[]) AND name LIKE 'DEV13-%'`, [made.templates]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup().catch((e) => console.error('清理失败', e));
    await pool.end();
  });
