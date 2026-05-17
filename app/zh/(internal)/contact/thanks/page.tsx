import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { site } from '@/lib/content';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...createPageMetadata({
    title: '联系 SAREC｜中美房地产商会',
    description: '通过邮箱、电话或网站表单联系 SAREC，提交项目或合作需求。',
    path: '/zh/contact/thanks'
  }),
  robots: { index: false, follow: false }
};

const links = [
  ['查看：SAREC 投资风险清单', '/zh/research/risk-checklist/'],
  ['查看：近期合作项目案例', '/zh/projects/'],
  ['返回首页', '/zh/']
];

export default function ThanksPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="container-shell max-w-4xl">
        <h1 className="font-sans text-4xl font-bold md:text-5xl">感谢你联系 SAREC</h1>

        <Card className="mt-10">
          <h2 className="font-sans text-2xl font-semibold">请确认邮件是否已经发送</h2>
          <p className="mt-4 text-muted">
            当前网站采用本机邮箱发送需求信息。如果你的邮箱客户端没有自动打开或邮件没有发送成功，请返回联系页复制表单内容，并手动发送至 {site.email}。
          </p>
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
