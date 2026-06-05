/**
 * SAREC 移动端自动验收 — Playwright (Phase 2B-0)
 * 用法: 确保 dev server 在跑(pnpm dev), 然后:
 *   node scripts/mobile-acceptance.mjs
 *   BASE=http://192.168.x.x:3000 node scripts/mobile-acceptance.mjs
 * 产出: PASS/FAIL 控制台 + 截图 + summary.md → ~/Desktop/sarec-phase2b-acceptance/
 *
 * 检测三类(只读, 不改站点):
 *   1) 跨页前进导航 → 目标页是否回顶 (scrollY < 30)
 *   2) hash 链接 → 目标元素是否落在 0–120px
 *   3) 后退恢复 → 回到原页是否恢复滚动位置 (±150px)
 *   4) hero 标题 → 是否被 sticky nav 遮挡 / 出屏 / 横向溢出
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = process.env.ACCEPT_OUT || join(homedir(), 'Desktop', 'sarec-phase2b-acceptance');
const PRIMARY = { width: 390, height: 700 }; // 贴近 Andy 华为可视高度(工具栏挤压)
const HERO_VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 }
];

const lines = [];
function log(s) { console.log(s); lines.push(s); }

async function settle(p, ms = 800) { await p.waitForTimeout(ms); }

async function newPage(browser, vp) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  return { ctx, p };
}

// sticky nav 底边(viewport 坐标)。只算"真正的顶栏"(高度<160 的 sticky/fixed 条),
// 排除 position:fixed 且 height:100vh 的移动端抽屉菜单(否则会把整屏当成 nav)。
async function navBottom(p) {
  return p.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const vh = document.documentElement.clientHeight;
    let bottom = 0;
    for (const el of all) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'sticky' && cs.position !== 'fixed') continue;
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity || '1') === 0) continue;
      const r = el.getBoundingClientRect();
      const h = r.height;
      if (r.top <= 2 && h > 8 && h < 160 && h < vh * 0.4 && r.width > 80) {
        if (r.bottom > bottom) bottom = r.bottom;
      }
    }
    return Math.round(bottom);
  });
}

async function shot(p, name) {
  await p.screenshot({ path: join(OUT, name) });
}

// ---------- 1) 跨页前进导航回顶 ----------
const NAV_TARGETS = [
  { href: '/zh/about', label: 'SAREC 介绍/关于' },
  { href: '/zh/services', label: '服务' },
  { href: '/zh/membership', label: '会员服务' },
  { href: '/zh/research', label: '研究中心' },
  { href: '/zh/events', label: '活动与考察' },
  // 注:footer「项目案例」实际指向 /zh/case-studies(非 /zh/projects);/zh/projects 仅作 hero 检查页。
  { href: '/zh/case-studies', label: '项目案例(case-studies)' },
  { href: '/zh/contact', label: '联系' },
  { href: '/zh/about/founder', label: '创始人' }
];
// 来源页: 含一个 restoration 受影响页(service 子页)以复现"manual 污染"场景
const NAV_SOURCES = ['/zh', '/zh/services/strategy', '/zh/research', '/zh/events'];

async function testNavToTop(browser) {
  log('\n========== 1) 跨页前进导航回顶 (scrollY<30) ==========');
  const results = [];
  for (const src of NAV_SOURCES) {
    const { ctx, p } = await newPage(browser, PRIMARY);
    try {
      await p.goto(`${BASE}${src}`, { waitUntil: 'networkidle' }); await settle(p, 600);
      for (const t of NAV_TARGETS) {
        if (t.href === src) continue;
        try {
          await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await settle(p, 300);
          const loc = p.locator(`a[href="${t.href}"]:visible`).last();
          if (await loc.count() === 0) { log(`SKIP  ${src} → "${t.label}" ${t.href} (footer 无可见链接)`); continue; }
          await loc.click({ timeout: 8000 });
          await p.waitForURL(`**${t.href}`, { timeout: 8000 }); await settle(p, 600);
          const y = await p.evaluate(() => window.scrollY);
          const pass = y < 30;
          results.push({ src, target: t.href, label: t.label, y, pass });
          log(`${pass ? 'PASS' : 'FAIL'}  ${src}  → footer "${t.label}" ${t.href}  scrollY=${y}`);
          if (!pass) await shot(p, `navfail__${src.replace(/\//g,'_')}__to__${t.href.replace(/\//g,'_')}.png`);
          // 回到来源页继续下一个
          await p.goto(`${BASE}${src}`, { waitUntil: 'networkidle' }); await settle(p, 400);
        } catch (e) {
          results.push({ src, target: t.href, label: t.label, y: 'ERR', pass: false, err: String(e).slice(0,80) });
          log(`ERR   ${src} → ${t.href}  ${String(e).slice(0,80)}`);
          await p.goto(`${BASE}${src}`, { waitUntil: 'networkidle' }).catch(()=>{}); await settle(p, 400);
        }
      }
    } finally { await ctx.close(); }
  }
  return results;
}

// ---------- 2) hash 链接 ----------
async function testHash(browser) {
  log('\n========== 2) hash 链接 (#project-evaluation rect.top 0–120) ==========');
  const results = [];
  // direct load
  {
    const { ctx, p } = await newPage(browser, PRIMARY);
    try {
      await p.goto(`${BASE}/zh/contact#project-evaluation`, { waitUntil: 'networkidle' }); await settle(p, 1000);
      const rel = await p.evaluate(() => { const e = document.getElementById('project-evaluation'); return e ? Math.round(e.getBoundingClientRect().top) : null; });
      const pass = rel !== null && rel >= -5 && rel <= 120;
      results.push({ kind: 'direct-load', rel, pass });
      log(`${pass ? 'PASS' : 'FAIL'}  hash direct-load  rect.top=${rel}`);
      await shot(p, 'hash__direct-load.png');
    } finally { await ctx.close(); }
  }
  // footer click
  {
    const { ctx, p } = await newPage(browser, PRIMARY);
    try {
      await p.goto(`${BASE}/zh/about`, { waitUntil: 'networkidle' }); await settle(p, 500);
      const loc = p.locator('a[href="/zh/contact#project-evaluation"]').last();
      if (await loc.count() > 0) {
        await loc.click({ timeout: 8000 });
        await p.waitForURL('**/zh/contact**', { timeout: 8000 }); await settle(p, 1000);
        const rel = await p.evaluate(() => { const e = document.getElementById('project-evaluation'); return e ? Math.round(e.getBoundingClientRect().top) : null; });
        const pass = rel !== null && rel >= -5 && rel <= 120;
        results.push({ kind: 'footer-click', rel, pass });
        log(`${pass ? 'PASS' : 'FAIL'}  hash footer-click  rect.top=${rel}`);
      } else { log('SKIP  hash footer-click (link not found on /zh/about)'); }
    } finally { await ctx.close(); }
  }
  return results;
}

