import type { Metadata } from 'next';
import { InternalCTABanner } from '@/components/sections/InternalCTABanner';
import { S01HeroSpread } from '@/components/sections/services/S01HeroSpread';
import { S02ThreeLayersOverview } from '@/components/sections/services/S02ThreeLayersOverview';
import { S03Chamber } from '@/components/sections/services/S03Chamber';
import { S04Advisory } from '@/components/sections/services/S04Advisory';
import { S06PartnerNetwork } from '@/components/sections/services/S06PartnerNetwork';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '服务体系｜SAREC 中美房地产商会',
  description:
    '了解 SAREC 的服务产品矩阵，包括项目初筛、深度尽调、投资结构设计、项目合作、家庭资产配置咨询、房地产考察与培训。',
  path: '/zh/services'
});

export default function ServicesPage() {
  return (
    <>
      <S01HeroSpread />

      <S02ThreeLayersOverview />
      <S03Chamber />
      <S04Advisory />
      <S06PartnerNetwork />

      <InternalCTABanner
        eyebrow="BEGIN · 开始合作"
        title="不确定从哪一层开始？"
        subtitle={
          <>
            预约 30 分钟沟通，
            <br />
            我们一起判断最匹配你的合作路径。
          </>
        }
        ctas={[
          {
            label: '预约 30 分钟沟通',
            href: '/zh/contact',
            variant: 'primary'
          },
          {
            label: '申请加入会员',
            href: '/zh/membership',
            variant: 'secondary'
          }
        ]}
      />
    </>
  );
}
