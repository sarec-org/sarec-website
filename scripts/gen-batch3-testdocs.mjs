#!/usr/bin/env node
/**
 * 批次 3 临时验收:生成 report / compact 两篇 published 测试文(含正文图 + 指标卡)。
 * 验收后由 rm 删除,不进生产。
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { stringify } from 'yaml';
import { parseArticleMarkdown, toKeystaticEntry } from '../lib/geo/markdown-import.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'content', 'geo', 'articles');

const metricCards = {
  discriminant: 'metricCards',
  value: {
    title: '关键指标',
    items: [
      { label: 'Case-Shiller 同比', value: '+0.8%', change: '较上月 -0.2pt', trend: 'down' },
      { label: '新开工环比', value: '-15.4%', trend: 'down' },
      { label: '30 年固定房贷', value: '6.7%', change: '持平', trend: 'flat' },
    ],
  },
};

// ── 报告版(deep + report):多小节 + 插画 + 数据表 ──
const reportMd = `# 批次三测试·报告版:长文侧边目录演示

**摘要判断:** 报告版带侧边目录 · 章节可跳转 · 适合长文

**作者:东哥 · SAREC 中美房地产商会创始人**
**发布日期:2026 年 7 月 9 日**

---

这是报告版正文导语。右侧(桌面)或顶部(手机)应出现章节目录。

![抽象城市天际线插画](/illustrations/sarec/skyline-dusk.svg)

## 一、市场现状

第一节正文内容,用于验证锚点跳转与阅读排版。

## 二、机制拆解

第二节正文内容。

| 指标 | 读数 | 来源 |
|---|---|---|
| 全国指数同比 | +0.8% | S&P |
| 佛州 Cape Coral | -9% | 地方 MLS |

## 三、资本动向

第三节正文内容。

## 四、SAREC 判断

第四节正文内容。

## 常见问题(FAQ)

### 报告版适合什么文章?

8000 字以上、章节多的长研究。

## 数据来源

S&P Cotality · 地方 MLS
`;

// ── 简报版(data + compact):TL;DR 置顶 + 数据前置 ──
const compactMd = `# 批次三测试·简报版:紧凑 + 数据前置演示

**摘要判断:** 简报版 TL;DR 置顶 · 首个数据块前置 · 紧凑排版

**作者:东哥 · SAREC 中美房地产商会创始人**
**发布日期:2026 年 7 月 9 日 | 数据截至:2026 年 7 月 6 日**

---

简报版导语。顶部应有"速览"卡,其后紧跟被提前的指标卡。

## 要点一

正文一段。

![抽象数据网格与折线插画](/illustrations/sarec/data-grid.svg)

## 要点二

正文二段。

## 数据来源

内部整理
`;

function build(md, slug, template, layout) {
  const parsed = parseArticleMarkdown(md);
  const entry = toKeystaticEntry(parsed, {
    slug,
    cluster: 'chinese-capital-us-re-risk',
    template,
    layout,
    status: 'published',
  });
  // 注入一个指标卡块(markdown 不产 metricCards):报告版放末尾,简报版放开头以验证"数据前置"提升。
  if (layout === 'compact') entry.blocks.unshift(structuredClone(metricCards));
  else entry.blocks.push(structuredClone(metricCards));
  const file = join(DIR, `${slug}.yaml`);
  writeFileSync(file, stringify(entry), 'utf8');
  console.log(`写入 ${file}  (blocks=${entry.blocks.length}, layout=${entry.layout})`);
}

build(reportMd, 'test-b3-report', 'deep', 'report');
build(compactMd, 'test-b3-compact', 'data', 'compact');
console.log('done');
