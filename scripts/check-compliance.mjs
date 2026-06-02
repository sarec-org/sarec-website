#!/usr/bin/env node
/**
 * 入口 2(项目方)合规禁词检查 —— 中英双语(实施方案 G.5)
 * ------------------------------------------------------------------
 * 第一道「查死词」:从 lib/compliance/forbiddenWords.ts 取中英禁词表(单一事实源),
 * 扫描目标文件(中文 includes / 英文大小写不敏感),命中即非零退出。
 *
 * 用法:
 *   node scripts/check-compliance.mjs                 # 扫默认目标(registry + project-owners 内容)
 *   node scripts/check-compliance.mjs <文件...>       # 扫指定文件
 *   node scripts/check-compliance.mjs --selftest      # 自测:中英坏串各喂一条,验证能检出
 *
 * ⚠️ 仅查死词。组合表达(中:「让您的资产更快流转」/ 英:"move your assets faster")grep 检不出,
 *    必须叠加战略 Claude 人工复读 + Andy/律师终审。
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---- 从 forbiddenWords.ts 解析中英禁词表(保持单一事实源,不在脚本里重抄)----
function loadForbiddenWords() {
  const src = readFileSync(resolve(ROOT, 'lib/compliance/forbiddenWords.ts'), 'utf8');
  const pick = (lang) => {
    const block = src.match(new RegExp(`${lang}:\\s*\\[([\\s\\S]*?)\\]`));
    if (!block) return [];
    // 提取单引号或双引号字符串
    return [...block[1].matchAll(/(['"])(.*?)\1/g)].map((m) => m[2]);
  };
  const zh = pick('zh');
  const en = pick('en');
  if (zh.length === 0 || en.length === 0) {
    console.error(`✗ 禁词表解析异常(zh=${zh.length} en=${en.length}),检查 forbiddenWords.ts 结构`);
    process.exit(2);
  }
  return { zh, en };
}

function scan(text, words) {
  const lower = text.toLowerCase();
  const hitZh = words.zh.filter((w) => text.includes(w));
  const hitEn = words.en.filter((w) => lower.includes(w.toLowerCase()));
  return [...hitZh, ...hitEn];
}

const WORDS = loadForbiddenWords();
const args = process.argv.slice(2);

// ---- 自测模式 ----
if (args.includes('--selftest')) {
  console.log(`禁词表载入:中文 ${WORDS.zh.length} 条 / 英文 ${WORDS.en.length} 条`);

  const zhBad = '我们帮你卖房、帮你募资,保证收益还能按成交分成,帮你找投资人。';
  const enBad = 'We will raise capital, guarantee returns, and find investors for you, with guaranteed leads.';

  const zhHits = scan(zhBad, { zh: WORDS.zh, en: [] });
  const enHits = scan(enBad, { zh: [], en: WORDS.en });

  console.log(`\n[自测·中文] 坏样本:「${zhBad}」`);
  console.log(`[自测·中文] 命中 ${zhHits.length} 条:`, zhHits.join(' / '));
  console.log(`\n[自测·英文] 坏样本:「${enBad}」`);
  console.log(`[自测·英文] 命中 ${enHits.length} 条:`, enHits.join(' / '));

  const ok = zhHits.length >= 4 && enHits.length >= 4;
  console.log(ok ? '\n✓ 自测通过:中英检测逻辑均工作正常' : '\n✗ 自测失败:应检出却没检出');
  process.exit(ok ? 0 : 1);
}

// ---- 正常扫描 ----
const DEFAULT_TARGETS = [
  'lib/cta/registry.ts', // 含 project-growth 中英文案
  'app/zh/(internal)/services/project-owners/page.tsx', // M3 落地,现可能不存在
  'app/zh/services/project-owners/page.tsx'
];

const targets = (args.length ? args : DEFAULT_TARGETS)
  .map((p) => resolve(ROOT, p))
  .filter((p) => existsSync(p));

if (targets.length === 0) {
  console.log('（无可扫描的目标文件;project-owners 页面将在 M3 落地后纳入)');
  console.log(`禁词表已就绪:中文 ${WORDS.zh.length} 条 / 英文 ${WORDS.en.length} 条`);
  process.exit(0);
}

let totalHits = 0;
for (const file of targets) {
  const text = readFileSync(file, 'utf8');
  const hits = scan(text, WORDS);
  const rel = file.replace(ROOT + '/', '');
  if (hits.length) {
    totalHits += hits.length;
    console.log(`✗ ${rel} —— 命中禁词:${hits.join(' / ')}`);
  } else {
    console.log(`✓ ${rel} —— 干净(中英)`);
  }
}

console.log(
  totalHits
    ? `\n✗ 共命中 ${totalHits} 处禁词,文案不通过第一道。`
    : `\n✓ 全部通过第一道(查死词,中英)。提醒:组合表达仍需战略 Claude 人工复读 + Andy/律师终审。`
);
process.exit(totalHits ? 1 : 0);
