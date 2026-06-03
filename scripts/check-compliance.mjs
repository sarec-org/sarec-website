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

  // 基础:universal 命中 + 入口隔离(入口2坏串在 universal scope 不命中)
  const uniZh = scan('本产品保证收益、承诺回报、保收益。', 'universal');
  const uniEn = scan('We promise guaranteed returns and promised returns.', 'universal');
  const isoZh = scan('我们帮你卖房、帮你融资、募集资金、帮你找买家、按成交分成。', 'universal');
  const isoEn = scan('We will raise capital, fundraising, find buyers, broker-dealer, placement agent.', 'universal');

  // A · 撮合性表达必须在 project-owner scope 命中
  const A = [
    '资源对接', '投资人对接', '帮你介绍投资人', '牵线搭桥', '撮合资金',
    'investor introductions', 'connect you with investors', 'partner introductions',
    'source investors', 'match you with investors', 'bring you investors', 'relationship introductions'
  ];
  const aMiss = A.filter((p) => scan(p, 'project-owner').length === 0);

  // B · Andy 指定中性词在 universal scope 不误伤(入口1 走 universal,含 融资可行性 等专业词)
  const B = [
    '内容资源', '市场知识资源', 'Chinese-market resources', 'content resources',
    'relationship-building materials', 'stakeholder education',
    '融资可行性', '资金结构', '贷款条件', '还款来源'
  ];
  const bHit = B.filter((p) => scan(p, 'universal').length > 0);

  // B2 · 入口2 允许的中性词在 project-owner scope 也不被组合词误伤(证明只禁组合词、不禁单字)
  const B2 = [
    '内容资源', '市场知识资源', 'Chinese-market resources', 'content resources',
    'relationship-building materials', 'stakeholder education', '华人市场教育材料',
    '信任建设材料', '关系建设材料', '内容资产', '华人市场定位', '项目说明材料', 'AI 搜索可见度'
  ];
  const b2Hit = B2.filter((p) => scan(p, 'project-owner').length > 0);

  console.log(`\n[universal 命中] 中 ${uniZh.length} / 英 ${uniEn.length}(应 ≥2)`);
  console.log(`[入口隔离] 入口2坏串在 universal scope 命中 中 ${isoZh.length} / 英 ${isoEn.length}(应 0)`);
  console.log(`[A · 撮合词必命中 @project-owner] ${A.length} 条,漏命中 ${aMiss.length} ${aMiss.length ? '→ ' + aMiss.join(' / ') : '✓'}`);
  console.log(`[B · 中性词不误伤 @universal] ${B.length} 条,误伤 ${bHit.length} ${bHit.length ? '→ ' + bHit.join(' / ') : '✓'}`);
  console.log(`[B2 · 入口2允许词不误伤 @project-owner] ${B2.length} 条,误伤 ${b2Hit.length} ${b2Hit.length ? '→ ' + b2Hit.join(' / ') : '✓'}`);

  const ok =
    uniZh.length >= 2 &&
    uniEn.length >= 2 &&
    isoZh.length === 0 &&
    isoEn.length === 0 &&
    aMiss.length === 0 &&
    bHit.length === 0 &&
    b2Hit.length === 0;
  console.log(ok ? '\n✓ 自测通过:撮合词全命中 + 中性词零误伤(双 scope)+ 入口隔离成立' : '\n✗ 自测失败');
  process.exit(ok ? 0 : 1);
}

// ---------- 正常扫描 ----------
const DEFAULT_TARGETS = [
  'lib/cta/registry.ts',
  'app/zh/(internal)/services/project-owners/page.tsx',
  'app/zh/(internal)/services/investors/page.tsx',
  'app/zh/(internal)/services/professional-firms/page.tsx'
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
