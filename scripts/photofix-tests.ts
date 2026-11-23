/**
 * 指令 51（11/23）：照片"检测通过自动公开"修复的测试。
 * 场景：主档案没有微信身份、身份挂在合并前的旧档案上（老办法合并留下的）——以前传图会记"没拿到本人的微信身份"，一直卡着。
 * 覆盖：① 查身份能顺着合并找到旧档案；② 传图时拿这个身份交给微信；③ 已经卡住的图，本人登录后重新交给微信；
 *       ④ 推回"通过"后自动公开；⑤ 实在没有身份的图在「今天」里排到前面。
 * 用法：DATABASE_URL=<测试库> pnpm dlx tsx scripts/photofix-tests.ts --i-know-this-is-not-production
 * 测试数据「验收十-」前缀，跑完按 ID 删。不调真的微信接口（用替身）。
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import * as gate from '@/lib/crm/imageGate';
import { handleMediaCheckResult } from '@/lib/crm/mediaCheck';
import { publicProfile, saveProject } from '@/lib/crm/ugc';
import { V150_PROVIDERS } from '@/lib/crm/today/providers/v150';
import { guardNotProduction } from './_guard';

guardNotProduction();
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const P = `验收十-${sfx}`;
const img = (n: string) => `https://abc123.public.blob.vercel-storage.com/test/card/${sfx}-${n}.jpg`;
const ids: string[] = [];
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };
let traceN = 0;
const calls: { url: string; openid: string | null }[] = [];

async function contact(name: string, openid: string | null, mergedInto?: string) {
  const { rows } = await pool.query<{ id: string }>(`INSERT INTO contacts (name, wechat_openid, merged_into) VALUES ($1, $2, $3) RETURNING id`, [`${P}-${name}`, openid, mergedInto ?? null]);
  ids.push(rows[0].id);
  await pool.query(`INSERT INTO member_cards (contact_id) VALUES ($1) ON CONFLICT DO NOTHING`, [rows[0].id]);
  return rows[0].id;
}
const status = async (pid: string) => (await pool.query<{ status: string }>(`SELECT status FROM profile_projects WHERE id = $1`, [pid])).rows[0].status;

async function main() {
  assert.equal(await gate.gateReady(), true, '先跑迁移 0048');
  const useWx = () => gate.__setForTest(async (url, openid) => { calls.push({ url, openid }); return openid ? `trace-${sfx}-${++traceN}` : null; }, () => true);

  console.log('1 身份挂在合并前的旧档案上');
  const main1 = await contact('主档案', null);
  const oid = `oFIX${sfx}`;
  await contact('旧档案', oid, main1);
  assert.equal(await gate.wechatOpenidOf(main1), oid);
  ok('查身份：主档案没有 → 顺着合并找到旧档案上的微信身份');

  console.log('2 传图时用这个身份交给微信，推回"通过"自动公开');
  useWx();
  const r = await saveProject(main1, { title: `${P}项目`, images: [img('a')] });
  assert.equal(r.status, 'checking');
  const pid = (await pool.query<{ id: string }>(`SELECT id FROM profile_projects WHERE contact_id = $1`, [main1])).rows[0].id;
  const row = (await pool.query<{ trace_id: string | null; note: string | null }>(`SELECT trace_id, note FROM image_checks WHERE target = $1`, ['project:' + pid])).rows[0];
  assert.ok(row.trace_id, '交给微信了（有任务号）');
  assert.equal(row.note, null);
  assert.equal(calls.at(-1)!.openid, oid);
  const t0 = Date.now();
  await handleMediaCheckResult(row.trace_id!, 'pass', 100);
  assert.equal(await status(pid), 'ok');
  const tok = (await pool.query<{ token: string }>(`SELECT token FROM member_cards WHERE contact_id = $1`, [main1])).rows[0].token;
  assert.equal((await publicProfile(tok))!.projects.length, 1);
  ok(`交给微信用的是旧档案上的身份；推回"通过"后别人马上能看到（服务器处理 ${Date.now() - t0} 毫秒）`);

  console.log('3 已经卡住的图：本人登录后重新交给微信');
  const main2 = await contact('卡住的人', null);
  gate.__setForTest(async () => null, () => true); // 模拟以前：没拿到身份
  await saveProject(main2, { title: `${P}卡住`, images: [img('b')] });
  const pid2 = (await pool.query<{ id: string }>(`SELECT id FROM profile_projects WHERE contact_id = $1`, [main2])).rows[0].id;
  let ck = (await pool.query<{ trace_id: string | null; note: string | null }>(`SELECT trace_id, note FROM image_checks WHERE target = $1`, ['project:' + pid2])).rows[0];
  assert.equal(ck.trace_id, null);
  assert.match(ck.note ?? '', /没拿到本人的微信身份/);
  // 「今天」里排到前面
  const today = await V150_PROVIDERS.find((p) => p.kind === 'ugc_machine')!.list({} as never);
  const card = today.find((x) => x.id === `ugc_machine:project:${pid2}`)!;
  assert.ok(card && card.priority < 400, '等检测的排在待审核那一档前面');
  ok('拿不到身份的图：记原因、「今天」里排到前面（醒目）');
  // 这个人后来用小程序登录（身份挂在旧档案上）
  await contact('卡住的人旧档案', `oFIX${sfx}b`, main2);
  useWx();
  const n = await gate.retryPendingFor(main2);
  assert.equal(n, 1);
  ck = (await pool.query<{ trace_id: string | null; note: string | null }>(`SELECT trace_id, note FROM image_checks WHERE target = $1`, ['project:' + pid2])).rows[0];
  assert.ok(ck.trace_id);
  assert.equal(ck.note, null);
  await handleMediaCheckResult(ck.trace_id!, 'pass', 100);
  assert.equal(await status(pid2), 'ok');
  assert.equal(await gate.retryPendingFor(main2), 0, '重复调用不重复交');
  ok('卡住的图：本人登录后重新交给微信 → 推回"通过" → 自动公开；重复登录不重复交');

  console.log(`\n全部通过：${passed} 项`);
}

async function cleanup() {
  await pool.query(`DELETE FROM ugc_actions WHERE note LIKE $1 OR target_id = ANY(SELECT 'project:' || id::text FROM profile_projects WHERE contact_id = ANY($2::uuid[])) OR target_id = ANY(SELECT id::text FROM profile_projects WHERE contact_id = ANY($2::uuid[]))`, [`trace-${sfx}%`, ids]);
  await pool.query(`DELETE FROM image_checks WHERE contact_id = ANY($1::uuid[]) OR url LIKE $2`, [ids, `%/${sfx}-%`]);
  await pool.query(`DELETE FROM profile_projects WHERE contact_id = ANY($1::uuid[])`, [ids]);
  await pool.query(`DELETE FROM member_cards WHERE contact_id = ANY($1::uuid[])`, [ids]);
  await pool.query(`UPDATE contacts SET merged_into = NULL WHERE id = ANY($1::uuid[])`, [ids]);
  await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[])`, [ids]);
  const left = (await pool.query<{ n: number }>(`SELECT count(*)::int n FROM contacts WHERE name LIKE $1`, [`${P}%`])).rows[0].n;
  console.log(`清理：验收十- 剩 ${left} 条`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await cleanup().catch((e) => console.error('清理出错', e)); await pool.end(); });
