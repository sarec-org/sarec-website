#!/usr/bin/env node
// SAREC 线上只读巡检：不登录、只发 GET，按线上真实数据把小程序会走的公开接口、公开页面、出码接口过一遍。
// 用法：node patrol.mjs [https://sinoamericanrec.org]   → 打印结果；有失败时退出码 1；--json 输出 JSON（给后台红条 / 邮件用）
// 绝不：POST / PUT / DELETE、带登录、写任何数据。
const BASE = (process.argv.find((a) => /^https?:\/\//.test(a)) || 'https://sinoamericanrec.org').replace(/\/$/, '');
const JSON_OUT = process.argv.includes('--json');
const MP = { 'X-Sarec-Client': 'mp-1.3.3' };
// 小程序界面上不允许出现的字（接口给小程序的内容里也不应该有）
const BANNED = /会费|付款|奖励|德州扑克|麻将|掼蛋|赌|返现|红包|彩票|抽奖|\$\s?\d|¥\s?\d|\d+\s?美元/;
// 术语速查是房地产词典，解释里出现“费用 / 价格”等是正常的，只查赌博类和金额数字
const BANNED_GLOSSARY = /德州扑克|麻将|掼蛋|赌|\$\s?\d|¥\s?\d|\d+\s?美元/;
const results = [];
const add = (name, ok, detail) => results.push({ name, ok: !!ok, detail: detail || '' });
async function get(path, headers = MP, timeoutMs = 20000) {
  const t0 = Date.now(); const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(BASE + path, { headers, signal: ac.signal, redirect: 'manual' });
    const ct = r.headers.get('content-type') || ''; const buf = Buffer.from(await r.arrayBuffer());
    let j = null; if (ct.includes('json')) { try { j = JSON.parse(buf.toString('utf8')); } catch { /* */ } }
    return { s: r.status, ct, j, size: buf.length, ms: Date.now() - t0, text: ct.includes('json') || ct.includes('html') ? buf.toString('utf8') : '' };
  } catch (e) { return { s: 0, err: String(e.name === 'AbortError' ? '超时' : e.message), ms: Date.now() - t0 }; } finally { clearTimeout(tm); }
}
const okJson = (r) => r.s === 200 && r.j && r.j.ok === true;
const why = (r) => r.err || `${r.s} ${(r.j && r.j.error && (r.j.error.code + ' ' + r.j.error.message)) || r.ct}`;
const banned = (o, re) => { const m = JSON.stringify(o || '').match(re || BANNED); return m ? m[0] : ''; };
const leaks = (o) => { const s = JSON.stringify(o || ''); return ['"registered":', '"capacity":', '"amountCents"', '"priceCents"'].filter((k) => s.includes(k)); };

async function main() {
  // 1. 首页 / 列表 / 元数据
  const home = await get('/api/v1/home?v=131');
  add('首页接口 /home', okJson(home) && home.j.h131, okJson(home) ? `${home.ms}ms` : why(home));
  const evs = await get('/api/v1/events');
  add('活动列表 /events', okJson(evs), okJson(evs) ? `${(evs.j.events || []).length} 场 · ${evs.ms}ms` : why(evs));
  const past = await get('/api/v1/events?past=1');
  add('往期活动 /events?past=1', okJson(past), why(past));
  for (const p of ['default', 'contact', 'album']) { const m = await get('/api/v1/meta?p=' + p); add('元数据 /meta?p=' + p, okJson(m), why(m)); }
  for (const p of ['/api/v1/intro', '/api/v1/glossary', '/api/v1/docs', '/api/v1/content/research', '/api/v1/content/services', '/api/v1/cards/templates']) {
    const r = await get(p); const re = /glossary/.test(p) ? BANNED_GLOSSARY : BANNED;
    add('接口 ' + p, okJson(r), okJson(r) ? `${r.ms}ms` : why(r));
    if (okJson(r) && banned(r.j, re)) add('敏感词 ' + p, false, '出现“' + banned(r.j, re) + '”');
  }
  // 2. 每场活动：详情、相册、网页报名页、报名小程序码
  const all = [...((evs.j && evs.j.events) || []), ...((past.j && past.j.events) || []).slice(0, 3)];
  const seen = new Set();
  for (const e of all) {
    if (seen.has(e.slug)) continue; seen.add(e.slug);
    const d = await get('/api/v1/events/' + encodeURIComponent(e.slug));
    add(`活动详情 ${e.slug}`, okJson(d), why(d));
    if (okJson(d)) {
      const lk = leaks(d.j); if (lk.length) add(`活动详情不该给小程序人数 / 金额 ${e.slug}`, false, lk.join(' '));
      const b = banned({ t: d.j.event && d.j.event.title, s: d.j.event && d.j.event.summary }); if (b) add(`活动文字敏感词 ${e.slug}`, false, '“' + b + '”');
    }
    const a = await get(`/api/v1/events/${encodeURIComponent(e.slug)}/album`);
    add(`相册 ${e.slug}`, okJson(a), okJson(a) ? `${(a.j.photos || []).length} 张` : why(a));
    const w = await get(`/zh/e/${encodeURIComponent(e.slug)}`, {});
    add(`网页报名页 /zh/e/${e.slug}`, w.s === 200 && !/服务暂时不可用|Application error/.test(w.text), why(w));
  }
  const lk = leaks(evs.j); if (lk.length) add('活动列表不该给小程序人数 / 金额', false, lk.join(' '));
  // 3. 商会资料：每份公开资料
  const docs = await get('/api/v1/docs');
  for (const d of ((docs.j && docs.j.docs) || [])) { const r = await get('/api/v1/docs/' + encodeURIComponent(d.slug)); add(`商会资料 ${d.slug}`, okJson(r) && ((r.j.doc && r.j.doc.pages) || []).length > 0, okJson(r) ? `${((r.j.doc && r.j.doc.pages) || []).length} 页` : why(r)); }
  // 4. 小程序码：真的能出码（是图片，不是 JSON 报错）。商会邀请卡用 getwxacodeunlimit（不限量）
  const code = await get('/api/v1/codes/chamber/1.png', {}, 30000);
  add('出小程序码 /codes/chamber', code.s === 200 && /image\//.test(code.ct) && code.size > 2000, code.s === 200 ? `${code.ct} ${code.size}B` : why(code));
  // 5. 公开页面
  for (const p of ['/', '/zh', '/zh/events', '/zh/tools', '/zh/tools/glossary']) { const r = await get(p, {}); add('网页 ' + p, r.s === 200 || r.s === 307 || r.s === 308, why(r)); }
  // 6. 缺参数的路径要给 404 JSON，不能 500（东哥碰到的“服务暂时不可用”）
  for (const p of ['/api/v1/events//album', '/api/v1/events/undefined/album', '/api/v1/events/undefined', '/api/v1/docs/undefined']) { const r = await get(p); add('缺参数不 500 ' + p, r.s > 0 && r.s < 500, why(r)); }
}
await main();
const bad = results.filter((r) => !r.ok);
if (JSON_OUT) console.log(JSON.stringify({ base: BASE, at: new Date().toISOString(), total: results.length, failed: bad.length, results }, null, 1));
else { for (const r of results) console.log(r.ok ? '✅' : '❌', r.name, r.detail); console.log(`\n${BASE}：${results.length} 项，失败 ${bad.length} 项`); }
process.exit(bad.length ? 1 : 0);
