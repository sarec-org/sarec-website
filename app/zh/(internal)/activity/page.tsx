import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '活动信息｜SAREC 中美房地产商会',
  description: '查看 SAREC 活动与考察培训信息，包括美国房地产项目考察、主题培训、闭门交流和会员活动。',
  path: '/zh/activity'
});

export default function ActivityPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="container-shell max-w-3xl">
        <p className="font-sans text-sm font-semibold text-gold">SAREC Events</p>
        <h1 className="mt-4 font-sans text-4xl font-bold leading-tight md:text-5xl">活动信息已升级</h1>
        <p className="mt-6 text-base leading-8 text-muted md:text-lg">
          SAREC 活动与考察培训信息已升级至新的活动页面。你可以在新页面了解美国房地产项目考察、主题培训、闭门交流和会员活动。
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button href="/zh/events/">查看活动与考察培训</Button>
          <Button href="/zh/contact/" variant="secondary">
            联系我们
          </Button>
        </div>
      </div>
    </div>
  );
}
