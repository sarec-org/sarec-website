import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '活动与考察团｜SAREC 中美房地产商会',
  description: '活动与考察团页面为第一阶段占位页，正式内容将在下一阶段完善。',
  path: '/zh/activity'
});

export default function ActivityPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="container-shell max-w-3xl">
        <p className="font-sans text-sm font-semibold text-gold">Phase 2 placeholder</p>
        <h1 className="mt-4 font-sans text-4xl font-bold md:text-5xl">活动与考察团</h1>
        <p className="mt-6 text-lg text-muted">该内容将在下一阶段完善。当前页面用于承接首页和旧 URL 链接。</p>
        <div className="mt-8">
          <Button href="/zh/contact/#delegation">考察团报名</Button>
        </div>
      </div>
    </div>
  );
}
