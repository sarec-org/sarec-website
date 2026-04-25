import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '新闻与每日简报｜SAREC 中美房地产商会',
  description: '新闻与每日简报页面为第一阶段占位页，正式新闻集成将在下一阶段完善。',
  path: '/zh/news'
});

export default function NewsPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="container-shell max-w-3xl">
        <p className="font-sans text-sm font-semibold text-gold">Phase 2 placeholder</p>
        <h1 className="mt-4 font-sans text-4xl font-bold md:text-5xl">新闻与每日简报</h1>
        <p className="mt-6 text-lg text-muted">该内容将在下一阶段完善。当前页面保留给后续 CMS 或自动发布脚本集成。</p>
        <div className="mt-8">
          <Button href="/zh/research/">查看研究与观点</Button>
        </div>
      </div>
    </div>
  );
}
