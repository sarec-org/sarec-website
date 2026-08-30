import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RevealOnView } from '@/components/shared/RevealOnView';
import { createPageMetadata, SITE_URL } from '@/lib/seo';
import { ViewportLockScript } from '@/components/sections/research/ViewportLockScript';
import { CmsMarkdown } from '@/components/cms/CmsMarkdown';
import { PROSE_CLASSES } from '@/components/cms/detailPresets';
import { getMemberProfileBySlug, getMemberUnitBySlug, listMemberProfiles } from '@/lib/cms/content';
import { buildMemberProfileJsonLd } from '@/lib/cms/schema';
import { buildBreadcrumbJsonLd } from '@/lib/geo/schema';
import { MEMBERSHIP_TIER_LABEL } from '@/lib/cms/labels';
import d from '@/components/cms/detail.module.css';
import styles from '../profile.module.css';
import { ProfileHero } from '../ProfileHero';

/**
 * 会员人物专访 —— /zh/members/profiles/<slug>。
 * ------------------------------------------------------------------
 * 版式照抄站内既有人物页 /zh/about/founder:
 *   F01 Editorial Split Hero → 访谈正文 → 所属单位卡 → F07 CTA。
 * 访谈正文段落规格与其余 CMS 详情页一致(.ed1Body / .ed1BlockH3 / .roleBulletList)。
 *
 * 【发布双闸】accessor 只返回 published 与 publicationApproved 均为 true 的条目;
 * 未过审人物不进 generateStaticParams,直接 notFound()。
 */

type Params = { slug: string };

/** 无照片时的兜底头图 —— 站内既有素材。 */
const FALLBACK_HERO = '/images/artgrid/la-city-02.jpg';

export function generateStaticParams(): Params[] {
  return listMemberProfiles().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const profile = getMemberProfileBySlug(params.slug);
  if (!profile) return {};
  const unit = profile.unit ? getMemberUnitBySlug(profile.unit) : null;
  const desc = [profile.name, profile.title, unit?.name, 'SAREC 会员人物专访']
    .filter(Boolean)
    .join(' · ');
  return createPageMetadata({
    title: `${profile.name}｜SAREC 会员人物`,
    description: desc,
    path: `/zh/members/profiles/${profile.slug}`,
    type: 'article'
  });
}

export default function MemberProfilePage({ params }: { params: Params }) {
  const profile = getMemberProfileBySlug(params.slug);
  if (!profile) notFound();

  const pathname = `/zh/members/profiles/${profile.slug}`;
  // 所属单位同样过双闸:单位未过审时不展示关联,避免间接暴露未过审资料。
  const unit = profile.unit ? getMemberUnitBySlug(profile.unit) : null;

  // 模板 /zh/about/founder 的节奏:hero 与首个内容段同为 deepest,其后逐段交替。
  // 本页内容段数量随内容浮动,故按【实际渲染顺序】算,不写死。
  const blocks = [profile.body.trim().length > 0, Boolean(unit)];
  const bgAt = (block: number) =>
    blocks.slice(0, block).filter(Boolean).length % 2 === 0 ? '' : styles.bgDeep;

  const personJsonLd = buildMemberProfileJsonLd(profile, {
    siteUrl: SITE_URL,
    pathname,
    unitName: unit?.name ?? null
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '首页', url: `${SITE_URL}/zh` },
    { name: '会员风采', url: `${SITE_URL}/zh/members` },
    { name: profile.name, url: `${SITE_URL}${pathname}` }
  ]);

  return (
    <main>
      <ViewportLockScript />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* F01 同款 — Editorial Split Hero */}
      <ProfileHero
        name={profile.name}
        title={profile.title}
        unitName={unit?.name ?? null}
        image={{
          src: profile.coverImage ?? FALLBACK_HERO,
          alt: `${profile.name} — SAREC 会员人物`
        }}
      />

      {/* 访谈正文 —— 段落规格与其余 CMS 详情页一致 */}
      {profile.body.trim().length > 0 ? (
        <section className={`${d.ed1Section} ${bgAt(0)}`}>
          <div className={d.ed1Inner}>
            <span className={d.eyebrow}>INTERVIEW · 专访</span>
            <RevealOnView as="h2" className={d.sectionH2}>
              专访
            </RevealOnView>
            <div className={d.ed1Block}>
              <CmsMarkdown md={profile.body} classes={PROSE_CLASSES} />
            </div>
          </div>
        </section>
      ) : null}

      {/* F04 同款 — 所属会员单位(无关联或单位未过审时整块隐藏) */}
      {unit ? (
        <section className={`${styles.methodSection} ${bgAt(1)}`}>
          <div className={styles.methodInner}>
            <span className={styles.eyebrow}>MEMBER UNIT · 所属会员单位</span>
            <RevealOnView as="h2" className={styles.sectionH2}>
              所属会员单位
            </RevealOnView>
            <div className={styles.methodGrid}>
              <article className={styles.methodCard}>
                <span className={styles.methodNum}>01</span>
                <h3 className={styles.methodH3}>{unit.name}</h3>
                <p className={styles.methodBody}>
                  {MEMBERSHIP_TIER_LABEL[unit.membershipTier]}
                </p>
                {unit.coreBusiness ? (
                  <p className={styles.methodBody}>{unit.coreBusiness}</p>
                ) : null}
                <p className={styles.methodBody}>
                  <Link href={`/zh/members/units/${unit.slug}`} className={d.learnMoreCta}>
                    查看单位详情 →
                  </Link>
                </p>
              </article>
            </div>
          </div>
        </section>
      ) : null}

      {/* F07 同款 — CTA Banner */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <RevealOnView as="h2" className={styles.ctaH2}>
            想成为 SAREC 会员吗
          </RevealOnView>
          <p className={styles.ctaSubtitle}>
            会员资料经商会核实并取得书面同意后在此展示。
          </p>
          <div className={styles.ctaRow}>
            <Link href="/zh/join" className={styles.ctaPrimary}>
              加入商会
            </Link>
            <Link href="/zh/members" className={styles.ctaSecondary}>
              返回会员风采
            </Link>
            <Link href="/zh/contact" className={styles.ctaSecondary}>
              联系 SAREC
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
