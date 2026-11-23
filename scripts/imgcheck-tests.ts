/**
 * 指令 36 第 2 条：用户传的图片"检测完才公开"（lib/crm/imageGate.ts）测试。
 * 覆盖：测试站不检测（没有微信密钥）/ 微信推回"通过" / 推回"不通过" / 微信接口出错（不挡上传，等放行）/ 后台一键放行 / 不放行，
 *       项目、相册照片、头像、名片 logo、俱乐部群二维码；本人看得到、别人看不到；「今天」页出现带"放行"的卡片。
 * 用法（本机一次性库，跑过 0001–0048；不连测试库 / 正式库；不调真的微信接口——用替身）：
 *   DATABASE_URL=postgres://postgres@127.0.0.1:5746/img36 pnpm dlx tsx scripts/imgcheck-tests.ts
 * 测试数据带「验收六-」前缀，跑完按 ID 删。
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import * as gate from '@/lib/crm/imageGate';
import { handleMediaCheckResult } from '@/lib/crm/mediaCheck';
import { myProfile, publicProfile, saveProject } from '@/lib/crm/ugc';
import { contentAction, contentBoard } from '@/lib/crm/contentAdmin';
import { myCard, updateMyCard } from '@/lib/crm/cards';
import { clubDetail, setGroupQr } from '@/lib/crm/clubs';
import { V150_PROVIDERS } from '@/lib/crm/today/providers/v150';
import type { Staff } from '@/lib/crm/auth';
import { guardNotProduction } from './_guard';

guardNotProduction();
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const P = `验收六-${sfx}`;
const staff = { email: 'qa@example.com', name: '验收六-工作人员', roles: ['ops'] } as unknown as Staff;
const img = (n: string) => `https://abc123.public.blob.vercel-storage.com/test/card/${sfx}-${n}.jpg`;
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };
const ids = { contacts: [] as string[], clubs: [] as string[], events: [] as string[] };

async function contact(name: string, openid: string | null) {
  const { rows } = await pool.query<{ id: string }>(`INSERT INTO contacts (name, wechat_openid) VALUES ($1, $2) RETURNING id`, [`${P}-${name}`, openid]);
  ids.contacts.push(rows[0].id);
  await pool.query(`INSERT INTO member_cards (contact_id) VALUES ($1) ON CONFLICT DO NOTHING`, [rows[0].id]);
  return rows[0].id;
}
const projStatus = async (id: string) => (await pool.query<{ status: string }>(`SELECT status FROM profile_projects WHERE id = $1`, [id])).rows[0].status;
const pidOf = async (cid: string, title: string) => (await pool.query<{ id: string }>(`SELECT id FROM profile_projects WHERE contact_id = $1 AND title = $2`, [cid, title])).rows[0].id;

async function main() {
  assert.equal(await gate.gateReady(), true, '先跑迁移 0048');
  let traceN = 0;
  let mode: 'ok' | 'null' | 'throw' = 'ok';
  const fakeWx = () => {
    gate.__setForTest(async () => {
      if (mode === 'throw') throw new Error('timeout');
      if (mode === 'null') return null;
      return `trace-${sfx}-${++traceN}`;
    }, () => true);
  };

  console.log('1 测试站（没有微信密钥）：不检测，先只有本人看得到，后台放行后公开');
  gate.__setForTest(null, () => false);
  const a = await contact('甲', `oTEST${sfx}a`);
  const r1 = await saveProject(a, { title: `${P}项目一`, body: '说明', images: [img('p1')] });
  assert.equal(r1.status, 'checking');
  assert.match(r1.message, /检测中/);
  const p1 = await pidOf(a, `${P}项目一`);
  const mine = await myProfile(a);
  const mp1 = (mine.projects as { id: string; status: string; reason: string | null }[]).find((x) => x.id === p1)!;
  assert.equal(mp1.status, 'checking');
  assert.match(mp1.reason ?? '', /图片检测中/);
  const tok = (await pool.query<{ token: string }>(`SELECT token FROM member_cards WHERE contact_id = $1`, [a])).rows[0].token;
  assert.equal((await publicProfile(tok))!.projects.length, 0, '别人看不到');
  const note1 = (await pool.query<{ note: string }>(`SELECT note FROM image_checks WHERE target = $1`, ['project:' + p1])).rows[0].note;
  assert.match(note1, /测试站不检测/);
  ok('测试站：项目 checking、本人看到"图片检测中"、别人看不到、记"测试站不检测"');
  const board = await contentBoard('machine');
  const it = board.items.find((x) => x.id === p1)!;
  assert.ok(it && it.checking && it.state === 'machine');
  const today = await V150_PROVIDERS.find((p) => p.kind === 'ugc_machine')!.list({} as never);
  const card = today.find((x) => x.id === `ugc_machine:project:${p1}`)!;
  assert.ok(card, '「今天」里有这条');
  assert.match(card.title, /在等图片检测/);
  assert.equal(card.actions[0].label, '放行');
  ok('后台「内容管理 › 机器拦下的」和「今天」里都有，第一个按钮是"放行"');
  await contentAction(staff, { kind: 'project', id: p1, action: 'restore' });
  assert.equal(await projStatus(p1), 'ok');
  assert.equal((await publicProfile(tok))!.projects.length, 1);
  // 放行过的图再保存（只改文字）不用重新等
  const r1b = await saveProject(a, { id: p1, title: `${P}项目一`, body: '改了说明', images: [img('p1')] });
  assert.equal(r1b.status, 'ok');
  ok('一键放行 → 大家能看到；只改文字再保存不用再等');

  console.log('2 正式站：微信推回"通过"自动公开');
  fakeWx();
  mode = 'ok';
  const r2 = await saveProject(a, { title: `${P}项目二`, images: [img('p2a'), img('p2b')] });
  assert.equal(r2.status, 'checking');
  const p2 = await pidOf(a, `${P}项目二`);
  const traces = (await pool.query<{ trace_id: string }>(`SELECT trace_id FROM image_checks WHERE target = $1 ORDER BY created_at`, ['project:' + p2])).rows.map((x) => x.trace_id);
  assert.equal(traces.length, 2);
  await handleMediaCheckResult(traces[0], 'pass', 100);
  assert.equal(await projStatus(p2), 'checking', '两张图都通过才公开');
  await handleMediaCheckResult(traces[1], 'pass', 100);
  assert.equal(await projStatus(p2), 'ok');
  ok('两张图都推回"通过"后项目自动公开（一张通过时还不公开）');

  console.log('3 正式站：推回"不通过"→ 撤下，本人看到原因，同一张图再存当场拒绝');
  const d = await contact('丁', `oTEST${sfx}d`);
  const r3 = await saveProject(d, { title: `${P}项目三`, images: [img('bad')] });
  assert.equal(r3.status, 'checking');
  const p3 = await pidOf(d, `${P}项目三`);
  const t3 = (await pool.query<{ trace_id: string }>(`SELECT trace_id FROM image_checks WHERE target = $1`, ['project:' + p3])).rows[0].trace_id;
  const res3 = await handleMediaCheckResult(t3, 'risky', 20002);
  assert.equal(res3.takenDown, true);
  assert.equal(await projStatus(p3), 'rejected');
  const mp3 = ((await myProfile(d)).projects as { id: string; reason: string | null }[]).find((x) => x.id === p3)!;
  assert.match(mp3.reason ?? '', /没通过微信内容检测/);
  await assert.rejects(saveProject(d, { id: p3, title: `${P}项目三`, images: [img('bad')] }), /没通过微信内容检测/);
  ok('不通过：项目撤下、本人看到原因；再用这张图当场拒绝');

  console.log('4 正式站：微信接口出错 / 超时 → 不挡上传，等工作人员放行');
  mode = 'null';
  const e4 = await contact('戊', `oTEST${sfx}e`);
  const r4 = await saveProject(e4, { title: `${P}项目四`, images: [img('err1')] });
  assert.equal(r4.status, 'checking');
  mode = 'throw';
  const b = await contact('乙', `oTEST${sfx}b`);
  const r4b = await saveProject(b, { title: `${P}项目五`, images: [img('err2')] });
  assert.equal(r4b.status, 'checking');
  const notes = (await pool.query<{ note: string }>(`SELECT note FROM image_checks WHERE url = ANY($1::text[])`, [[img('err1'), img('err2')]])).rows.map((x) => x.note);
  assert.ok(notes.every((n) => /没提交上/.test(n)));
  const noOpenid = await contact('丙', null);
  mode = 'ok';
  await saveProject(noOpenid, { title: `${P}项目六`, images: [img('noid')] });
  assert.match((await pool.query<{ note: string }>(`SELECT note FROM image_checks WHERE url = $1`, [img('noid')])).rows[0].note, /微信身份/);
  ok('接口返回出错 / 抛异常 / 没有 openid：都照常保存成"检测中"，写清原因等放行');

  console.log('5 头像 / logo：原来那格不变，本人看新图，放行后才换；不通过就作废');
  const oldAv = img('old-avatar');
  await pool.query(`UPDATE contacts SET avatar_url = $2 WHERE id = $1`, [a, oldAv]);
  const g5 = await gate.gateSlot('avatar', a, img('new-avatar'), a);
  assert.equal(g5.checking, true);
  assert.equal((await pool.query<{ u: string }>(`SELECT avatar_url AS u FROM contacts WHERE id = $1`, [a])).rows[0].u, oldAv, '别人看到的还是旧头像');
  const mc = await myCard(a);
  assert.equal(mc.avatarUrl, img('new-avatar'), '本人看新头像');
  assert.deepEqual(mc.imageChecking?.items, ['avatar']);
  const im = (await contentBoard('machine')).items.find((x) => x.kind === 'image' && x.images[0] === img('new-avatar'))!;
  assert.ok(im && im.checking);
  await contentAction(staff, { kind: 'image', id: im.id, action: 'restore' });
  assert.equal((await pool.query<{ u: string }>(`SELECT avatar_url AS u FROM contacts WHERE id = $1`, [a])).rows[0].u, img('new-avatar'));
  ok('头像：检测中只有本人看到新头像；后台放行后换上');
  // logo 通过名片保存带来：不直接写进去
  await updateMyCard(a, { logoUrl: img('logo-bad') });
  assert.equal((await pool.query<{ u: string | null }>(`SELECT logo_url AS u FROM member_cards WHERE contact_id = $1`, [a])).rows[0].u, null);
  assert.equal((await myCard(a)).logoUrl, img('logo-bad'));
  const tl = (await pool.query<{ trace_id: string }>(`SELECT trace_id FROM image_checks WHERE url = $1`, [img('logo-bad')])).rows[0].trace_id;
  await handleMediaCheckResult(tl, 'risky', 20001);
  assert.equal((await pool.query<{ u: string | null }>(`SELECT logo_url AS u FROM member_cards WHERE contact_id = $1`, [a])).rows[0].u, null, '不通过：logo 一直没换上');
  assert.equal((await myCard(a)).logoUrl, null);
  await assert.rejects(updateMyCard(a, { logoUrl: img('logo-bad') }), /没通过微信内容检测/);
  ok('logo：名片保存带新 logo 也要等检测；不通过的作废、再用当场拒绝');

  console.log('6 俱乐部群二维码：负责人看新码，成员看旧码，通过后都看新码');
  const key = `yanshou6-${sfx}`;
  const { rows: cl } = await pool.query<{ id: string }>(`INSERT INTO clubs (key, name, leader_contact_id, group_qr_url) VALUES ($1, $2, $3, $4) RETURNING id`, [key, `${P}俱乐部`, a, img('qr-old')]);
  ids.clubs.push(cl[0].id);
  await pool.query(`INSERT INTO club_members (club_id, contact_id) VALUES ($1, $2), ($1, $3)`, [cl[0].id, a, b]);
  const r6 = await setGroupQr('leader:' + a, key, img('qr-new'), null, a);
  assert.match(r6.message, /检测通过后成员就能看到/);
  assert.equal((await clubDetail(a, key)).groupQr, img('qr-new'));
  assert.match((await clubDetail(a, key)).groupQrNote ?? '', /检测中/);
  assert.equal((await clubDetail(b, key)).groupQr, img('qr-old'));
  const tq = (await pool.query<{ trace_id: string }>(`SELECT trace_id FROM image_checks WHERE url = $1`, [img('qr-new')])).rows[0].trace_id;
  await handleMediaCheckResult(tq, 'pass', 100);
  assert.equal((await clubDetail(b, key)).groupQr, img('qr-new'));
  ok('群二维码：检测中只有负责人看到新码；推回通过后成员看到');

  console.log('7 相册照片：checking 不进公开相册，通过后进');
  const { rows: ev } = await pool.query<{ id: string }>(`INSERT INTO events (slug, title, starts_at) VALUES ($1, $2, now() - interval '1 hour') RETURNING id`, [`ys6-${sfx}`, `${P}活动`]);
  ids.events.push(ev[0].id);
  const { rows: ph } = await pool.query<{ id: string }>(
    `INSERT INTO event_photos (event_id, url, thumb_url, uploaded_by, uploader_contact_id, visibility, review_status) VALUES ($1, $2, $2, 'customer', $3, 'album', 'checking') RETURNING id`,
    [ev[0].id, img('photo'), a]
  );
  await gate.submitImage(img('photo'), 'photo:' + ph[0].id, a);
  const { listEventPhotos } = await import('@/lib/crm/photos');
  assert.equal((await listEventPhotos(ev[0].id)).length, 0);
  const { listMyPhotos } = await import('@/lib/crm/customerPhotos');
  const myp = await listMyPhotos(a, `ys6-${sfx}`, true);
  assert.match(myp[0].checking ?? '', /检测中/);
  const tp = (await pool.query<{ trace_id: string }>(`SELECT trace_id FROM image_checks WHERE url = $1`, [img('photo')])).rows[0].trace_id;
  await handleMediaCheckResult(tp, 'pass', 100);
  assert.equal((await listEventPhotos(ev[0].id)).length, 1);
  ok('照片：检测中别人看不到、本人列表带 checking 说明；通过后进公开相册');

  console.log(`\n全部通过：${passed} 项`);
}

async function cleanup() {
  const c = ids.contacts;
  await pool.query(`DELETE FROM ugc_actions WHERE kind = 'image' AND target_id = ANY(SELECT id::text FROM image_checks WHERE contact_id = ANY($1::uuid[]))`, [c]);
  await pool.query(`DELETE FROM image_checks WHERE contact_id = ANY($1::uuid[]) OR url LIKE $2`, [c, `%/${sfx}-%`]);
  await pool.query(`DELETE FROM ugc_actions WHERE note LIKE $1 OR target_id = ANY(SELECT id::text FROM profile_projects WHERE contact_id = ANY($2::uuid[])) OR actor = $3`, [`trace-${sfx}%`, c, staff.name]);
  await pool.query(`DELETE FROM event_photos WHERE event_id = ANY($1::uuid[])`, [ids.events]);
  await pool.query(`DELETE FROM events WHERE id = ANY($1::uuid[])`, [ids.events]);
  await pool.query(`DELETE FROM club_members WHERE club_id = ANY($1::uuid[])`, [ids.clubs]);
  await pool.query(`DELETE FROM ugc_actions WHERE target_id = $1`, [`yanshou6-${sfx}`]);
  await pool.query(`DELETE FROM clubs WHERE id = ANY($1::uuid[])`, [ids.clubs]);
  await pool.query(`DELETE FROM profile_projects WHERE contact_id = ANY($1::uuid[])`, [c]);
  await pool.query(`DELETE FROM member_cards WHERE contact_id = ANY($1::uuid[])`, [c]);
  await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[])`, [c]);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await cleanup().catch((e) => console.error('清理出错', e)); await pool.end(); });
