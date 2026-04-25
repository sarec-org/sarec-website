import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { researchItems } from '@/lib/content';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'SAREC研究与观点｜中美房地产商会',
  description: 'SAREC研究与观点列表，包含 EB-5 投资、华人投资风险、项目判断框架和投资风险清单。',
  path: '/zh/research'
});

export default function ResearchPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="container-shell">
        <h1 className="font-sans text-4xl font-bold md:text-5xl">SAREC研究与观点</h1>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {researchItems.map((item) => (
            <Card key={item.href}>
              <h2 className="font-sans text-2xl font-semibold">{item.title}</h2>
              <p className="mt-4 text-muted">{item.description}</p>
              <Link className="mt-8 inline-block font-sans text-sm font-semibold text-ink" href={item.href}>
                阅读全文
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
