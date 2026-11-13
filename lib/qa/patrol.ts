/**
 * 线上只读巡检（东哥 11/12 定的发版关卡）：不登录、只发 GET，按线上真实数据把小程序会走的公开接口、公开页面、出码接口过一遍。
 * 检查项和 scripts/qa-prod-patrol.mjs（测试窗口写的命令行版）一致；这里给定时任务 / 部署后自动跑用，结果存库、后台首页红条、可选邮件。
 * 绝不：POST / PUT / DELETE、带登录、写任何业务数据。
 */
export type PatrolItem = { name: string; ok: boolean; detail: string };

const MP = { 'X-Sarec-Client': 'mp-1.3.3' };
// “掼蛋”不在表里：东哥 11/12 定不改（带这个词的版本已过审），留在表里会让红条一直亮，失去提醒作用
const BANNED = /会费|付款|奖励|德州扑克|麻将|赌|返现|红包|彩票|抽奖|\$\s?\d|¥\s?\d|\d+\s?美元/;
const BANNED_GLOSSARY = /德州扑克|麻将|赌|\$\s?\d|¥\s?\d|\d+\s?美元/;
type Res = { s: number; ct?: string; j?: { ok?: boolean; error?: { code?: string; message?: string } } & Record<string, unknown>; size?: number; ms: number; text?: string; err?: string };

export async function runPatrol(base: string): Promise<{ base: string; total: number; failed: number; results: PatrolItem[] }> {
  const B = base.replace(/\/$/, '');
  const results: PatrolItem[] = [];
  const add = (name: string, ok: unknown, detail = '') => results.push({ name, ok: !!ok, detail });
  const get = async (path: string, headers: Record<string, string> = MP, timeoutMs = 20000): Promise<Res> => {
    const t0 = Date.now();
    try {
      const r = await fetch(B + path, { headers, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) });
      const ct = r.headers.get('content-type') || '';
      const buf = Buffer.from(await r.arrayBuffer());
      let j: Res['j'];
      if (ct.includes('json')) { try { j = JSON.parse(buf.toString('utf8')); } catch { /* 不是 JSON */ } }
      return { s: r.status, ct, j, size: buf.length, ms: Date.now() - t0, text: ct.includes('json') || ct.includes('html') ? buf.toString('utf8') : '' };
    } catch (e) {
      return { s: 0, err: (e as Error).name === 'TimeoutError' ? '超时' : (e as Error).message, ms: Date.now() - t0 };
    }
  };
  const okJson = (r: Res) => r.s === 200 && r.j?.ok === true;
  const why = (r: Res) => r.err || `${r.s} ${r.j?.error ? `${r.j.error.code} ${r.j.error.message}` : r.ct ?? ''}`;
  const banned = (o: unknown, re = BANNED) => JSON.stringify(o ?? '').match(re)?.[0] ?? '';
  const leaks = (o: unknown) => { const s = JSON.stringify(o ?? ''); return ['"registered":', '"capacity":', '"amountCents"', '"priceCents"'].filter((k) => s.includes(k)); };

  // 1. 首页 / 列表 / 元数据 / 公开接口
  const home = await get('/api/v1/home?v=131');
  add('首页接口 /home', okJson(home) && home.j?.h131, okJson(home) ? `${home.ms}ms` : why(home));
  const evs = await get('/api/v1/events');
  const evList = ((evs.j?.events as { slug: string }[] | undefined) ?? []);
  add('活动列表 /events', okJson(evs), okJson(evs) ? `${evList.length} 场` : why(evs));
  const past = await get('/api/v1/events?past=1');
  add('往期活动 /events?past=1', okJson(past), why(past));
  for (const p of ['default', 'contact', 'album']) { const m = await get('/api/v1/meta?p=' + p); add('元数据 /meta?p=' + p, okJson(m), why(m)); }
  for (const p of ['/api/v1/intro', '/api/v1/glossary', '/api/v1/docs', '/api/v1/content/research', '/api/v1/content/services', '/api/v1/cards/templates']) {
    const r = await get(p);
    add('接口 ' + p, okJson(r), okJson(r) ? `${r.ms}ms` : why(r));
    const b = okJson(r) ? banned(r.j, /glossary/.test(p) ? BANNED_GLOSSARY : BANNED) : '';
    if (b) add('敏感词 ' + p, false, `出现“${b}”`);
  }
  // 2. 每场活动：详情、相册、网页报名页
  const all = [...evList, ...(((past.j?.events as { slug: string }[] | undefined) ?? []).slice(0, 3))];
  const seen = new Set<string>();
  for (const e of all) {
    if (seen.has(e.slug)) continue;
    seen.add(e.slug);
    const d = await get('/api/v1/events/' + encodeURIComponent(e.slug));
    add(`活动详情 ${e.slug}`, okJson(d), why(d));
    if (okJson(d)) {
      const lk = leaks(d.j);
      if (lk.length) add(`活动详情不该给小程序人数 / 金额 ${e.slug}`, false, lk.join(' '));
      const ev = d.j?.event as { title?: string; summary?: string } | undefined;
      const b = banned({ t: ev?.title, s: ev?.summary });
      if (b) add(`活动文字敏感词 ${e.slug}`, false, `“${b}”`);
    }
    const a = await get(`/api/v1/events/${encodeURIComponent(e.slug)}/album`);
    add(`相册 ${e.slug}`, okJson(a), okJson(a) ? `${((a.j?.photos as unknown[]) ?? []).length} 张` : why(a));
    const w = await get(`/zh/e/${encodeURIComponent(e.slug)}`, {});
    add(`网页报名页 /zh/e/${e.slug}`, w.s === 200 && !/服务暂时不可用|Application error/.test(w.text ?? ''), why(w));
  }
  const lk = leaks(evs.j);
  if (lk.length) add('活动列表不该给小程序人数 / 金额', false, lk.join(' '));
  // 3. 商会资料
  const docs = await get('/api/v1/docs');
  for (const d of ((docs.j?.docs as { slug: string }[] | undefined) ?? [])) {
    const r = await get('/api/v1/docs/' + encodeURIComponent(d.slug));
    const n = ((r.j?.doc as { pages?: unknown[] } | undefined)?.pages ?? []).length;
    add(`商会资料 ${d.slug}`, okJson(r) && n > 0, okJson(r) ? `${n} 页` : why(r));
  }
  // 4. 小程序码真的能出（是图片，不是 JSON 报错）
  const code = await get('/api/v1/codes/chamber/1.png', {}, 30000);
  add('出小程序码 /codes/chamber', code.s === 200 && /image\//.test(code.ct ?? '') && (code.size ?? 0) > 2000, code.s === 200 ? `${code.ct} ${code.size}B` : why(code));
  // 5. 公开页面
  for (const p of ['/', '/zh', '/zh/events', '/zh/tools', '/zh/tools/glossary']) {
    const r = await get(p, {});
    add('网页 ' + p, r.s === 200 || r.s === 307 || r.s === 308, why(r));
  }
  // 6. 缺参数要给 4xx，不能 500（“服务暂时不可用”那一类）
  for (const p of ['/api/v1/events//album', '/api/v1/events/undefined/album', '/api/v1/events/undefined', '/api/v1/docs/undefined']) {
    const r = await get(p);
    add('缺参数不 500 ' + p, r.s > 0 && r.s < 500, why(r));
  }
  return { base: B, total: results.length, failed: results.filter((r) => !r.ok).length, results };
}