// ---------- 3) 后退恢复 ----------
const BACK_CASES = [
  { name: 'research列表→文章→后退', src: '/zh/research', linkSel: 'a[href^="/zh/research/"]' },
  { name: '服务子页→其他页→后退', src: '/zh/services/strategy', linkSel: 'a[href="/zh/about"]' },
  { name: '文章页→footer→后退', src: '/zh/research/los-angeles-ed1-affordable-housing', linkSel: 'a[href="/zh/contact"]' }
];
async function testBackRestore(browser) {
  log('\n========== 3) 后退恢复 (±150px) ==========');
  const results = [];
  for (const c of BACK_CASES) {
    const { ctx, p } = await newPage(browser, PRIMARY);
    try {
      await p.goto(`${BASE}${c.src}`, { waitUntil: 'networkidle' }); await settle(p, 700);
      const maxY = await p.evaluate(() => document.body.scrollHeight - window.innerHeight);
      const target = Math.min(1200, Math.max(400, Math.round(maxY * 0.45)));
      await p.evaluate((y) => window.scrollTo(0, y), target); await settle(p, 400);
      const loc = p.locator(`${c.linkSel}:visible`).last();
      if (await loc.count() === 0) { log(`SKIP  ${c.name} (link ${c.linkSel} not found/visible)`); await ctx.close(); continue; }
      await loc.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
      const leaveY = await p.evaluate(() => window.scrollY);
      await loc.click({ timeout: 8000 });
      await p.waitForURL((u) => !u.pathname.replace(/\/$/,'').endsWith(c.src.replace(/\/$/,'')), { timeout: 8000 }).catch(()=>{});
      await settle(p, 600);
      await p.goBack(); await settle(p, 1100);
      const restored = await p.evaluate(() => window.scrollY);
      const diff = Math.abs(restored - leaveY);
      const pass = diff <= 150;
      results.push({ name: c.name, leaveY, restored, diff, pass });
      log(`${pass ? 'PASS' : 'FAIL'}  ${c.name}  leave=${leaveY} restored=${restored} diff=${diff}`);
    } catch (e) {
      results.push({ name: c.name, pass: false, err: String(e).slice(0,80) });
      log(`ERR   ${c.name}  ${String(e).slice(0,80)}`);
    } finally { await ctx.close(); }
  }
  return results;
}

