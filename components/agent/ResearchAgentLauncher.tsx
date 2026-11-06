'use client';
/**
 * 研究文章页的 AI 助手唤起按钮（由 app/zh/(internal)/research/layout.tsx 挂载，覆盖 GEO 文章与旧研究页）。
 * 研究中心目录页 /zh/research 本身不显示。
 */
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AgentChat } from './AgentChat';

export function ResearchAgentLauncher() {
  const pathname = usePathname() || '';
  const m = pathname.match(/^\/zh\/research\/([^/]+)\/?$/);
  const slug = m?.[1];
  const [title, setTitle] = useState<string | undefined>(undefined);
  useEffect(() => {
    setTitle(document.querySelector('h1')?.textContent?.trim().slice(0, 120) || undefined);
  }, [pathname]);
  if (!slug) return null;
  return <AgentChat key={slug} variant="launcher" context={{ page: 'article', slug, title }} />;
}
