import type { Metadata } from 'next';
import { MortgageCalcPage } from '@/components/tools/MortgageCalc';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '月供与现金流计算器｜SAREC 工具',
  description: '输入房价、首付比例、利率、年限、房产税、保险、HOA 和预期租金，粗算月供、月现金流和年化现金回报。中英双语。仅供参考。',
  path: '/zh/tools/mortgage'
});

export default function Page() {
  return <MortgageCalcPage />;
}
