#!/usr/bin/env node
/**
 * 批次 3 适配层回归:assetBreak.upload(basename)→public 路径还原;generated 标记;layout 映射。
 */
import { fromKeystaticArticle } from '../lib/geo/keystatic-adapter.ts';

let ok = true;
const assert = (name, cond, got) => {
  console.log(`${cond ? '✓' : '✗'} ${name}  (实得: ${JSON.stringify(got)})`);
  if (!cond) ok = false;
};

const base = {
  slug: 't', locale: 'zh', cluster: 'chinese-capital-us-re-risk', tier: 'pillar',
  status: 'published', title: '标题', description: '描述', publishedAt: '2026-07-06',
  author: { name: '东哥' }, summary: ['a'],
};

// 1) upload 存 basename → 还原为 publicPath 前缀
{
  const a = fromKeystaticArticle({
    ...base, layout: 'report',
    blocks: [{ discriminant: 'assetBreak', value: { kind: 'image', upload: 'img-9.webp', alt: 'x', generated: 'ai' } }],
  });
  const blk = a.blocks[0];
  assert('upload basename → /images/research/uploads/ 前缀', blk.data.src === '/images/research/uploads/img-9.webp', blk.data.src);
  assert('generated=ai 透传', blk.data.generated === 'ai', blk.data.generated);
  assert('layout=report 映射', a.layout === 'report', a.layout);
}

// 2) upload 已是绝对路径 → 不重复加前缀(防御性)
{
  const a = fromKeystaticArticle({
    ...base,
    blocks: [{ discriminant: 'assetBreak', value: { kind: 'image', upload: '/images/research/uploads/y.webp', alt: 'x' } }],
  });
  assert('绝对路径 upload 不重复前缀', a.blocks[0].data.src === '/images/research/uploads/y.webp', a.blocks[0].data.src);
}

// 3) 无 upload 时回退到 src(URL 文本)
{
  const a = fromKeystaticArticle({
    ...base,
    blocks: [{ discriminant: 'assetBreak', value: { kind: 'image', src: 'https://cdn.example.com/z.jpg', alt: 'x' } }],
  });
  assert('无 upload → 用 src', a.blocks[0].data.src === 'https://cdn.example.com/z.jpg', a.blocks[0].data.src);
}

// 4) 无 layout 字段 → article.layout 为 undefined(渲染层兜底 classic)
{
  const a = fromKeystaticArticle({ ...base, blocks: [] });
  assert('缺 layout → undefined(渲染层兜底 classic)', a.layout === undefined, a.layout);
}

// 5) 非法 layout → 忽略(不设)
{
  const a = fromKeystaticArticle({ ...base, layout: 'weird', blocks: [] });
  assert('非法 layout 被忽略', a.layout === undefined, a.layout);
}

console.log(ok ? '\n✓ 批次 3 适配层回归全过。' : '\n✗ 回归失败。');
process.exit(ok ? 0 : 1);
