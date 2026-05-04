import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Hero } from '@/components/sections/Hero';
import { HomeScrollRestoration } from '@/components/sections/HomeScrollRestoration';
import { SectionCTA } from '@/components/sections/SectionCTA';
import { ServiceCards } from '@/components/sections/ServiceCards';
import { TrustStats } from '@/components/sections/TrustStats';
import { homePage, site } from '@/lib/content';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'SAREC 中美房地产商会｜跨境地产项目协作与资源整合平台',
  description:
    'SAREC 中美房地产商会面向跨境投资人、项目方、房地产从业者和高净值家庭，提供美国房地产项目判断、风险控制、结构设计、资源协同与合作推进服务。',
  path: '/zh'
});

export default function HomePage() {
  const { bottomCTA } = homePage;

  return (
    <>
      <HomeScrollRestoration />
      <Hero />

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <h2 className="font-sans text-2xl font-bold leading-tight md:text-4xl">{homePage.audienceTitle}</h2>
          <div className="mt-7 grid gap-4 md:mt-10 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {homePage.audienceCards.map((card) => (
              <Card className="min-h-0" key={card.href}>
                <h3 className="font-sans text-lg font-semibold leading-snug md:text-xl">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted md:mt-4 md:text-base">{card.description}</p>
                <Link className="mt-6 inline-flex border-b border-gold pb-1 font-sans text-sm font-semibold text-ink" href={card.href}>
                  {card.linkText}
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell">
          <h2 className="font-sans text-2xl font-bold leading-tight md:text-4xl">{homePage.serviceTitle}</h2>
          <div className="mt-7 md:mt-10">
            <ServiceCards items={homePage.serviceItems} />
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <h2 className="font-sans text-2xl font-bold leading-tight md:text-4xl">{homePage.researchTitle}</h2>
            <Button href={homePage.researchCTA.href} variant="secondary">
              {homePage.researchCTA.text}
            </Button>
          </div>
          <div className="mt-7 grid gap-4 md:mt-10 md:grid-cols-3">
            {homePage.researchItems.map((item) => (
              <Card key={item.href}>
                <h3 className="font-sans text-lg font-semibold leading-snug md:text-xl">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted md:mt-4 md:text-base">{item.description}</p>
                <Link className="mt-6 inline-flex border-b border-gold pb-1 font-sans text-sm font-semibold" href={item.href}>
                  阅读全文
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-deep py-12 text-white md:py-24">
        <div className="container-shell grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <p className="font-sans text-sm font-semibold text-gold">{homePage.activity.eyebrow}</p>
            <h2 className="mt-4 font-sans text-2xl font-bold leading-tight md:text-4xl">{homePage.activity.title}</h2>
            <p className="mt-5 text-sm leading-7 text-zinc-300 md:text-base">{homePage.activity.lines.join('，')}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <Button href={homePage.activity.primaryCTA.href} variant="gold">
              {homePage.activity.primaryCTA.text}
            </Button>
            <Button href={homePage.activity.secondaryCTA.href} variant="light">
              {homePage.activity.secondaryCTA.text}
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-zinc-50 py-10 md:py-14">
        <div className="container-shell grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
          <div className="max-w-3xl">
            <p className="font-sans text-sm font-semibold text-gold">Membership</p>
            <h2 className="mt-2 font-sans text-2xl font-bold leading-tight">会员服务</h2>
            <p className="mt-3 text-sm leading-7 text-muted md:text-base">
              面向美国华人投资人、中国企业家、房地产项目方和跨境资源伙伴，SAREC 通过会员服务提供研究内容、项目沟通、活动考察和资源协同入口。
            </p>
          </div>
          <Button href="/zh/membership/" variant="secondary">
            了解会员服务
          </Button>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-8 md:grid-cols-[1fr_1.2fr] md:items-start">
          <div>
            <h2 className="font-sans text-2xl font-bold leading-tight md:text-4xl">{homePage.news.title}</h2>
            <p className="mt-4 text-sm leading-7 text-muted md:text-base">{homePage.news.subtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href={homePage.news.cta.href} variant="secondary">
                {homePage.news.cta.text}
              </Button>
              <Button href="/zh/research/" variant="primary">
                查看全部研究内容
              </Button>
            </div>
          </div>
          <div className="grid gap-4">
            {homePage.news.items.map((item) => (
              <Card className="bg-zinc-50" key={item.href}>
                <h3 className="font-sans text-lg font-semibold leading-snug">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted">{item.description}</p>
                <Link className="mt-5 inline-flex border-b border-gold pb-1 font-sans text-sm font-semibold text-ink hover:text-gold" href={item.href}>
                  阅读内容
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell">
          <div>
            <h2 className="font-sans text-2xl font-bold leading-tight md:text-4xl">{homePage.trustTitle}</h2>
          </div>
          <TrustStats />
          <div className="mt-8 rounded-md border border-line bg-white p-5 font-sans text-sm leading-7 text-muted shadow-soft md:mt-10">
            {homePage.partners}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className="font-sans text-2xl font-bold leading-tight md:text-4xl">{bottomCTA.title}</h2>
            <p className="mt-4 text-sm leading-7 text-muted md:text-base">{bottomCTA.subtitleLines.join('，')}</p>
            <div className="mt-6 grid gap-2 text-sm text-muted md:mt-8 md:text-base">
              <p>{site.phone}</p>
              <p>{site.email}</p>
            </div>
          </div>
          <form action={bottomCTA.action} className="grid gap-6 rounded-md border border-line bg-white p-5 shadow-soft md:p-8">
            <div className="grid gap-5 md:grid-cols-2 md:gap-6">
              {bottomCTA.fields.map((field) => (
                <FormField key={field.name} {...field} />
              ))}
            </div>
            <Button className="w-full" type="submit">
              {bottomCTA.submitText}
            </Button>
          </form>
        </div>
      </section>

      <SectionCTA
        primaryCTA={homePage.finalCTA.primaryCTA}
        secondaryCTA={homePage.finalCTA.secondaryCTA}
        subtitle={homePage.finalCTA.subtitle}
        title={homePage.finalCTA.title}
      />
    </>
  );
}
