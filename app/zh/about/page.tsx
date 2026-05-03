import type { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SectionCTA } from '@/components/sections/SectionCTA';
import { aboutPage } from '@/lib/content';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '关于 SAREC｜中美房地产商会',
  description:
    'SAREC 是跨境地产项目协作与资源整合平台，连接中国资本、美国资本与美国项目方，推动项目判断、结构设计、风险控制与落地协同。',
  path: '/zh/about'
});

export default function AboutPage() {
  return (
    <article>
      <section className="bg-deep py-16 text-white md:py-24">
        <div className="container-shell max-w-5xl">
          <p className="font-sans text-sm font-semibold text-gold">About SAREC</p>
          <h1 className="mt-5 font-sans text-[2rem] font-bold leading-tight md:text-6xl">{aboutPage.title}</h1>
          <p className="mt-6 max-w-4xl text-base leading-8 text-zinc-300 md:text-xl">{aboutPage.subtitle}</p>
        </div>
      </section>

      <section className="border-b border-line bg-zinc-50 py-10 md:py-12">
        <div className="container-shell grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
          <div className="max-w-3xl">
            <p className="font-sans text-sm font-semibold text-gold">Founder / Trust</p>
            <h2 className="mt-2 font-sans text-2xl font-bold leading-tight">了解主理人 Andy Wang</h2>
            <p className="mt-3 text-sm leading-7 text-muted md:text-base">
              从房地产全链条经验、职业投资视角和跨境资源整合能力，理解 SAREC 的成立逻辑和项目判断方法。
            </p>
          </div>
          <Button href="/zh/about/founder/" variant="secondary">
            查看主理人介绍
          </Button>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-sans text-sm font-semibold text-gold">Identity</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight md:text-4xl">{aboutPage.who.title}</h2>
          </div>
          <Card>
            <div className="grid gap-4 text-muted">
              {aboutPage.who.body.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
            {aboutPage.who.bullets.length ? (
              <ul className="mt-6 grid gap-3">
                {aboutPage.who.bullets.map((item) => (
                  <li className="border-l-2 border-gold pl-4 text-muted" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[1fr_1fr]">
          <Card>
            <p className="font-sans text-sm font-semibold text-gold">Positioning</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight">{aboutPage.positioning.title}</h2>
            <p className="mt-5 font-sans text-xl font-semibold">{aboutPage.positioning.intro}</p>
            <p className="mt-6 text-muted">{aboutPage.positioning.body}</p>
          </Card>

          <div className="grid gap-4">
            {aboutPage.functions.map((item, index) => (
              <Card key={item.title}>
                <p className="font-sans text-sm font-semibold text-gold">0{index + 1}</p>
                <h3 className="mt-3 font-sans text-xl font-semibold">{item.title}</h3>
                <div className="mt-4 grid gap-2 text-muted">
                  {item.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <div>
            <p className="font-sans text-sm font-semibold text-gold">Proof</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight md:text-4xl">核心数字</h2>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-muted md:text-base">{aboutPage.statsIntro}</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {aboutPage.stats.map((stat) => (
              <Card key={stat.label}>
                <div className="font-sans text-3xl font-bold text-gold">{stat.value}</div>
                <p className="mt-2 text-sm text-muted">{stat.label}</p>
              </Card>
            ))}
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="font-sans text-2xl font-semibold">合作伙伴</h2>
              <p className="mt-4 text-muted">{aboutPage.partners}</p>
            </Card>
            <Card>
              <h2 className="font-sans text-2xl font-semibold">联系我们</h2>
              <p className="mt-4 text-muted">{aboutPage.contact.body}</p>
              <div className="mt-4 grid gap-2 text-muted">
                <p>总部地址：{aboutPage.contact.address}</p>
                <p>电话：{aboutPage.contact.phone}</p>
                <p>邮箱：{aboutPage.contact.email}</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <SectionCTA
        primaryCTA={aboutPage.ctas[0]}
        secondaryCTA={aboutPage.ctas[1]}
        subtitle="如果您愿意，我们可以从一次项目交流开始。先讨论判断框架、合作边界与现实路径，再决定下一步是否值得推进。"
        title="与其更快进入，不如先把关键问题看清。"
      />
    </article>
  );
}
