import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { ExpertQuote } from '@/components/sections/ExpertQuote';
import { ServiceScrollRestoration } from '@/components/sections/ServiceScrollRestoration';
import type { ServicePageContent } from '@/lib/content';

type ServiceDetailPageProps = {
  page: ServicePageContent;
};

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="font-sans text-sm font-semibold text-gold">{eyebrow}</p>
      <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">{title}</h2>
    </div>
  );
}

export function ServiceDetailPage({ page }: ServiceDetailPageProps) {
  return (
    <article>
      <ServiceScrollRestoration pagePath={`/zh/services/${page.slug}/`} />

      <section className="bg-deep py-16 text-white md:py-24">
        <div className="container-shell max-w-5xl">
          <p className="font-sans text-sm font-semibold text-gold">SAREC核心服务</p>
          <h1 className="mt-5 font-sans text-[2rem] font-bold leading-tight md:text-6xl">{page.title}</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300 md:text-xl">{page.subtitle}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button href={page.heroPrimaryHref ?? '#service-form'} variant="gold">
              {page.form.submitText}
            </Button>
            <Button href={page.heroSecondaryHref ?? '/zh/contact/'} variant="light">
              {page.heroSecondaryText ?? '联系我们'}
            </Button>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.9fr_1.2fr]">
          <SectionHeading eyebrow="Problem" title="这项服务解决什么问题" />
          <Card>
            <p className="text-muted">{page.problemIntro}</p>
            <ul className="mt-6 grid gap-4">
              {page.problems.map((problem) => (
                <li className="border-l-2 border-gold pl-4 text-muted" key={problem}>
                  {problem}
                </li>
              ))}
            </ul>
            {page.problemConclusion ? (
              <p className="mt-6 border-t border-line pt-6 font-sans font-semibold text-ink">{page.problemConclusion}</p>
            ) : null}
          </Card>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell">
          <SectionHeading eyebrow="Scope" title="我们在这一阶段的工作，主要包括：" />
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {page.work.map((item, index) => (
              <Card className="bg-white" key={item.title}>
                <p className="font-sans text-sm font-semibold text-gold">Step {index + 1}</p>
                <h3 className="mt-3 font-sans text-xl font-semibold leading-snug">{item.title}</h3>
                {item.description ? <p className="mt-4 text-sm leading-7 text-muted md:text-base">{item.description}</p> : null}
                {item.items ? (
                  <ul className="mt-4 grid gap-2 text-sm leading-7 text-muted md:text-base">
                    {item.items.map((value) => (
                      <li key={value}>{value}</li>
                    ))}
                  </ul>
                ) : null}
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <ExpertQuote {...page.expertQuote} />
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Audience" title="该服务适用于：" />
            <Card className="mt-8">
              <ul className="grid gap-4 text-muted">
                {page.fit.map((item) => (
                  <li className="border-l-2 border-gold pl-4" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
          <div>
            <SectionHeading eyebrow="Research" title="相关研究" />
            <Card className="mt-8">
              <div className="grid gap-3">
                {page.related.map((item) => (
                  <Link className="border-b border-line py-3 font-sans font-semibold hover:text-gold" href={item.href} key={item.href}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24" id="service-form">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionHeading eyebrow="Contact" title={page.form.title} />
            <p className="mt-4 text-sm leading-7 text-muted md:text-base">
              {page.form.description ?? '填写基本信息后，SAREC团队将在 1个工作日内 与您取得联系。'}
            </p>
          </div>
          <form action="/zh/contact/thanks/" className="grid gap-6 rounded-md border border-line bg-white p-5 shadow-soft md:p-8">
            <input name="form_type" type="hidden" value={`service_${page.slug}`} />
            <div className="grid gap-5 md:grid-cols-2 md:gap-6">
              {page.form.fields.map((field) => (
                <FormField key={field.name} {...field} />
              ))}
            </div>
            <Button className="w-full" type="submit">
              {page.form.submitText}
            </Button>
          </form>
        </div>
      </section>
    </article>
  );
}
