import type { Metadata } from 'next';
import { ToolsIndexPage } from '@/components/tools/ToolsIndex';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '房地产工具｜SAREC 中美房地产商会',
  description: '月供与现金流计算器、1031 换房税务速算、投资回报模型 Excel 模板。中英双语，仅供参考，不构成投资或贷款建议。',
  path: '/zh/tools'
});

export default function Page() {
  return <ToolsIndexPage />;
}
