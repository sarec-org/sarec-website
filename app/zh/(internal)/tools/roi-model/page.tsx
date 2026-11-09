import type { Metadata } from 'next';
import { RoiModelPage } from '@/components/tools/RoiModel';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '投资回报模型 Excel 模板｜SAREC 会员工具',
  description: '10 年现金流、IRR、Cap Rate、现金回报率、DSCR 的 Excel 模板，全部公式可改。会员专享下载。仅供参考。',
  path: '/zh/tools/roi-model'
});

export default function Page() {
  return <RoiModelPage />;
}
