import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RevealOnView } from '@/components/shared/RevealOnView';
import { createPageMetadata, SITE_URL } from '@/lib/seo';
import { ViewportLockScript } from '@/components/sections/research/ViewportLockScript';
import { CmsDetailHero } from '@/components/cms/CmsDetailHero';
import { CmsMarkdown } from '@/components/cms/CmsMarkdown';
import { EventRecapDisclaimer } from '@/components/cms/Disclaimers';
import { GALLERY_IMAGE, PROSE_CLASSES } from '@/components/cms/detailPresets';
import { formatEventTime } from '@/components/cms/EventMeta';
import { getEventBySlug, listEvents } from '@/lib/cms/content';
import { buildEventJsonLd, buildEventRecapArticleJsonLd } from '@/lib/cms/schema';
import { buildBreadcrumbJsonLd } from '@/lib/geo/schema';
import { EVENT_STATUS_LABEL, REGISTRATION_STATUS_LABEL } from '@/lib/cms/labels';
import type { RegistrationStatus } from '@/lib/cms/types';
import d from '@/components/cms/detail.module.css';

/**
 * 活动详情 —— /zh/events/<slug>。
 * ------------------------------------------------------------------
 * 一场活动始终一个 URL:举办前展示主题/时间/地点/报名;
 * eventStatus=completed 后,同一页面追加回顾(照片 + 主讲人 + 内容摘要),
 * 绝不生成第二个页面、不在 news 里另建回顾文章。
 *
 * 版式逐段照抄站内既有详情页 /zh/case-studies/4136-rosewood:
 *   R01 Cinematic Hero → R02 概览数据表 → R03 Editorial 正文 → R05 图集卡 → 免责 → R06 CTA。
 */

type Params = { slug: string };

/** 无封面图时的兜底头图 —— 与 /zh/events 页 hero 同一张站内既有素材。 */
const FALLBACK_HERO = '/images/la/la-skyline-marquee.jpg';

