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

  const uniZh = scan('本产品保证收益、承诺回报、保收益。', 'universal');
  const uniEn = scan('We promise guaranteed returns and promised returns.', 'universal');

  const poZh = '我们帮你卖房、帮你融资、募集资金、帮你找买家、按成交分成。';
  const poEn = 'We will raise capital, fundraising, find buyers, broker-dealer, placement agent.';
  const poZhPO = scan(poZh, 'project-owner');
  const poZhUNI = scan(poZh, 'universal'); // 应为 0:证明入口1不会误伤这些入口2词
  const poEnPO = scan(poEn, 'project-owner');
  const poEnUNI = scan(poEn, 'universal');

  const neutral = '融资可行性、资金结构、贷款条件、还款来源、退出路径。';
  const neutralUNI = scan(neutral, 'universal'); // 应为 0:入口1专业词在 universal 下放行

  console.log(`\n[universal·中] 保证收益/承诺回报/保收益 → 命中 ${uniZh.length}:`, uniZh.join(' / '));
  console.log(`[universal·英] guaranteed/promised returns → 命中 ${uniEn.length}:`, uniEn.join(' / '));
  console.log(`\n[project-owner·中] 坏串 → PO scope 命中 ${poZhPO.length}:`, poZhPO.join(' / '));
  console.log(`[隔离验证·中] 同串在 universal scope 命中 ${poZhUNI.length}(应 0)`);
  console.log(`[project-owner·英] 坏串 → PO scope 命中 ${poEnPO.length}:`, poEnPO.join(' / '));
  console.log(`[隔离验证·英] 同串在 universal scope 命中 ${poEnUNI.length}(应 0)`);
  console.log(`\n[入口1中性词] 融资可行性/资金结构/贷款条件/还款来源/退出路径 → universal 命中 ${neutralUNI.length}(应 0)`);

  const ok =
    uniZh.length >= 2 &&
    uniEn.length >= 2 &&
    poZhPO.length >= 4 &&
    poZhUNI.length === 0 &&
    poEnPO.length >= 4 &&
    poEnUNI.length === 0 &&
    neutralUNI.length === 0;
  console.log(ok ? '\n✓ 自测通过:两层 + 入口隔离 + 中性词放行均正常' : '\n✗ 自测失败');
  process.exit(ok ? 0 : 1);
}

// ---------- 正常扫描 ----------
const DEFAULT_TARGETS = [
  'lib/cta/registry.ts',
  'app/zh/(internal)/services/project-owners/page.tsx',
  'app/zh/(internal)/services/investors/page.tsx'
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
