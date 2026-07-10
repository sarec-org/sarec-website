#!/usr/bin/env node
/**
 * 批次 3 · M1 图片语法回归:![alt](src) → assetBreak;alt 必填;远程 URL 保留;路径自动标记。
 */
import { parseArticleMarkdown } from '../lib/geo/markdown-import.ts';

const HEAD = `# 测试标题\n\n**摘要判断:** 甲 · 乙\n\n**作者:东哥 · 创始人**\n**发布日期:2026 年 7 月 6 日**\n\n---\n\n`;

let ok = true;
const assert = (name, cond, got) => {
  console.log(`${cond ? '✓' : '✗'} ${name}  (实得: ${JSON.stringify(got)})`);
  if (!cond) ok = false;
};

// 1) 本地上传图 → assetBreak,无 marker
{
  const p = parseArticleMarkdown(HEAD + '正文一段。\n\n![一张本地图](/images/research/uploads/img-1.webp)\n\n正文二段。');
  const imgs = p.blocks.filter((b) => b.discriminant === 'assetBreak');
  assert('本地图解析为 assetBreak', imgs.length === 1, imgs.length);
  assert('kind=image', imgs[0]?.value.kind === 'image', imgs[0]?.value.kind);
  assert('src 保留', imgs[0]?.value.src === '/images/research/uploads/img-1.webp', imgs[0]?.value.src);
  assert('alt 保留', imgs[0]?.value.alt === '一张本地图', imgs[0]?.value.alt);
  assert('本地上传图无 generated 标记', imgs[0]?.value.generated === undefined, imgs[0]?.value.generated);
  assert('图片前后正文各成段(prose=2)', p.blocks.filter((b) => b.discriminant === 'prose').length === 2, p.blocks.filter((b) => b.discriminant === 'prose').length);
}

// 2) 品牌插画 → generated=illustration
{
  const p = parseArticleMarkdown(HEAD + '![城市天际线](/illustrations/sarec/skyline-dusk.svg)');
  const img = p.blocks.find((b) => b.discriminant === 'assetBreak');
  assert('插画标记 generated=illustration', img?.value.generated === 'illustration', img?.value.generated);
}

// 3) AI 图路径 → generated=ai
{
  const p = parseArticleMarkdown(HEAD + '![AI 抽象图](/images/research/ai/gen-1.webp)');
  const img = p.blocks.find((b) => b.discriminant === 'assetBreak');
  assert('AI 图标记 generated=ai', img?.value.generated === 'ai', img?.value.generated);
}

// 4) 远程 URL 保留引用(不代扒)
{
  const p = parseArticleMarkdown(HEAD + '![外站图](https://example.com/a.jpg)');
  const img = p.blocks.find((b) => b.discriminant === 'assetBreak');
  assert('远程 URL 原样保留', img?.value.src === 'https://example.com/a.jpg', img?.value.src);
  assert('远程图无 generated 标记', img?.value.generated === undefined, img?.value.generated);
}

// 5) alt 为空 → 报错并带行号
{
  let threw = false;
  let line = null;
  try {
    parseArticleMarkdown(HEAD + '![](/images/research/uploads/x.webp)');
  } catch (e) {
    threw = true;
    line = e.line ?? null;
  }
  assert('空 alt 抛错', threw, threw);
  assert('空 alt 报错带行号', typeof line === 'number', line);
}

console.log(ok ? '\n✓ M1 图片语法回归全过。' : '\n✗ 回归失败。');
process.exit(ok ? 0 : 1);