// ---------- 4) hero 检查 ----------
const HERO_PAGES = [
  { slug: 'events', url: '/zh/events' },
  { slug: 'research', url: '/zh/research' },
  { slug: 'services', url: '/zh/services' },
  { slug: 'membership', url: '/zh/membership' },
  { slug: 'projects', url: '/zh/projects' },
  { slug: 'about', url: '/zh/about' },
  { slug: 'rosewood', url: '/zh/case-studies/4136-rosewood' }
];
async function testHero(browser) {
  log('\n========== 4) hero 标题遮挡/出屏/横向溢出 ==========');
  const results = [];
  for (const vp of HERO_VIEWPORTS) {
    for (const pg of HERO_PAGES) {
      const { ctx, p } = await newPage(browser, vp);
      try {
        await p.goto(`${BASE}${pg.url}`, { waitUntil: 'networkidle' }); await settle(p, 1200);
        const nav = await navBottom(p);
        const info = await p.evaluate(() => {
          const h1 = document.querySelector('h1');
          const vw = document.documentElement.clientWidth;
          const vh = document.documentElement.clientHeight;
          const hOverflow = document.documentElement.scrollWidth > vw + 1;
          if (!h1) return { hasH1: false, hOverflow, vw, vh };
          const r = h1.getBoundingClientRect();
          return {
            hasH1: true, hOverflow, vw, vh,
            top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right),
            text: (h1.textContent || '').trim().slice(0, 24)
          };
        });
        const issues = [];
        if (!info.hasH1) issues.push('无 h1');
        else {
          if (info.top < nav - 2) issues.push(`标题被 sticky nav 遮挡(titleTop=${info.top} < navBottom=${nav})`);
          if (info.right > info.vw + 1 || info.left < -1) issues.push(`标题横向出屏(left=${info.left},right=${info.right},vw=${info.vw})`);
          if (info.top < -1) issues.push(`标题上方被裁(top=${info.top})`);
        }
        if (info.hOverflow) issues.push('页面横向溢出');
        const pass = issues.length === 0;
        results.push({ vp: `${vp.width}x${vp.height}`, slug: pg.slug, pass, issues, info, nav });
        log(`${pass ? 'PASS' : 'FAIL'}  [${vp.width}x${vp.height}] ${pg.slug}  navBottom=${nav} titleTop=${info.top ?? '-'} "${info.text ?? ''}"  ${issues.join(' | ')}`);
        await shot(p, `hero__${pg.slug}__${vp.width}.png`);
      } catch (e) {
        results.push({ vp: `${vp.width}x${vp.height}`, slug: pg.slug, pass: false, err: String(e).slice(0,80) });
        log(`ERR   [${vp.width}] ${pg.slug}  ${String(e).slice(0,80)}`);
      } finally { await ctx.close(); }
    }
  }
  return results;
}

(async () => {
  await mkdir(OUT, { recursive: true });
  log(`SAREC Phase 2B 移动端验收  BASE=${BASE}  primary=${PRIMARY.width}x${PRIMARY.height}`);
  const browser = await chromium.launch();
  const nav = await testNavToTop(browser);
  const hash = await testHash(browser);
  const back = await testBackRestore(browser);
  const hero = await testHero(browser);
  await browser.close();

  const navFail = nav.filter((r) => !r.pass);
  const backFail = back.filter((r) => !r.pass);
  const heroFail = hero.filter((r) => !r.pass);
  const hashFail = hash.filter((r) => !r.pass);
  log('\n========== 汇总 ==========');
  log(`导航回顶: ${nav.length - navFail.length}/${nav.length} PASS, ${navFail.length} FAIL`);
  log(`hash 链接: ${hash.length - hashFail.length}/${hash.length} PASS`);
  log(`后退恢复: ${back.length - backFail.length}/${back.length} PASS`);
  log(`hero 检查: ${hero.length - heroFail.length}/${hero.length} PASS, ${heroFail.length} FAIL`);

  await writeFile(join(OUT, 'summary.md'), lines.join('\n'), 'utf8');
  console.log(`\n报告: ${join(OUT, 'summary.md')}  截图同目录`);
})();
