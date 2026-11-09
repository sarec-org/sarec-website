import type { Metadata } from 'next';
import { GlossaryPage } from '@/components/tools/Glossary';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '中英地产术语速查｜SAREC 工具',
  description: '美国房地产买卖、贷款、投资指标、产权、开发、税务、物业运营常用术语，中英对照、一句话解释。',
  path: '/zh/tools/glossary'
});

export default function Page() {
  return <GlossaryPage />;
}
