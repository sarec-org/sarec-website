/**
 * CmsMarkdown —— CMS V2 正文渲染(news.body / events.body / events.recapBody /
 * projects.body)。
 * ------------------------------------------------------------------
 * 与 GEO 渲染同构、零依赖:
 *  - 分段规则照搬 GeoArticleRenderer 的 toParagraphs(空行分段,段内换行交给 HTML 折叠)。
 *  - 行内语法复用 components/sections/research/geo/renderInline(**加粗** 与 [文字](链接)),
 *    不用 dangerouslySetInnerHTML,零 XSS 面。
 *  - 在此基础上只多支持两种块:## / ### / #### 小标题,以及 - / 1. 列表。
 *  - 不引 markdoc、不引任何第三方 markdown 库。
 * 不支持的语法按纯文本原样保留,绝不降级丢字。
 *
 * ⚠️ 本组件不带任何自有样式:段落 / 小标题 / 列表的 className 由调用方传入,
 *    详情页一律传站内既有详情页(rosewood)的 .ed1Body / .ed1BlockH3 / .roleBulletList,
 *    视觉规格与案例页逐像素一致。
 */
import type { ReactNode } from 'react';
import { renderInline } from '@/components/sections/research/geo/renderInline';

type Block =
  | { kind: 'heading'; level: 2 | 3 | 4; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] };

const HEADING_RE = /^(#{2,4})\s+(.*)$/;
const UL_RE = /^[-*]\s+(.+)$/;
const OL_RE = /^\d+[.)]\s+(.+)$/;

export function parseMarkdownBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length > 0) {
      blocks.push({ kind: 'paragraph', text: para.join('\n') });
      para = [];
    }
  };
  const flushList = () => {
    if (list && list.items.length > 0) {
      blocks.push({ kind: 'list', ordered: list.ordered, items: list.items });
    }
    list = null;
  };

  for (const raw of (md ?? '').replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();

    if (line.length === 0) {
      flushPara();
      flushList();
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      flushPara();
      flushList();
      blocks.push({
        kind: 'heading',
        level: heading[1].length as 2 | 3 | 4,
        text: heading[2].trim()
      });
      continue;
    }

    const ul = UL_RE.exec(line);
    const ol = OL_RE.exec(line);
    if (ul || ol) {
      flushPara();
      const ordered = Boolean(ol);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((ul ? ul[1] : (ol as RegExpExecArray)[1]).trim());
      continue;
    }

    flushList();
    para.push(line);
  }

  flushPara();
  flushList();
  return blocks;
}

export type CmsMarkdownClasses = {
  /** 段落 className —— 详情页传 rosewood 的 .ed1Body */
  paragraph: string;
  /** 小标题 className —— 详情页传 rosewood 的 .ed1BlockH3 */
  heading: string;
  /** 列表 className —— 详情页传 rosewood 的 .roleBulletList */
  list: string;
};

export function CmsMarkdown({
  md,
  classes
}: {
  md: string;
  classes: CmsMarkdownClasses;
}): ReactNode {
  const blocks = parseMarkdownBlocks(md);
  if (blocks.length === 0) return null;

  return (
    <>
      {blocks.map((block, i) => {
        const key = `b${i}`;
        switch (block.kind) {
          case 'heading':
            return (
              <h3 key={key} className={classes.heading}>
                {renderInline(block.text, key)}
              </h3>
            );
          case 'list':
            return block.ordered ? (
              <ol key={key} className={classes.list}>
                {block.items.map((item, j) => (
                  <li key={`${key}-${j}`}>{renderInline(item, `${key}-${j}`)}</li>
                ))}
              </ol>
            ) : (
              <ul key={key} className={classes.list}>
                {block.items.map((item, j) => (
                  <li key={`${key}-${j}`}>{renderInline(item, `${key}-${j}`)}</li>
                ))}
              </ul>
            );
          case 'paragraph':
          default:
            return (
              <p key={key} className={classes.paragraph}>
                {renderInline(block.text, key)}
              </p>
            );
        }
      })}
    </>
  );
}
