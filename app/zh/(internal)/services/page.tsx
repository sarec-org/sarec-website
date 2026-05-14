import type { Metadata } from 'next';
import { InternalHero } from '@/components/sections/InternalHero';
import { InternalCTABanner } from '@/components/sections/InternalCTABanner';
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
      <InternalHero
        eyebrow="SERVICES · 服务架构"
        h1="三层服务架构"
        sub={
          <>
            SAREC 围绕项目判断、结构设计、风险控制与资源协同，
            <br />
            按客户参与深度分为三层：
            <br />
            商会 · 咨询撮合 · 共投。
          </>
        }
        primaryCTA={{
          label: '预约 30 分钟沟通',
          href: '/zh/contact'
        }}
        secondaryCTA={{
          label: '查看会员服务',
          href: '/zh/membership'
        }}
        background="standard"
      />

      {/* TODO Phase 4 Step 4b: S02 三层架构总览, S03 Layer 1 Chamber 详细,
          S04 Layer 2 Advisory 详细, S05 Layer 3 Co-Invest 详细,
          S06 专业服务伙伴网络 */}
      <section
        style={{
          background: 'var(--ink-deep)',
          padding: 'clamp(80px, 12vh, 140px) clamp(24px, 5vw, 80px)',
          textAlign: 'center',
          color: 'var(--ivory-mute)',
          fontFamily: 'var(--mono)',
          fontSize: '13px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase'
        }}
      >
        S02 — S06 · COMING IN STEP 4B
      </section>

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
