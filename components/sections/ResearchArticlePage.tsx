import Link from 'next/link';
import { ExpertQuote } from '@/components/sections/ExpertQuote';
import { ResearchScrollRestoration } from '@/components/sections/ResearchScrollRestoration';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { ResearchArticleContent, ResearchArticleSection } from '@/lib/content';

type ResearchArticlePageProps = {
  page: ResearchArticleContent;
  restoreScroll?: boolean;
  wide?: boolean;
};

function ArticleSection({ section, wide = false }: { section: ResearchArticleSection; wide?: boolean }) {
  return (
    <section className="border-t border-line pt-10 md:pt-12">
      <h2 className="font-sans text-2xl font-bold leading-tight text-ink md:text-3xl">{section.title}</h2>

      {section.paragraphs ? (
        <div className="mt-6 grid gap-5 text-base leading-8 text-muted md:text-lg md:leading-9">
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ) : null}

      {section.table ? (
        <dl className="mt-6 overflow-hidden rounded-md border border-line bg-white">
          {section.table.map((row) => (
            <div className="grid gap-2 border-b border-line px-4 py-4 last:border-b-0 sm:grid-cols-[0.45fr_1fr] md:px-6" key={row.label}>
              <dt className="font-sans text-sm font-semibold text-ink">{row.label}</dt>
              <dd className="text-sm leading-7 text-muted md:text-base">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {section.orderedItems ? (
        <ol className="mt-6 grid gap-4">
          {section.orderedItems.map((item, index) => (
            <li className="grid gap-3 rounded-md border border-line bg-white p-4 md:grid-cols-[2.5rem_1fr] md:p-5" key={item}>
              <span className="flex h-9 w-9 items-center justify-center rounded-[2px] bg-deep font-sans text-sm font-semibold text-gold">
                {index + 1}
              </span>
              <p className="text-sm leading-7 text-muted md:text-base">{item}</p>
            </li>
          ))}
        </ol>
      ) : null}

      {section.detailItems ? (
        <div className="mt-7 grid gap-6">
          {section.detailItems.map((item) => (
            <Card className={wide ? 'md:p-10' : 'md:p-9'} key={item.title}>
              <h3 className="font-sans text-xl font-semibold leading-snug text-ink">{item.title}</h3>
              {item.body ? <p className="mt-5 text-base leading-8 text-muted md:leading-9">{item.body}</p> : null}
              <div className="mt-6 grid gap-4 text-sm leading-7 text-muted md:text-base md:leading-8">
                {item.question ? <p>{item.question}</p> : null}
                {item.method ? <p>{item.method}</p> : null}
                {item.redFlag ? <p className="border-l-2 border-gold pl-4 font-sans font-semibold text-ink">{item.redFlag}</p> : null}
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {section.bullets ? (
        <div className="mt-6 grid gap-4 rounded-md border border-line bg-white p-5 md:p-7">
          {section.bullets.map((item) => (
            <p className="border-l-2 border-gold pl-4 text-base leading-8 text-muted" key={item}>
              {item}
            </p>
          ))}
        </div>
      ) : null}

      {section.negativeBullets ? (
        <div className="mt-6 rounded-md border border-line bg-zinc-50 p-5 md:p-7">
          <h3 className="font-sans text-lg font-semibold text-ink">不适合：</h3>
          <div className="mt-4 grid gap-3">
            {section.negativeBullets.map((item) => (
              <p className="text-sm leading-7 text-muted md:text-base" key={item}>
                {item}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function ResearchArticlePage({ page, restoreScroll = false, wide = false }: ResearchArticlePageProps) {
  const pagePath = `/zh/research/${page.slug}/`;
  const shellClassName = wide
    ? 'container-shell grid gap-8 xl:grid-cols-[minmax(0,1fr)_13.5rem] xl:items-start'
    : 'container-shell grid gap-10 lg:grid-cols-[minmax(0,0.78fr)_17rem] lg:items-start';
  const asideClassName = wide
    ? 'rounded-md border border-line bg-zinc-50 p-4 xl:sticky xl:top-28'
    : 'rounded-md border border-line bg-zinc-50 p-5 lg:sticky lg:top-28';

  return (
    <article>
      {restoreScroll ? <ResearchScrollRestoration pagePath={pagePath} /> : null}

      <section className="bg-deep py-16 text-white md:py-24">
        <div className={wide ? 'container-shell max-w-5xl' : 'container-shell max-w-4xl'}>
          <p className="font-sans text-sm font-semibold text-gold">SAREC研究与观点</p>
          <h1 className="mt-5 font-sans text-[2rem] font-bold leading-tight md:text-6xl">{page.title}</h1>
          {page.subtitle ? <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300 md:text-xl">{page.subtitle}</p> : null}
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className={shellClassName}>
          <div className={wide ? 'grid max-w-5xl gap-14' : 'grid gap-12'}>
            {page.sections.map((section) => (
              <ArticleSection key={section.title} section={section} wide={wide} />
            ))}

            <ExpertQuote {...page.expertQuote} />
          </div>

          <aside className={asideClassName}>
            <h2 className="font-sans text-base font-semibold text-ink">{page.relatedTitle}</h2>
            <div className="mt-3 grid gap-2">
              {page.related.map((item) => (
                <Link className="border-b border-line py-2.5 font-sans text-sm font-semibold leading-6 text-ink hover:text-gold" href={item.href} key={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="border-t border-line bg-zinc-50 py-12 md:py-20">
        <div className="container-shell grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <h2 className="max-w-3xl font-sans text-2xl font-bold leading-tight md:text-4xl">{page.cta.title}</h2>
          <Button href={page.cta.href}>{page.cta.text}</Button>
        </div>
      </section>
    </article>
  );
}
