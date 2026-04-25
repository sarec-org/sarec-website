import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { site } from '@/lib/content';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...createPageMetadata({
    title: '提交成功｜SAREC 中美房地产商会',
    description: 'SAREC 已收到您的联系信息。',
    path: '/zh/contact/thanks'
  }),
  robots: { index: false, follow: false }
};

const links = [
  ['阅读：华人投资美国房产常见风险', '/zh/research/investment-pitfalls/'],
  ['了解：EB-5最新政策与SAREC判断', '/zh/research/eb5/'],
  ['下载：SAREC投资风险清单', '/zh/research/risk-checklist/'],
  ['查看：近期合作项目案例', '/zh/projects/'],
  ['返回首页', '/zh/']
];

export default function ThanksPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="container-shell max-w-4xl">
        <h1 className="font-sans text-4xl font-bold md:text-5xl">感谢您的联系 ✓</h1>

        <Card className="mt-10">
          <h2 className="font-sans text-2xl font-semibold">我们已收到您的信息</h2>
          <p className="mt-4 text-muted">您的联系信息已成功提交。SAREC团队将在 1个工作日内 与您取得联系。</p>
        </Card>

        <Card className="mt-6">
          <h2 className="font-sans text-2xl font-semibold">联系时间说明</h2>
          <div className="mt-4 grid gap-2 text-muted">
            <p>SAREC工作时间（洛杉矶时间）：</p>
            <p>周一至周五 09:00 – 18:00 PT</p>
            <p>周六 10:00 – 14:00 PT（仅紧急事务）</p>
            <p>周日 休息</p>
            <p>如需紧急咨询，请直接致电：{site.phone}</p>
          </div>
        </Card>

        <section className="mt-10">
          <h2 className="font-sans text-2xl font-semibold">在等待回复期间，您可以</h2>
          <div className="mt-5 grid gap-3">
            {links.map(([label, href]) => (
              <Link className="border-b border-line py-3 font-sans hover:text-gold" href={href} key={href}>
                {label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
