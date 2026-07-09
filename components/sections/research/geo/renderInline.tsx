/**
 * 行内 Markdown 渲染（M3.2）—— 稳定支持 **加粗** 与 [文字](链接)，含站内链接。
 * ------------------------------------------------------------------
 * - 纯 React 节点输出，不用 dangerouslySetInnerHTML（零 XSS 面）。
 * - 站内链接（以 / 开头）走 next/link；外链走 <a target=_blank rel=noopener>。
 * - 不支持的语法按纯文本原样保留，绝不降级丢字。
 * - 无第三方 markdown 依赖，保持既有零依赖契约。
 */
import type { ReactNode } from 'react';
import Link from 'next/link';

// 匹配最早出现的 **加粗** 或 [文字](href)；两者都不含换行内的复杂嵌套（保持稳健）。
const BOLD_RE = /\*\*([^*]+?)\*\*/;
const LINK_RE = /\[([^\]]+?)\]\(([^)\s]+?)\)/;

function renderLink(text: string, href: string, key: string): ReactNode {
  const isInternal = href.startsWith('/') || href.startsWith('#');
  if (isInternal) {
    return (
      <Link key={key} href={href}>
        {text}
      </Link>
    );
  }
  return (
    <a key={key} href={href} target="_blank" rel="noopener noreferrer">
      {text}
    </a>
  );
}

export function renderInline(input: string, keyPrefix = 'i'): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = input;
  let n = 0;

  while (rest.length > 0) {
    const bold = BOLD_RE.exec(rest);
    const link = LINK_RE.exec(rest);

    // 选取更靠前者先处理；都没有则整段作纯文本收尾。
    const boldAt = bold ? bold.index : Infinity;
    const linkAt = link ? link.index : Infinity;
    if (boldAt === Infinity && linkAt === Infinity) {
      out.push(rest);
      break;
    }

    if (boldAt <= linkAt && bold) {
      if (bold.index > 0) out.push(rest.slice(0, bold.index));
      // 加粗内部允许再含链接：递归。
      out.push(
        <strong key={`${keyPrefix}-b-${n}`}>{renderInline(bold[1], `${keyPrefix}-b-${n}`)}</strong>
      );
      rest = rest.slice(bold.index + bold[0].length);
    } else if (link) {
      if (link.index > 0) out.push(rest.slice(0, link.index));
      out.push(renderLink(link[1], link[2], `${keyPrefix}-a-${n}`));
      rest = rest.slice(link.index + link[0].length);
    }
    n += 1;
  }

  return out;
}
