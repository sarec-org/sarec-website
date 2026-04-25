import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '美国房产项目投资风险清单｜SAREC出品 v1.0',
  description: 'SAREC投资风险清单占位页，PDF 下载将在文件提供后开放。',
  path: '/zh/research/risk-checklist'
});

export default function RiskChecklistPage() {
  return (
    <article>
      <section className="bg-deep py-16 text-white md:py-24">
        <div className="container-shell max-w-4xl">
          <p className="font-sans text-sm font-semibold text-gold">SAREC研究与观点</p>
          <h1 className="mt-5 font-sans text-[2rem] font-bold leading-tight md:text-6xl">SAREC投资风险清单</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300 md:text-xl">
            该内容将在下一阶段完善。PDF 文件由甲方提供后，下载按钮将启用。
          </p>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-sans text-sm font-semibold text-gold">Phase 2 Placeholder</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight md:text-4xl">即将上线的风险工具</h2>
            <p className="mt-4 text-sm leading-7 text-muted md:text-base">
              第一阶段保留正式入口，用于承接研究总览、服务页和旧链接。完整 PDF 文件将在资料确认后开放下载。
            </p>
          </div>

          <Card className="md:p-10">
            <div className="grid gap-5 text-muted">
              <p>页面定位：美国房产项目投资风险清单。</p>
              <p>当前状态：正式正文未完整提供，第一阶段保持占位内容页。</p>
              <p>后续处理：PDF 文件由甲方提供后放入下载目录，并启用下载按钮。</p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button disabled type="button" variant="disabled">
                PDF 暂未提供
              </Button>
              <Button href="/zh/services/due-diligence/" variant="secondary">
                委托SAREC做风控尽调
              </Button>
            </div>
          </Card>
        </div>
      </section>
    </article>
  );
}
