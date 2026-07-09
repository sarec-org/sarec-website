#!/usr/bin/env node
/**
 * M1 回归:用《美国房地产大重置》原始 markdown 解析,断言结构等价。
 * 用法:node scripts/verify-markdown-import.mjs [markdown文件路径]
 * 默认读仓库根的《SAREC旗舰研究_美国房地产大重置_v4_终审候选.md》。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { parseArticleMarkdown, toKeystaticEntry } from '../lib/geo/markdown-import.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function findDefault() {
  const cli = process.argv[2];
  if (cli && existsSync(cli)) return cli;
  const hit = readdirSync(ROOT).find((f) => f.includes('大重置') && f.endsWith('.md'));
  if (hit) return join(ROOT, hit);
  throw new Error('找不到《大重置》markdown,请作为参数传入路径');
}

const file = findDefault();
const md = readFileSync(file, 'utf8');
const parsed = parseArticleMarkdown(md);

const count = (t) => parsed.blocks.filter((b) => b.discriminant === t).length;
const checks = [
  ['标题非空', parsed.title.length > 5, parsed.title],
  ['作者=东哥', parsed.author.name === '东哥', parsed.author.name],
  ['作者头衔含创始人', /创始人/.test(parsed.author.title ?? ''), parsed.author.title],
  ['发布日期已解析(YYYY-MM-DD)', /^\d{4}-\d{2}-\d{2}$/.test(parsed.publishedAt), parsed.publishedAt],
  ['数据截止=2026-07-06', parsed.dataCutoff === '2026-07-06', parsed.dataCutoff],
  ['摘要要点 ≥4', parsed.summary.length >= 4, parsed.summary.length],
  ['章节标题(sectionHeading) ≥5', count('sectionHeading') >= 5, count('sectionHeading')],
  ['正文段落(prose) ≥8', count('prose') >= 8, count('prose')],
  ['数据表(chartTable) ≥1', count('chartTable') >= 1, count('chartTable')],
  ['重点引用(pullQuote) ≥1', count('pullQuote') >= 1, count('pullQuote')],
  ['FAQ 条数 ≥5', parsed.faq.length >= 5, parsed.faq.length],
  ['FAQ 首条有问有答', !!(parsed.faq[0]?.question && parsed.faq[0]?.answer), parsed.faq[0]?.question],
  ['数据来源 ≥8', parsed.sourceList.length >= 8, parsed.sourceList.length],
  ['无内容丢失:blocks 总数 ≥15', parsed.blocks.length >= 15, parsed.blocks.length],
];

let ok = true;
console.log(`\n解析文件:${file.replace(ROOT + '/', '')}\n`);
for (const [name, pass, got] of checks) {
  console.log(`${pass ? '✓' : '✗'} ${name}  (实得: ${JSON.stringify(got)})`);
  if (!pass) ok = false;
}

// 序列化演示
const entry = toKeystaticEntry(parsed, {
  slug: 'us-housing-great-reset-2026',
  cluster: 'chinese-capital-us-re-risk',
  template: 'deep',
});
console.log(`\nblocks 明细:`, parsed.blocks.reduce((m, b) => ((m[b.discriminant] = (m[b.discriminant] || 0) + 1), m), {}));
console.log(`Keystatic entry 顶层字段:`, Object.keys(entry).join(', '));
console.log(ok ? '\n✓ 回归通过:《大重置》解析结构等价、无内容丢失。' : '\n✗ 回归失败。');
process.exit(ok ? 0 : 1);
