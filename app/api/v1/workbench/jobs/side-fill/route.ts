/**
 * 指令 99：找工人 / 接活儿两侧首页各 8 个工种——入口表（最多 7 个，分到两侧）不满 8 个的，用这里指定的工种补；没指定的一侧自动选最常用的。
 * GET → { find:{ base:[入口名], fill:[工种 key], auto, candidates:[{key,name,pros,posts}] }, work:{…}, max: 8 }
 * PUT { find?: [工种 key…] | null, work?: [工种 key…] | null }（null = 这一侧改回自动）（运营）
 */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { SIDE_MAX, loadHomeEntries, loadSideFill, loadTrades, saveSideFill, sideCandidates, sideEntries8, tradeUsage, type Side } from '@/lib/jobs/trades';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function view() {
  const [entries, trades, usage, fill] = await Promise.all([loadHomeEntries(), loadTrades(), tradeUsage(), loadSideFill()]);
  const side = (s: Side) => {
    const r = sideEntries8(s, entries, trades, usage, fill);
    return {
      base: r.entries.filter((e) => e.slot < 100).map((e) => e.label),
      fill: r.fill,
      auto: r.auto,
      candidates: sideCandidates(s, entries, trades, usage).map((t) => ({ key: t.key, name: t.name, pros: usage.get(t.key)?.pros ?? 0, posts: usage.get(t.key)?.posts ?? 0 }))
    };
  };
  return { find: side('find'), work: side('work'), max: SIDE_MAX };
}
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok(await view());
});
export const PUT = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const b = await body<{ find?: unknown; work?: unknown }>(req);
  await saveSideFill(b, `staff:${s.name || s.email}`);
  return ok(await view());
});
