#!/usr/bin/env node
/**
 * 找工人 · 接活儿：禁用词检查（D6）。界面文字和接口返回给人看的文字都算；代码里的变量名、注释不算。
 *
 * 用法：
 *   node scripts/check-jobs-words.ts                # 扫默认范围（服务器 + 网站页面里所有找工人 / 接活相关文件）
 *   node scripts/check-jobs-words.ts <文件或目录...> # 扫指定范围（例如小程序仓库的 pages/jobs）
 *   node scripts/check-jobs-words.ts --selftest
 * 也在 `pnpm check:jobs-words`、`pnpm check` 里跑。发现禁用词时退出码 1。
 * 只用 Node 自带模块（Node 22.6+ 直接跑 .ts）。
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, extname } from 'node:path';

export const JOBS_FORBIDDEN = ['商会承接', '商会施工队', '商会保证', '商会认证', '客户侧', '服务商', '需求', '供给'];

const ROOT = resolve(process.argv[1] ? resolve(process.argv[1], '..') : '.', '..');
const DEFAULT_TARGETS = [
  'lib/jobs', 'app/api/v1/jobs', 'app/api/v1/workbench/jobs', 'app/api/cron/jobs', 'db/migrations/0038_jobs.sql',
  // 网站页面（feat/jobs-web）：存在就扫
  'app/zh/jobs', 'app/(site)/zh/jobs', 'app/zh/staff/jobs', 'app/staff/jobs', 'components/jobs'
];
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.sql', '.wxml', '.json', '.md', '.html']);

/** 去掉注释（// … 、/* … *\/、SQL 的 -- …、wxml 的 <!-- … -->），只留下可能给人看的文字 */
export function stripComments(src: string, ext: string): string {
  const keepLines = (m: string) => m.replace(/[^\n]/g, '');
  let s = src.replace(/<!--[\s\S]*?-->/g, keepLines);
  if (ext === '.sql') return s.replace(/--[^\n]*/g, '');
  if (ext === '.json' || ext === '.md' || ext === '.wxml' || ext === '.html') return s;
  s = s.replace(/\/\*[\s\S]*?\*\//g, keepLines);
  // 行注释：// 前面不是 : （避免误伤 https://）
  return s.replace(/(^|[^:\\'"`])\/\/[^\n]*/g, '$1');
}

export function findWords(text: string): { word: string; line: number; snippet: string }[] {
  const out: { word: string; line: number; snippet: string }[] = [];
  const lines = text.split('\n');
  lines.forEach((l, i) => {
    for (const w of JOBS_FORBIDDEN) if (l.includes(w)) out.push({ word: w, line: i + 1, snippet: l.trim().slice(0, 120) });
  });
  return out;
}

function walk(p: string, acc: string[]) {
  if (!existsSync(p)) return;
  const st = statSync(p);
  if (st.isDirectory()) {
    for (const n of readdirSync(p)) if (n !== 'node_modules' && !n.startsWith('.')) walk(join(p, n), acc);
  } else if (EXTS.has(extname(p))) acc.push(p);
}

function selftest(): boolean {
  const cases: [string, string, number][] = [
    ['const demand = 1; // 需求', '.ts', 0],
    ["fail('x', '这是需求')", '.ts', 1],
    ['/* 服务商 */ const a = "找工人"', '.ts', 0],
    ['-- 需求\nSELECT 1', '.sql', 0],
    ["'https://x.com/a' + '商会认证'", '.ts', 1],
    ['<view>商会保证质量</view>', '.wxml', 1]
  ];
  let ok = true;
  for (const [src, ext, n] of cases) {
    const got = findWords(stripComments(src, ext)).length;
    if (got !== n) { ok = false; console.error(`✗ 自测失败：${JSON.stringify(src)} 期望 ${n} 处，实际 ${got}`); }
  }
  console.log(ok ? `✓ 自测通过（${cases.length} 项）` : '✗ 自测没过');
  return ok;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) { process.exitCode = selftest() ? 0 : 1; return; }
  const targets = args.length ? args.map((a) => resolve(a)) : DEFAULT_TARGETS.map((t) => join(ROOT, t));
  const files: string[] = [];
  for (const t of targets) walk(t, files);
  // 这个脚本自己列着禁用词，不扫
  const self = resolve(ROOT, 'scripts/check-jobs-words.ts');
  let bad = 0;
  for (const f of files) {
    if (resolve(f) === self) continue;
    const ext = extname(f);
    for (const h of findWords(stripComments(readFileSync(f, 'utf8'), ext))) {
      bad++;
      console.error(`✗ ${relative(process.cwd(), f)}:${h.line}  「${h.word}」  ${h.snippet}`);
    }
  }
  if (bad) {
    console.error(`\n找工人·接活儿 禁用词：${bad} 处（${files.length} 个文件）。界面和接口给人看的文字里不许出现：${JOBS_FORBIDDEN.join('、')}`);
    process.exitCode = 1;
  } else {
    console.log(`✓ 找工人·接活儿 禁用词检查通过（${files.length} 个文件）`);
  }
}
main();
