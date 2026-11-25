/**
 * 指令 60（11/24）1.6.1：组局可修改、可转发。东哥原话：“地址我写错了，不知道怎么改……不知道怎么转发”。
 * 覆盖：① 发起人改成功（改地址 / 时间 / 人数 / 一句话）；② 别人改 → 404（找不到）；③ 人数上限少于已报名人数 → 拒绝、中文说明；
 *       ④ 文字检测：拦词拒绝（不复述被拦的词）、微信检测 risky 拒绝、pass 照常显示；⑤ 改时间 / 地点 → 之前报名的人看到「已改」，
 *       发起人自己、改动之后才报名的人不显示；只改人数不出标记；⑥ 已取消 / 已开始的不能改；
 *       ⑦ 组局详情 GET：成员 / 负责人看得到、非成员和没登录只给加入引导（locked）、已取消写“这个组局已取消”、检测中的只有发起人看得到；
 *       ⑧ canEdit：只有发起人、只在没取消没开始时为真（组局板和详情页一致）。
 * 用法：DATABASE_URL=<测试库或本机临时库> pnpm dlx tsx scripts/meetup161-tests.ts
 * 测试数据「验收161-」前缀，跑完按 ID 删。不连微信：fetch 换成本地假的（微信凭证 / 文本检测 / 地址查询都不出网）。
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { clubDetail, createMeetup, cancelMeetup, editMeetup, joinMeetup, meetupDetail } from '@/lib/crm/clubs';
import { guardNotProduction } from './_guard';

guardNotProduction();
// 文本检测走“已配置”分支，但 fetch 是假的：secMode 决定微信回什么
process.env.WX_APPID = 'test-appid';
process.env.WX_SECRET = 'test-secret';
let secMode: 'pass' | 'risky' = 'pass';
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = String(input instanceof Request ? input.url : input);
  const json = (o: unknown) => new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } });
  if (url.includes('api.weixin.qq.com/cgi-bin/stable_token')) return json({ access_token: 'fake-token', expires_in: 7200 });
  if (url.includes('api.weixin.qq.com/wxa/msg_sec_check')) return json({ errcode: 0, result: { suggest: secMode } });
  return json({}); // 地址查询等：当查不到
}) as typeof fetch;

const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const P = `验收161-${sfx}`;
const ids: string[] = [];
const clubs: string[] = [];
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };
const day = 86400e3;

async function contact(name: string) {
  // 非 dev- 开头的 openid：文本检测才会真的去“问微信”（假的 fetch）
  const { rows } = await pool.query<{ id: string }>(`INSERT INTO contacts (name, wechat_openid) VALUES ($1, $2) RETURNING id`, [`${P}-${name}`, `test161-${sfx}-${name}`]);
  ids.push(rows[0].id);
  return rows[0].id;
}
async function rejects(p: Promise<unknown>, code: string, re?: RegExp) {
  try { await p; } catch (e) {
    assert.ok(e instanceof CrmError, `应是 CrmError：${String(e)}`);
    assert.equal(e.code, code, `错误码 ${e.code}：${e.message}`);
    if (re) assert.match(e.message, re);
    return e.message;
  }
  assert.fail(`应该被拒绝（${code}）`);
}
async function addMember(clubId: string, cid: string) {
  await pool.query(`INSERT INTO club_members (club_id, contact_id) VALUES ($1, $2)`, [clubId, cid]);
}

async function main() {
  const creator = await contact('发起人');
  const alice = await contact('甲');
  const bob = await contact('乙');
  const late = await contact('后来报名');
  const outsider = await contact('非成员');
  const leader = await contact('负责人');
  const key = `t161-${sfx}`;
  const { rows: cr } = await pool.query<{ id: string }>(`INSERT INTO clubs (key, name, leader_contact_id) VALUES ($1, $2, $3) RETURNING id`, [key, `${P}掼蛋俱乐部`, leader]);
  const clubId = cr[0].id;
  clubs.push(clubId);
  for (const m of [creator, alice, bob, late]) await addMember(clubId, m);

  // 发起（检测通过 → 直接显示）
  secMode = 'pass';
  const startsAt = new Date(Date.now() + 3 * day);
  const made = await createMeetup(creator, key, { title: '周五下午掼蛋局', startsAt: startsAt.toISOString(), location: '商会会义室', address: '123 Wrong Street, Irvine CA', capacity: 4, note: '新手欢迎' });
  const id = made.id;
  await joinMeetup(alice, id, true);
  await joinMeetup(bob, id, true);
  // 让“报名时间”早于后面的修改
  await pool.query(`UPDATE club_meetup_joins SET joined_at = now() - interval '1 hour' WHERE meetup_id = $1`, [id]);

  // ⑧ 组局板 canEdit
  const board = async (who: string) => ((await clubDetail(who, key)).meetups as { id: string; canEdit: boolean; changed: string | null; mineCreated: boolean }[]).find((m) => m.id === id)!;
  assert.equal((await board(creator)).canEdit, true);
  assert.equal((await board(alice)).canEdit, false);
  assert.equal((await board(alice)).changed, null, '还没改：没有标记');
  ok('组局板：发起人 canEdit=true，参加者 canEdit=false；没改过没有标记');

  // ② 别人改 → 404 找不到（参加者、负责人、非成员都一样）
  for (const who of [alice, leader, outsider]) await rejects(editMeetup(who, id, { location: '别处' }), 'not_found', /找不到这个组局/);
  await rejects(editMeetup(creator, '00000000-0000-0000-0000-00000000000x', { location: 'x' }), 'not_found');
  ok('不是发起人改 → not_found（HTTP 404，不透露是谁发的）');

  // ③ 人数上限少于已报名（3 人：发起人 + 甲 + 乙）
  const m3 = await rejects(editMeetup(creator, id, { capacity: 2 }), 'bad_request', /已经有 3 人报名了，人数上限不能少于 3/);
  assert.ok(!/\d+\s*元/.test(m3));
  await rejects(editMeetup(creator, id, { capacity: 500 }), 'bad_request', /2 到 200/);
  await rejects(editMeetup(creator, id, { startsAt: new Date(Date.now() - day).toISOString() }), 'bad_request', /还没到的时间/);
  await rejects(editMeetup(creator, id, { title: '  ' }), 'bad_request', /标题/);
  ok('人数上限少于已报名 → “已经有 3 人报名了，人数上限不能少于 3”；过去的时间、空标题、超范围人数都拒绝');

  // ④ 文字检测
  const gm = await rejects(editMeetup(creator, id, { note: '输了请喝奶茶，每局 5 块' }), 'bad_words');
  assert.ok(!gm.includes('块') && !gm.includes('输'), '提示不复述被拦的词');
  secMode = 'risky';
  await rejects(editMeetup(creator, id, { title: '周五掼蛋局（改）' }), 'bad_words', /没通过微信内容检测/);
  secMode = 'pass';
  const { rows: still } = await pool.query(`SELECT title, note, sec_status FROM club_meetups WHERE id = $1`, [id]);
  assert.equal(still[0].title, '周五下午掼蛋局'); assert.equal(still[0].note, '新手欢迎'); assert.equal(still[0].sec_status, 'ok');
  ok('文字检测：拦词拒绝（提示不复述）、微信检测 risky 拒绝；被拒的修改一个字都没写进去');

  // ① 改地址（东哥的情形）+ ⑤ 标记
  const r1 = await editMeetup(creator, id, { location: '商会会议室', address: '456 Right Ave, Irvine CA' });
  assert.match(r1.message, /地点已改/);
  assert.equal((await board(alice)).changed, '地点已改');
  assert.equal((await board(bob)).changed, '地点已改');
  assert.equal((await board(creator)).changed, null, '发起人自己不显示');
  const { rows: a1 } = await pool.query(`SELECT location, address, sec_status, edited_at, place_changed_at, time_changed_at FROM club_meetups WHERE id = $1`, [id]);
  assert.equal(a1[0].location, '商会会议室'); assert.equal(a1[0].address, '456 Right Ave, Irvine CA'); assert.equal(a1[0].sec_status, 'ok');
  assert.ok(a1[0].edited_at && a1[0].place_changed_at); assert.equal(a1[0].time_changed_at, null);
  ok('发起人改地点 / 地址成功（检测通过照常显示）；之前报名的甲、乙看到「地点已改」，发起人自己不显示');

  // 改了之后才报名的人：看到的就是新的，不显示
  await joinMeetup(late, id, true);
  assert.equal((await board(late)).changed, null);
  ok('改动之后才报名的人不显示「已改」');

  // 改时间 → 时间、地点已改
  const newStart = new Date(startsAt.getTime() + 2 * 3600e3);
  await editMeetup(creator, id, { startsAt: newStart.toISOString() });
  assert.equal((await board(alice)).changed, '时间、地点已改');
  const d1 = await meetupDetail(alice, id);
  assert.equal(d1.meetup?.changed, '时间、地点已改', '详情页同样的标记');
  assert.equal(new Date(d1.meetup!.startsAt).getTime(), newStart.getTime());
  assert.equal((await board(late)).changed, '时间已改', '后来报名的人：报名之后又改了时间 → 时间已改');
  ok('再改时间 → 甲看到「时间、地点已改」（组局板和详情页一致）；后来报名的人只看到「时间已改」');

  // 只改人数 / 一句话：不出新标记，不动改动时间
  const { rows: t0 } = await pool.query(`SELECT time_changed_at, place_changed_at FROM club_meetups WHERE id = $1`, [id]);
  await editMeetup(creator, id, { capacity: 6, note: '新手也欢迎，带上名片' });
  const { rows: t1 } = await pool.query(`SELECT capacity, note, time_changed_at, place_changed_at FROM club_meetups WHERE id = $1`, [id]);
  assert.equal(t1[0].capacity, 6); assert.equal(t1[0].note, '新手也欢迎，带上名片');
  assert.equal(String(t1[0].time_changed_at), String(t0[0].time_changed_at)); assert.equal(String(t1[0].place_changed_at), String(t0[0].place_changed_at));
  await pool.query(`UPDATE club_meetup_joins SET joined_at = now() WHERE meetup_id = $1 AND contact_id = $2`, [id, late]);
  assert.equal((await board(late)).changed, null, '只改人数不给新标记');
  assert.equal((await editMeetup(creator, id, { capacity: 6 })).message, '没有改动');
  ok('只改人数 / 一句话：成功，不动「已改」时间；什么都没变 → “没有改动”');

  // 文字改了、微信没检测上（例如没配置）→ 先只给发起人看，和发起时同一规矩
  delete process.env.WX_SECRET;
  const r2 = await editMeetup(creator, id, { title: '周五下午掼蛋局（二楼）' });
  assert.match(r2.message, /内容检测中/);
  assert.equal((await meetupDetail(alice, id)).gone, '这个组局暂时看不到，可能还在内容检测中');
  assert.equal((await board(alice)), undefined, '组局板上别人也看不到');
  assert.ok((await meetupDetail(creator, id)).meetup?.pending, '发起人自己看得到，写着检测中');
  process.env.WX_SECRET = 'test-secret';
  await editMeetup(creator, id, { title: '周五下午掼蛋局（三楼）' }); // 再改一次，检测通过 → 恢复显示
  assert.ok((await meetupDetail(alice, id)).meetup);
  ok('改了文字但没检测上 → 先只有发起人看得到（和发起时同一规矩）；再改检测通过 → 恢复显示');

  // ⑦ 详情 GET：成员 / 负责人 / 非成员 / 没登录
  const dm = await meetupDetail(alice, id);
  assert.equal(dm.locked, false); assert.equal(dm.canEdit, false); assert.equal(dm.joinedClub, true);
  assert.equal(dm.meetup?.title, '周五下午掼蛋局（三楼）'); assert.equal(dm.meetup?.creator, `${P}-发起人`); assert.equal(dm.meetup?.iJoined, true);
  assert.equal(dm.club?.key, key);
  const dc = await meetupDetail(creator, id);
  assert.equal(dc.canEdit, true); assert.equal(dc.meetup?.canEdit, true); assert.equal(dc.meetup?.mineCreated, true);
  const dl = await meetupDetail(leader, id);
  assert.ok(dl.meetup); assert.equal(dl.leader, true); assert.equal(dl.canEdit, false);
  ok('详情（成员）：看得到组局，creator 显示名和组局板一样；canEdit 只有发起人为真；负责人（没加入）也看得到、不能改');
  for (const who of [outsider, null]) {
    const dx = await meetupDetail(who, id);
    assert.equal(dx.locked, true); assert.equal(dx.meetup, null); assert.equal(dx.canEdit, false); assert.equal(dx.joinedClub, false);
    assert.equal(dx.club?.name, `${P}掼蛋俱乐部`);
    assert.match(String((dx as { lockedNote?: string }).lockedNote), /加入「.*」后能看到这个组局，也能报名/);
    assert.ok(!JSON.stringify(dx).includes('三楼') && !JSON.stringify(dx).includes('Right Ave'), '不是成员：标题、地址都不给');
  }
  await rejects(joinMeetup(outsider, id, true), 'forbidden', /先加入这个俱乐部/);
  ok('详情（非成员 / 没登录）：和俱乐部页同一规矩，不给组局内容，只给俱乐部名字 +「加入后能看到这个组局，也能报名」；直接报名被拒');
  assert.equal((await meetupDetail(alice, 'not-a-uuid')).gone, '找不到这个组局，可能链接不完整');
  assert.equal((await meetupDetail(alice, '00000000-0000-4000-8000-000000000000')).gone, '找不到这个组局，可能已经删掉了');
  ok('详情：链接坏了 / 组局不存在 → 写清楚找不到');

  // ⑥ 已开始的不能改
  const { rows: past } = await pool.query<{ id: string }>(
    `INSERT INTO club_meetups (club_id, creator_id, title, starts_at, capacity, sec_status) VALUES ($1, $2, $3, now() - interval '10 minutes', 4, 'ok') RETURNING id`,
    [clubId, creator, `${P}已开始`]
  );
  await rejects(editMeetup(creator, past[0].id, { note: '改' }), 'closed', /已经开始了/);
  assert.equal((await meetupDetail(creator, past[0].id)).canEdit, false);
  assert.equal((await board(creator)).canEdit, true);
  ok('已经开始的组局：不能改（“已经开始了”），canEdit=false');

  // ⑥ 已取消 / 已下架
  await cancelMeetup(creator, id);
  await rejects(editMeetup(creator, id, { location: '再改' }), 'closed', /已经取消了/);
  for (const who of [creator, alice, outsider, null]) {
    const dx = await meetupDetail(who, id);
    assert.equal(dx.gone, '这个组局已取消'); assert.equal(dx.meetup, null); assert.equal(dx.canEdit, false);
  }
  assert.equal((await board(alice)).changed, null, '取消了就不再显示「已改」');
  assert.equal((await board(creator)).canEdit, false);
  await pool.query(`UPDATE club_meetups SET status = 'taken_down' WHERE id = $1`, [past[0].id]);
  await rejects(editMeetup(creator, past[0].id, { note: '改' }), 'closed', /下架/);
  assert.equal((await meetupDetail(alice, past[0].id)).gone, '这个组局已取消');
  ok('已取消 / 已下架：不能改；详情页对所有人写“这个组局已取消”，canEdit=false');
}

main()
  .then(() => console.log(`\n通过 ${passed} 项`))
  .catch((e) => { console.error('失败：', e); process.exitCode = 1; })
  .finally(async () => {
    globalThis.fetch = realFetch;
    await pool.query(`DELETE FROM ugc_actions WHERE kind = 'meetup' AND target_id IN (SELECT id::text FROM club_meetups WHERE club_id = ANY($1::uuid[]))`, [clubs]);
    await pool.query(`DELETE FROM clubs WHERE id = ANY($1::uuid[])`, [clubs]); // 组局、报名、成员跟着删
    await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[])`, [ids]);
    await pool.end();
  });