export function generateStaticParams(): Params[] {
  return listEvents().map((e) => ({ slug: e.slug }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const event = getEventBySlug(params.slug);
  if (!event) return {};
  return createPageMetadata({
    title: `${event.title}｜SAREC 活动`,
    description: event.summary,
    path: `/zh/events/${event.slug}`,
    type: 'article'
  });
}

/** 报名区文案:严格按 registrationStatus 四态渲染,不与活动状态混用。 */
function registrationNote(status: RegistrationStatus): string {
  switch (status) {
    case 'open':
      return '名额有限,建议尽早提交报名。';
    case 'full':
      return '本场活动名额已满。后续场次会在本页与「新闻与活动」页更新。';
    case 'closed':
      return '本场活动报名通道已关闭。';
    case 'notOpen':
    default:
      return '报名开放时间将在本页更新;会员可获得活动安排的优先通知。';
  }
}

export default function EventDetailPage({ params }: { params: Params }) {
  const event = getEventBySlug(params.slug);
  if (!event) notFound();

  const pathname = `/zh/events/${event.slug}`;
  const hasRecap = event.eventStatus === 'completed' && event.recapBody.trim().length > 0;
  const canRegister =
    event.eventStatus === 'scheduled' &&
    event.registrationStatus === 'open' &&
    Boolean(event.registrationUrl);

  // Event JSON-LD 只在本单页输出;聚合页不整体标 Event。
  const eventJsonLd = buildEventJsonLd(event, { siteUrl: SITE_URL, pathname });
  // completed 没有 schema.org 标准枚举值 —— 不自造,改用日期 + 回顾期叠加 Article。
  const recapJsonLd = hasRecap
    ? buildEventRecapArticleJsonLd(event, { siteUrl: SITE_URL, pathname })
    : null;
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '首页', url: `${SITE_URL}/zh` },
    { name: '新闻与活动', url: `${SITE_URL}/zh/events` },
    { name: event.title, url: `${SITE_URL}${pathname}` }
  ]);

  return (
    <main>
      <ViewportLockScript />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
      {recapJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(recapJsonLd) }}
        />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* R01 同款 — Cinematic Hero */}
      <CmsDetailHero
        eyebrow="EVENT · 活动"
        title={event.title}
        sublines={[
          formatEventTime(event),
          ...(event.locationName ? [event.locationName] : [])
        ]}
        stats={[
          { status: EVENT_STATUS_LABEL[event.eventStatus] },
          ...(event.eventStatus === 'scheduled'
            ? [{ status: REGISTRATION_STATUS_LABEL[event.registrationStatus] }]
            : [])
        ]}
        image={{ src: event.coverImage ?? FALLBACK_HERO, alt: event.title }}
        primaryCta={
          canRegister
            ? { label: '前往报名', href: event.registrationUrl as string, external: true }
            : { label: '联系 SAREC 了解参与方式', href: '/zh/contact' }
        }
        secondaryCta={{ label: '查看全部活动', href: '/zh/events' }}
      />

      {/* R02 同款 — 概览数据表 */}
      <section className={d.overviewSection}>
        <div className={d.overviewInner}>
          <span className={d.eyebrow}>EVENT INFO · 活动信息</span>
          <RevealOnView as="h2" className={d.sectionH2}>
            活动基本信息
          </RevealOnView>
          <dl className={d.overviewTable}>
            <div className={d.overviewRow}>
              <dt className={d.overviewLabel}>时间</dt>
              <dd className={d.overviewValue}>{formatEventTime(event)}</dd>
            </div>
            {event.locationName ? (
              <div className={d.overviewRow}>
                <dt className={d.overviewLabel}>地点</dt>
                <dd className={d.overviewValue}>{event.locationName}</dd>
              </div>
            ) : null}
            {event.address ? (
              <div className={d.overviewRow}>
                <dt className={d.overviewLabel}>地址</dt>
                <dd className={d.overviewValue}>{event.address}</dd>
              </div>
            ) : null}
            {event.organizer ? (
              <div className={d.overviewRow}>
                <dt className={d.overviewLabel}>主办</dt>
                <dd className={d.overviewValue}>{event.organizer}</dd>
              </div>
            ) : null}
            <div className={d.overviewRow}>
              <dt className={d.overviewLabel}>活动状态</dt>
              <dd className={d.overviewValue}>{EVENT_STATUS_LABEL[event.eventStatus]}</dd>
            </div>
            <div className={d.overviewRow}>
              <dt className={d.overviewLabel}>报名状态</dt>
              <dd className={d.overviewValue}>
                {REGISTRATION_STATUS_LABEL[event.registrationStatus]}
              </dd>
            </div>
          </dl>
          <p className={d.complianceNote}>{registrationNote(event.registrationStatus)}</p>
        </div>
      </section>

      {/* R03 同款 — Editorial 正文 */}
      {event.body.trim().length > 0 ? (
        <section className={d.ed1Section}>
          <div className={d.ed1Inner}>
            <span className={d.eyebrow}>ABOUT · 活动介绍</span>
            <RevealOnView as="h2" className={d.sectionH2}>
              活动介绍
            </RevealOnView>
            <div className={d.ed1Block}>
              <CmsMarkdown md={event.body} classes={PROSE_CLASSES} />
            </div>
          </div>
        </section>
      ) : null}

      {/* R03 同款 — 活动回顾(completed 且有回顾正文时,在同一 URL 下追加)。
          背景按模板的 deepest / deep 交替节奏排布:有活动介绍段时本段取 deep。 */}
      {hasRecap ? (
        <section
          className={`${d.ed1Section} ${event.body.trim().length > 0 ? d.altBg : ''}`}
        >
          <div className={d.ed1Inner}>
            <span className={d.eyebrow}>RECAP · 活动回顾</span>
            <RevealOnView as="h2" className={d.sectionH2}>
              活动回顾
            </RevealOnView>
            <div className={d.ed1Block}>
              <CmsMarkdown md={event.recapBody} classes={PROSE_CLASSES} />
            </div>

            {event.speakers.length > 0 ? (
              <>
                <div className={d.ed1Sep} aria-hidden="true" />
                <div className={d.ed1Block}>
                  <h3 className={d.ed1BlockH3}>主讲人</h3>
                  {event.speakers.map((s) => (
                    <div key={s.name} className={d.ed1Sub}>
                      <p className={d.ed1SubLabel}>{s.name}</p>
                      {s.title ? <p className={d.ed1Body}>{s.title}</p> : null}
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {/* 活动纪要免责 —— 属 events,不属 news。文案写死,编辑不可关闭。
                放在回顾段内,与页面其余段落左缘对齐。 */}
            <EventRecapDisclaimer />
          </div>
        </section>
      ) : null}

      {/* R05 同款 — 图集卡片网格 */}
      {hasRecap && event.gallery.length > 0 ? (
        <section
          className={`${d.learnMoreSection} ${event.body.trim().length > 0 ? '' : d.altBg}`}
        >
          <div className={d.learnMoreInner}>
            <span className={d.eyebrow}>GALLERY · 现场图集</span>
            <RevealOnView as="h2" className={d.sectionH2}>
              现场图集
            </RevealOnView>
            <div className={d.learnMoreGrid}>
              {event.gallery.map((g, i) => (
                <figure key={g.image} className={d.learnMoreCard}>
                  <span className={d.learnMoreNum}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className={d.typeImageBox}>{GALLERY_IMAGE(g)}</div>
                  <figcaption className={d.learnMoreBody}>{g.alt}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* R06 同款 — CTA Banner */}
      <section className={d.ctaSection}>
        <div className={d.ctaInner}>
          <RevealOnView as="h2" className={d.ctaH2}>
            准备好参加 SAREC 活动了吗
          </RevealOnView>
          <p className={d.ctaSubtitle}>活动不是入门,是合作的开始。</p>
          <div className={d.ctaRow}>
            <Link href="/zh/contact" className={d.ctaPrimary}>
              报名活动 / 参加考察团
            </Link>
            <Link href="/zh/membership" className={d.ctaSecondary}>
              加入会员,参与全部活动
            </Link>
            <Link href="/zh/events" className={d.ctaSecondary}>
              返回新闻与活动
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
