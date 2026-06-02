import Link from 'next/link';
import { InternalHero } from '@/components/sections/InternalHero';
import { CtaBlock } from '@/components/cta/CtaBlock';
import { CTA_REGISTRY, type CtaId } from '@/lib/cta/registry';
import { SITE_URL } from '@/lib/seo';
import { localize, type Locale, type LocalizedText } from '@/lib/i18n/types';
import styles from './ServiceLandingLayout.module.css';

/**
 * ServiceLandingLayout — 解决方案页通用模板(实施方案 B.2 / M2)
 * ------------------------------------------------------------------
 * 通用支持入口 1/2/3:面包屑 + hero(复用 InternalHero)+ 内容区块 + 底部统一 CTA。
 * 双语:所有人见字符串 LocalizedText,渲染走 localize(默认 zh);英文只存不渲染。
 * hero 主/次按钮从 CTA_REGISTRY 取(单一事实源);底部 CTA 默认 risk-review(红线 3)。
 */
export type ServiceSectionPoint = { label: LocalizedText; desc?: LocalizedText };

export type ServiceSection = {
  eyebrow?: LocalizedText;
  heading: LocalizedText;
  body?: LocalizedText;
  points?: ServiceSectionPoint[];
};

export type ServiceBreadcrumb = { label: LocalizedText; href: string };

export type ServiceLandingContent = {
  /** 面包屑:首页 / 服务 / 当前页(全部带 href;最后一项渲染为当前页) */
  breadcrumb?: ServiceBreadcrumb[];
  hero: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    lead: LocalizedText;
    note?: LocalizedText;
    primaryCtaId: CtaId;
  };
  sections: ServiceSection[];
  bottomCtaId?: CtaId;
};

function breadcrumbJsonLd(items: ServiceBreadcrumb[], locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: localize(c.label, locale),
      item: `${SITE_URL}${c.href}`
    }))
  };
}

export function ServiceLandingLayout({
  content,
  locale = 'zh'
}: {
  content: ServiceLandingContent;
  locale?: Locale;
}) {
  const { breadcrumb, hero, sections, bottomCtaId = 'risk-review' } = content;
  const heroCta = CTA_REGISTRY[hero.primaryCtaId];

  return (
    <article className={styles.page}>
      {breadcrumb && breadcrumb.length > 0 ? (
        <>
          <nav aria-label="breadcrumb" className={styles.breadcrumb}>
            <ol className={styles.crumbList}>
              {breadcrumb.map((c, i) => {
                const isLast = i === breadcrumb.length - 1;
                return (
                  <li key={c.href} className={styles.crumbItem}>
                    {isLast ? (
                      <span aria-current="page" className={styles.crumbCurrent}>
                        {localize(c.label, locale)}
                      </span>
                    ) : (
                      <Link href={c.href} className={styles.crumbLink}>
                        {localize(c.label, locale)}
                      </Link>
                    )}
                    {!isLast ? (
                      <span className={styles.crumbSep} aria-hidden="true">
                        /
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </nav>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumb, locale)) }}
          />
        </>
      ) : null}

      <InternalHero
        eyebrow={localize(hero.eyebrow, locale)}
        h1={localize(hero.title, locale)}
        sub={localize(hero.lead, locale)}
        note={hero.note ? localize(hero.note, locale) : undefined}
        background="darkest"
        primaryCTA={{
          label: localize(heroCta.primary.label, locale),
          href: heroCta.primary.route.zh
        }}
        secondaryCTA={
          heroCta.secondary
            ? {
                label: localize(heroCta.secondary.label, locale),
                href: heroCta.secondary.route.zh
              }
            : undefined
        }
      />

      {sections.map((s, i) => (
        <section key={i} className={styles.section}>
          <div className={styles.inner}>
            {s.eyebrow ? <p className={styles.eyebrow}>{localize(s.eyebrow, locale)}</p> : null}
            <h2 className={styles.heading}>{localize(s.heading, locale)}</h2>
            {s.body ? <p className={styles.body}>{localize(s.body, locale)}</p> : null}
            {s.points && s.points.length > 0 ? (
              <ul className={styles.points}>
                {s.points.map((p, j) => (
                  <li key={j} className={styles.point}>
                    <span className={styles.pointLabel}>{localize(p.label, locale)}</span>
                    {p.desc ? <span className={styles.pointDesc}>{localize(p.desc, locale)}</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ))}

      <CtaBlock cta={CTA_REGISTRY[bottomCtaId]} position="full" locale={locale} />
    </article>
  );
}
