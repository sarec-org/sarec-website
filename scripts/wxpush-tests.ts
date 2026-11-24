/**
 * 指令 53：消息推送处理用微信文档的样例包本机打一遍（明文模式、JSON）。
 * 用法：DATABASE_URL=<测试库> WX_PUSH_TOKEN=<随便一串> pnpm dlx tsx scripts/wxpush-tests.ts --i-know-this-is-not-production
 * 造一条「验收十-」的 image_checks（pending、带任务号），用签名正确的样例包推"通过"→ 应该变 pass；签名错 → 403；
 * errcode 不是 0、没有结果 → 不能当成通过。跑完按 ID 删。
 */
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { POST, GET } from '@/app/api/v1/wx/push/route';
import { guardNotProduction } from './_guard';

guardNotProduction();
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const token = process.env.WX_PUSH_TOKEN!;
assert.ok(token, '设 WX_PUSH_TOKEN');
const ids: string[] = [];
const sign = (ts: string, nonce: string) => createHash('sha1').update([token, ts, nonce].sort().join('')).digest('hex');
const url = (sig?: string) => { const ts = String(Math.floor(Date.now() / 1000)); const n = 'n' + sfx; return `https://sinoamericanrec.org/api/v1/wx/push?signature=${sig ?? sign(ts, n)}&timestamp=${ts}&nonce=${n}`; };
async function row(trace: string) {
  const { rows } = await pool.query<{ id: string }>(`INSERT INTO image_checks (url, target, status, trace_id) VALUES ($1, $2, 'pending', $3) RETURNING id`, [`https://x.public.blob.vercel-storage.com/test/${sfx}-${trace}.jpg`, `avatar:00000000-0000-0000-0000-000000000000`, trace]);
  ids.push(rows[0].id); return rows[0].id;
}
const st = async (id: string) => (await pool.query<{ status: string; note: string | null }>(`SELECT status, note FROM image_checks WHERE id = $1`, [id])).rows[0];
const sample = (trace: string, extra: Record<string, unknown> = {}) => JSON.stringify({ ToUserName: 'gh_test', FromUserName: 'oTEST', CreateTime: 1700000000, MsgType: 'event', Event: 'wxa_media_check', appid: 'wxtest', trace_id: trace, version: 2, detail: [{ strategy: 'content_model', errcode: 0, suggest: 'pass', label: 100, prob: 90 }], errcode: 0, errmsg: 'ok', result: { suggest: 'pass', label: 100 }, ...extra });

async function main() {
  const ts = String(Math.floor(Date.now() / 1000)); const n = 'v' + sfx;
  const g = await GET(new Request(`https://x/api/v1/wx/push?signature=${sign(ts, n)}&timestamp=${ts}&nonce=${n}&echostr=hello${sfx}`));
  assert.equal(await g.text(), `hello${sfx}`); console.log('  ✓ 配置校验：签名对 → 原样回 echostr');
  const id1 = await row(`T1-${sfx}`);
  const bad = await POST(new Request(url('wrong'), { method: 'POST', body: sample(`T1-${sfx}`) }));
  assert.equal(bad.status, 403); assert.equal((await st(id1)).status, 'pending'); console.log('  ✓ 签名错 → 403，不改');
  const t0 = Date.now();
  const ok = await POST(new Request(url(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: sample(`T1-${sfx}`) }));
  assert.equal(await ok.text(), 'success'); assert.equal((await st(id1)).status, 'pass');
  console.log(`  ✓ 微信文档样例包（通过）→ 回 success、这张变 pass（${Date.now() - t0} 毫秒）`);
  const id2 = await row(`T2-${sfx}`);
  await POST(new Request(url(), { method: 'POST', body: sample(`T2-${sfx}`, { errcode: 87014, errmsg: 'media download fail', result: undefined, detail: [] }) }));
  const s2 = await st(id2); assert.equal(s2.status, 'pending'); assert.match(s2.note ?? '', /微信没能检测|人工/);
  console.log('  ✓ 微信没能检测（errcode≠0、没结果）→ 不当成通过，留着等放行并写原因');
  const id3 = await row(`T3-${sfx}`);
  await POST(new Request(url(), { method: 'POST', body: sample(`T3-${sfx}`, { result: { suggest: 'risky', label: 20002 } }) }));
  assert.equal((await st(id3)).status, 'risky'); console.log('  ✓ 不通过 → risky（机器判的不通过）');
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(async () => {
  await pool.query(`DELETE FROM ugc_actions WHERE note LIKE $1 OR target_id = ANY($2::text[])`, [`%${sfx}%`, ids]);
  await pool.query(`DELETE FROM image_checks WHERE id = ANY($1::uuid[])`, [ids]);
  console.log('清理：测试行已删'); await pool.end();
});
