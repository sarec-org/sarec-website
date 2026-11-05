import { ResearchAgentLauncher } from '@/components/agent/ResearchAgentLauncher';

/** 研究中心：只在文章页（/zh/research/<slug>）加 AI 助手唤起按钮；不加任何包裹元素，不影响页面版式。 */
export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ResearchAgentLauncher />
    </>
  );
}
