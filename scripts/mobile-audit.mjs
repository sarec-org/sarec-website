/**
 * SAREC 手机端自动审查 — Playwright
 * 用法:确保 dev server 在跑(pnpm dev,默认 :3000),然后:
 *   node scripts/mobile-audit.mjs
 *   BASE=http://192.168.86.86:3000 node scripts/mobile-audit.mjs   # 指定地址
 * 输出:截图 + report.md 到 ~/sarec-mobile-audit/
 * 检测:横向溢出 / 文字截断 / 标题孤字 / 元素越界 / 图片·视频加载 / 关键内容缺失 / 链接 href
 * ⚠ 只读审查,不改站点;不需要 pnpm build,跑在 dev server 上。
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = join(homedir(), 'sarec-mobile-audit');

const WIDTHS = [
  { w: 360, label: '360-Android' },
  { w: 375, label: '375-iPhoneSE' },
  { w: 390, label: '390-iPhone' },
  { w: 430, label: '430-iPhoneMax' }
];

const PAGES = [
  { slug: 'home', url: '/zh', must: ['连接中美'] },
  { slug: 'about', url: '/zh/about', must: ['关于'] },
  { slug: 'founder', url: '/zh/about/founder', must: ['Andy'] },
  { slug: 'services', url: '/zh/services', must: ['三层服务'] },
  { slug: 'membership', url: '/zh/membership', must: ['加入', '活动与考察', '会员权益'] },
  { slug: 'events', url: '/zh/events', must: ['活动与考察'] },
  { slug: 'projects', url: '/zh/projects', must: ['项目'] },
  { slug: 'case-studies', url: '/zh/case-studies', must: ['项目案例', '查看判断方法论'] },
  { slug: 'rosewood', url: '/zh/case-studies/4136-rosewood', must: ['Rosewood'] },
  { slug: 'contact', url: '/zh/contact', must: ['联系'] },
  { slug: 'research', url: '/zh/research', must: ['研究中心', '关键数据'] },
  { slug: 'art-cap-rate', url: '/zh/research/cap-rate-irr-roe', must: [] },
  { slug: 'art-cn-risks', url: '/zh/research/chinese-investors-us-real-estate-risks', must: [] },
  { slug: 'art-eb5', url: '/zh/research/eb5', must: [] },
  { slug: 'art-framework', url: '/zh/research/framework', must: [] },
  { slug: 'art-pitfalls', url: '/zh/research/investment-pitfalls', must: [] },
  { slug: 'art-ed1', url: '/zh/research/los-angeles-ed1-affordable-housing', must: [] },
  { slug: 'art-lp-gp', url: '/zh/research/lp-gp-structure', must: ['利益边界'] },
  { slug: 'art-risk-checklist', url: '/zh/research/risk-checklist', must: [] },
  { slug: 'art-dev-process', url: '/zh/research/us-real-estate-development-process', must: [] }
];

// 监控这些链接文字 → 记录其 href(查错跳)
const LINK_WATCH = ['查看判断方法论', '活动与考察', '查看会员权益', '了解 SAREC', '前往研究专栏'];

const audit = ({ must: mustList, watch: watchList }) => {
  const W = window.innerWidth;
  const out = { horizontalOverflow: false, scrollW: 0, innerW: W, offenders: [], clippedText: [], orphanHeadings: [], brokenImages: [], videos: [], missingContent: [], watchedLinks: [] };
  out.scrollW = document.documentElement.scrollWidth;
  out.horizontalOverflow = out.scrollW > W + 1;

  // 越界元素 —— 仅在「真横向溢出」时统计(globals overflow-x:hidden 已裁掉 100vw 误报);
  // 排除 SVG 内部、off-canvas 菜单(aria-hidden / visibility:hidden / translate 出屏)
  const SVG = new Set(['svg', 'g', 'path', 'ellipse', 'circle', 'line', 'rect', 'use', 'text', 'defs', 'lineargradient', 'radialgradient', 'stop', 'polygon', 'polyline']);
  if (out.horizontalOverflow) {
    for (const el of document.querySelectorAll('body *')) {
      const tag = el.tagName.toLowerCase();
      if (SVG.has(tag)) continue;
      if (el.closest('[aria-hidden="true"]')) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const tr = cs.transform;
      if (tr && tr !== 'none' && /matrix.*-?\d{3,}/.test(tr)) continue; // 明显位移出屏
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.right > W + 2) {
        const cls = (el.className && el.className.toString) ? el.className.toString().trim().slice(0, 40) : '';
        out.offenders.push(`${tag}.${cls} right=${Math.round(r.right)}`);
        if (out.offenders.length >= 8) break;
      }
    }
  }

  // 文字截断(overflow 隐藏且内容被裁)
  for (const el of document.querySelectorAll('h1,h2,h3,p,span,a,li,div')) {
    const cs = getComputedStyle(el);
    if ((cs.overflow === 'hidden' || cs.overflowX === 'hidden' || cs.textOverflow === 'ellipsis') &&
        el.scrollWidth > el.clientWidth + 3 && el.clientWidth > 0 && el.children.length === 0) {
      const t = (el.textContent || '').trim().slice(0, 24);
      if (t) out.clippedText.push(`"${t}" (${el.scrollWidth}>${el.clientWidth})`);
      if (out.clippedText.length >= 8) break;
    }
  }

  // 标题孤字(最后一行只剩 1 个 CJK 字)
  for (const h of document.querySelectorAll('h1,h2,h3')) {
    const txt = (h.textContent || '').trim();
    if (txt.length < 4) continue;
    const range = document.createRange();
    range.selectNodeContents(h);
    const rects = [...range.getClientRects()];
    if (rects.length < 2) continue;
    const tops = {};
    for (const r of rects) { const k = Math.round(r.top); tops[k] = Math.max(tops[k] || 0, r.width); }
    const keys = Object.keys(tops).map(Number).sort((a, b) => a - b);
    if (keys.length < 2) continue;
    const lastW = tops[keys[keys.length - 1]];
    const fs = parseFloat(getComputedStyle(h).fontSize) || 16;
    if (lastW <= fs * 1.45) out.orphanHeadings.push(`"${txt.slice(0, 28)}" 末行宽${Math.round(lastW)}≈${(lastW / fs).toFixed(1)}字`);
  }

  // 图片加载
  for (const img of document.querySelectorAll('img')) {
    if (img.complete && img.naturalWidth === 0) {
      out.brokenImages.push((img.currentSrc || img.src || '').split('/').pop());
    }
  }
  // 视频状态
  for (const v of document.querySelectorAll('video')) {
    out.videos.push({ poster: !!v.poster, readyState: v.readyState, videoW: v.videoWidth || 0, paused: v.paused, src: (v.currentSrc || '').split('/').pop() });
  }

  // 关键内容缺失
  const body = document.body.innerText || '';
  for (const kw of mustList) if (!body.includes(kw)) out.missingContent.push(kw);

  // 监控链接 href
  for (const a of document.querySelectorAll('a')) {
    const t = (a.textContent || '').trim();
    for (const w of watchList) if (t.includes(w)) out.watchedLinks.push(`"${t.slice(0, 18)}" → ${a.getAttribute('href')}`);
  }
  return out;
};

const run = async () => {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const findings = [];
  let shots = 0;

  for (const { w, label } of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148' });
    const page = await ctx.newPage();
    for (const p of PAGES) {
      const rec = { page: p.slug, url: p.url, width: w, label, ok: true, http: null, issues: [], data: null, shot: null };
      try {
        const resp = await page.goto(BASE + p.url, { waitUntil: 'networkidle', timeout: 45000 });
        rec.http = resp ? resp.status() : null;
        if (rec.http !== 200) { rec.ok = false; rec.issues.push(`HTTP ${rec.http}`); }
        await page.waitForTimeout(1200); // 给视频/动画/图片一点时间
        const shot = `${p.slug}__${w}.png`;
        await page.screenshot({ path: join(OUT, shot), fullPage: true });
        rec.shot = shot; shots++;
        const d = await page.evaluate(audit, { must: p.must, watch: LINK_WATCH });
        rec.data = d;
        if (d.horizontalOverflow) rec.issues.push(`横向溢出 scrollW=${d.scrollW}>${d.innerW}`);
        if (d.offenders.length) rec.issues.push(`越界元素: ${d.offenders.slice(0, 4).join(' | ')}`);
        if (d.clippedText.length) rec.issues.push(`文字截断: ${d.clippedText.slice(0, 4).join(' | ')}`);
        if (d.orphanHeadings.length) rec.issues.push(`标题孤字: ${d.orphanHeadings.slice(0, 4).join(' | ')}`);
        if (d.brokenImages.length) rec.issues.push(`图片加载失败: ${d.brokenImages.join(', ')}`);
        // 仅当「视频未出画 且 无 poster 兜底」才算可能黑(有 poster 则有兜底图,不黑)
        const badV = d.videos.filter((v) => v.videoW === 0 && !v.poster);
        if (badV.length) rec.issues.push(`视频可能黑(无 poster 兜底): ${badV.map((v) => `${v.src} rs=${v.readyState}`).join('; ')}`);
        if (d.missingContent.length) rec.issues.push(`关键内容缺失: ${d.missingContent.join(', ')}`);
      } catch (e) {
        rec.ok = false; rec.issues.push('异常: ' + (e.message || e).slice(0, 80));
      }
      findings.push(rec);
      process.stdout.write(rec.issues.length ? 'x' : '.');
    }
    await ctx.close();
  }
  await browser.close();

  // 报告
  const withIssues = findings.filter((f) => f.issues.length);
  let md = `# SAREC 手机端自动审查报告\n\nBASE=${BASE} · 尺寸 ${WIDTHS.map((x) => x.w).join('/')} · 页面 ${PAGES.length} · 截图 ${shots} 张(${OUT})\n\n`;
  md += `## 有问题的 页×尺寸:${withIssues.length} / ${findings.length}\n\n`;
  // 按页聚合
  for (const p of PAGES) {
    const rows = findings.filter((f) => f.page === p.slug);
    const probs = rows.filter((r) => r.issues.length);
    if (!probs.length) { md += `### ✅ ${p.slug} (${p.url}) — 全尺寸无自动问题\n\n`; continue; }
    md += `### ⚠️ ${p.slug} (${p.url})\n`;
    for (const r of probs) md += `- **${r.width}px** [${r.shot}]: ${r.issues.join(' ;; ')}\n`;
    // 链接 href(取一个尺寸的)
    const wl = rows.find((r) => r.data && r.data.watchedLinks.length);
    if (wl) md += `  - 链接: ${[...new Set(wl.data.watchedLinks)].join(' | ')}\n`;
    md += `\n`;
  }
  await writeFile(join(OUT, 'report.md'), md);
  console.log(`\n\n报告: ${join(OUT, 'report.md')}`);
  console.log(`有问题 页×尺寸: ${withIssues.length}/${findings.length}`);
};

run().catch((e) => { console.error(e); process.exit(1); });
