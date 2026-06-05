#!/usr/bin/env node
/**
 * 合规禁词检查 —— 两层 · 按入口 scope 生效 · 中英双语(实施方案 G.5)
 * ------------------------------------------------------------------
 * A. universal —— 全站绝对禁词(收益/回报类承诺),每个目标都查。
 * B. project-owner —— 仅入口 2(路径含 project-owner)及 CTA 单一事实源 registry.ts 额外强制。
 *    入口 1 投资人页只查 universal,允许 融资可行性 / 资金结构 等专业词。
 *
 * 单一事实源:lib/compliance/forbiddenWords.ts(脚本解析,不重抄)。
 *
 * 用法:
 *   node scripts/check-compliance.mjs                 # 扫默认目标(各自按 scope)
 *   node scripts/check-compliance.mjs <文件...>       # 扫指定文件(scope 由路径推断)
 *   node scripts/check-compliance.mjs --selftest      # 两层自测(含"入口1中性词不被误伤"验证)
 *
 * ⚠️ 仅查死词。组合表达需战略 Claude 人工复读 + Andy/律师终审。
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC = readFileSync(resolve(ROOT, 'lib/compliance/forbiddenWords.ts'), 'utf8');

function parseTable(name) {
  const blk = SRC.match(new RegExp(`${name}[\\s\\S]*?=\\s*\\{([\\s\\S]*?)\\n\\};`));
  if (!blk) {
    console.error(`✗ 无法解析 ${name}(结构变了?)`);
    process.exit(2);
  }
  const pick = (lang) => {
    const a = blk[1].match(new RegExp(`${lang}:\\s*\\[([\\s\\S]*?)\\]`));
    return a ? [...a[1].matchAll(/(['"])(.*?)\1/g)].map((m) => m[2]) : [];
  };
  return { zh: pick('zh'), en: pick('en') };
}

const UNI = parseTable('UNIVERSAL_FORBIDDEN_WORDS');
const PO = parseTable('PROJECT_OWNER_FORBIDDEN_WORDS');

const hasLatin = (w) => /[a-z]/i.test(w);
function matchList(text, lower, list) {
  return list.filter((w) => (hasLatin(w) ? lower.includes(w.toLowerCase()) : text.includes(w)));
}
function scan(text, scope) {
  const lower = text.toLowerCase();
  const hits = [...matchList(text, lower, UNI.zh), ...matchList(text, lower, UNI.en)];
  if (scope === 'project-owner') {
    hits.push(...matchList(text, lower, PO.zh), ...matchList(text, lower, PO.en));
  }
  return hits;
}
function scopeFor(rel) {
  return rel.includes('project-owner') || rel.endsWith('lib/cta/registry.ts') ? 'project-owner' : 'universal';
}

const args = process.argv.slice(2);

// ---------- 自测 ----------
if (args.includes('--selftest')) {
  console.log(`禁词表载入:universal zh=${UNI.zh.length}/en=${UNI.en.length} · project-owner zh=${PO.zh.length}/en=${PO.en.length}`);

  // 基础:universal 收益类命中 + 入口隔离(入口2 专属词在 universal 不命中)
  const uniZh = scan('本产品保证收益、承诺回报、保收益。', 'universal');
  const uniEn = scan('We promise guaranteed returns and promised returns.', 'universal');
  const isoZh = scan('我们帮你卖房、帮你找买家、按成交分成。', 'universal'); // 入口2 专属,universal 应 0
  const isoEn = scan('We will find buyers, broker-dealer, placement agent.', 'universal');

  // A · 撮合/对接/共投/募资类(M4-S0 已上提)必须在 universal scope 命中(任意路径)
  const A = [
    '资本对接', '资源对接', '项目对接', '资金与项目的匹配', '撮合交易', '牵线搭桥', '找投资人', '募集资金',
    '共投', '项目共投', '联合开发', '共同出资',
    'raise capital', 'fundraising', 'find investors', 'matchmaking', 'co-investment', 'joint venture'
  ];
  const aMiss = A.filter((p) => scan(p, 'universal').length === 0);

  // B · 中性词在 universal scope 必须零命中(证明只录组合词、不录单字)
  const B = [
    '融资可行性', '资金结构', '贷款条件', '还款来源', '资源协同', '落地协同',
    'content resources', 'capital structure', 'financing feasibility', 'project feasibility', 'cross-cultural clarity'
  ];
  const bHit = B.filter((p) => scan(p, 'universal').length > 0);

  console.log(`\n[universal 收益类命中] 中 ${uniZh.length} / 英 ${uniEn.length}(应 ≥2)`);
  console.log(`[入口隔离] 入口2专属词在 universal 命中 中 ${isoZh.length} / 英 ${isoEn.length}(应 0)`);
  console.log(`[A · 撮合/共投词必命中 @universal] ${A.length} 条,漏命中 ${aMiss.length} ${aMiss.length ? '→ ' + aMiss.join(' / ') : '✓'}`);
  console.log(`[B · 中性词不误伤 @universal] ${B.length} 条,误伤 ${bHit.length} ${bHit.length ? '→ ' + bHit.join(' / ') : '✓'}`);

  const ok =
    uniZh.length >= 2 &&
    uniEn.length >= 2 &&
    isoZh.length === 0 &&
    isoEn.length === 0 &&
    aMiss.length === 0 &&
    bHit.length === 0;
  console.log(ok ? '\n✓ 自测通过:撮合/共投词全命中 @universal + 中性词零误伤 + 入口隔离成立' : '\n✗ 自测失败');
  process.exit(ok ? 0 : 1);
}

// ---------- 正常扫描 ----------
const DEFAULT_TARGETS = [
  'lib/cta/registry.ts',
  'lib/content.ts',
  'app/zh/layout.tsx',
  'app/zh/(internal)/services/page.tsx',
  'app/zh/(internal)/services/project-owners/page.tsx',
  'app/zh/(internal)/services/investors/page.tsx',
  'app/zh/(internal)/services/professional-firms/page.tsx',
  'app/zh/(internal)/services/strategy/page.tsx',
  'app/zh/(internal)/services/development/page.tsx',
  'app/zh/(internal)/services/due-diligence/page.tsx',
  'app/zh/(internal)/services/capital/page.tsx',
  'app/zh/(internal)/solutions/page.tsx',
  'app/zh/(internal)/about/page.tsx',
  'app/zh/(internal)/about/founder/page.tsx',
  'app/zh/(internal)/membership/page.tsx',
  'app/zh/(internal)/contact/page.tsx',
  'app/zh/(internal)/contact/thanks/page.tsx',
  'app/zh/(internal)/projects/page.tsx',
  'app/zh/(internal)/case-studies/page.tsx',
  'app/zh/(internal)/events/page.tsx',
  'app/zh/(internal)/events/EventsHero.tsx',
  'components/layout/SiteFooter.tsx',
  'components/sections/H03WhySarec.tsx',
  'components/sections/H04ThreeLayers.tsx',
  'components/sections/H05TrustAnchors.tsx',
  'components/sections/H06ProjectsFeatured.tsx',
  'components/sections/H09FAQ.tsx',
  'components/sections/services/S01HeroSpread.tsx',
  'components/sections/services/S02ThreeLayersOverview.tsx',
  'components/sections/services/S03Chamber.tsx',
  'components/sections/services/S04Advisory.tsx'
];

const targets = (args.length ? args : DEFAULT_TARGETS)
  .map((p) => resolve(ROOT, p))
  .filter((p) => existsSync(p));

if (targets.length === 0) {
  console.log('（无可扫描目标)');
  process.exit(0);
}

let total = 0;
for (const file of targets) {
  const rel = file.replace(ROOT + '/', '');
  const scope = scopeFor(rel);
  const hits = scan(readFileSync(file, 'utf8'), scope);
  if (hits.length) {
    total += hits.length;
    console.log(`✗ [${scope}] ${rel} —— 命中:${hits.join(' / ')}`);
  } else {
    console.log(`✓ [${scope}] ${rel} —— 干净`);
  }
}
console.log(
  total
    ? `\n✗ 共命中 ${total} 处,文案不通过第一道。`
    : `\n✓ 全部通过第一道(两层 · 中英)。组合表达仍需战略 Claude 复读 + Andy/律师终审。`
);
process.exit(total ? 1 : 0);
