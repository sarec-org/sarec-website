import type { Metadata } from 'next';
import { Exchange1031Page } from '@/components/tools/Exchange1031Calc';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '1031 换房税务速算｜SAREC 工具',
  description: '输入卖出价、成本、折旧和所在州，粗算直接卖出的应税额和 1031 换房可递延的税额。粗算，以会计师为准。',
  path: '/zh/tools/1031'
});

export default function Page() {
  return <Exchange1031Page />;
}
