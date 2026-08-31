import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RevealOnView } from '@/components/shared/RevealOnView';
import { SaImage } from '@/components/shared/SaImage';
import { createPageMetadata, SITE_URL } from '@/lib/seo';
import { ViewportLockScript } from '@/components/sections/research/ViewportLockScript';
import { CmsDetailHero } from '@/components/cms/CmsDetailHero';
import {
  getMemberUnitBySlug,
  listMemberProfiles,
  listMemberUnits,
  listProjects
} from '@/lib/cms/content';
import { buildMemberUnitJsonLd } from '@/lib/cms/schema';
import { buildBreadcrumbJsonLd } from '@/lib/geo/schema';
import {
  EXPERTISE_LABEL,
  MEMBERSHIP_TIER_LABEL,
  PROJECT_REGION_LABEL,
  PROJECT_TYPE_LABEL,
  RELATIONSHIP_TAG_LABEL
} from '@/lib/cms/labels';
import d from '@/components/cms/detail.module.css';

/**
 * 会员单位详情 —— /zh/members/units/<slug>。
 * ------------------------------------------------------------------
 * 版式逐段照抄站内既有详情页 /zh/case-studies/4136-rosewood:
 *   R01 Cinematic Hero → R02 概览数据表 → R05 卡片入口 → R06 CTA。
 *
 * 【发布双闸】accessor 只返回 published 与 publicationApproved 均为 true 的条目;
 * 未过审单位不进 generateStaticParams,直接 notFound()。
 */

type Params = { slug: string };

/** 无 Logo 时的兜底头图 —— 站内既有素材,与 /zh/members hero 同一张。 */
const FALLBACK_HERO = '/images/la/la-skyline-marquee.jpg';

export function generateStaticParams(): Params[] {
  return listMemberUnits().map((u) => ({ slug: u.slug }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const unit = getMemberUnitBySlug(params.slug);
  if (!unit) return {};
  const desc = [
    `${unit.name} — SAREC ${MEMBERSHIP_TIER_LABEL[unit.membershipTier]}`,
    unit.coreBusiness ?? ''
  ]
    .filter(Boolean)
    .join('。');
  return createPageMetadata({
    title: `${unit.name}｜SAREC 会员单位`,
    description: desc,
    path: `/zh/members/units/${unit.slug}`
  });
}

export default function MemberUnitPage({ params }: { params: Params }) {
  const unit = getMemberUnitBySlug(params.slug);
  if (!unit) notFound();

  const pathname = `/zh/members/units/${unit.slug}`;
  // 该单位参与的会员项目(PR-1 的 linkedMembers 关联)。
  const relatedProjects = listProjects().filter((p) =>
    p.linkedMembers.some((m) => m.unit === unit.slug)
  );
  // 该单位的会员人物。
  const relatedProfiles = listMemberProfiles().filter((p) => p.unit === unit.slug);

  const orgJsonLd = buildMemberUnitJsonLd(unit, { siteUrl: SITE_URL, pathname });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '首页', url: `${SITE_URL}/zh` },
    { name: '会员风采', url: `${SITE_URL}/zh/members` },
    { name: unit.name, url: `${SITE_URL}${pathname}` }
  ]);

  // 概览段固定 deep,其后的板块按【实际渲染顺序】交替 deepest / deep;CTA 固定 deepest。
  const blocks = [relatedProjects.length > 0, relatedProfiles.length > 0];
  const bgAt = (block: number) =>
    blocks.slice(0, block).filter(Boolean).length % 2 === 0 ? '' : d.altBg;

  const tierLine = [
    MEMBERSHIP_TIER_LABEL[unit.membershipTier],
    ...unit.relationshipTags.map((t) => RELATIONSHIP_TAG_LABEL[t])
  ].join(' · ');

  return (
    <main>
      <ViewportLockScript />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* R01 同款 — Cinematic Hero */}
      <CmsDetailHero
        eyebrow="MEMBER UNIT · 会员单位"
        title={unit.name}
        sublines={[tierLine, ...(unit.coreBusiness ? [unit.coreBusiness] : [])]}
        stats={
          unit.joinedAt
            ? [{ status: `加入 ${unit.joinedAt.replace(/-/g, '.')}` }]
            : []
        }
        image={{ src: FALLBACK_HERO, alt: `${unit.name} — SAREC 会员单位` }}
        primaryCta={{ label: '联系 SAREC', href: '/zh/contact' }}
        secondaryCta={{ label: '查看全部会员', href: '/zh/members' }}
      />

      {/* R02 同款 — 概览数据表 */}
      <section className={d.overviewSection}>
        <div className={d.overviewInner}>
          <span className={d.eyebrow}>UNIT OVERVIEW · 单位概览</span>
          <RevealOnView as="h2" className={d.sectionH2}>
            单位基本信息
          </RevealOnView>
          <dl className={d.overviewTable}>
            <div className={d.overviewRow}>
              <dt className={d.overviewLabel}>单位名称</dt>
              <dd className={d.overviewValue}>{unit.name}</dd>
            </div>
            <div className={d.overviewRow}>
              <dt className={d.overviewLabel}>会员级别</dt>
              <dd className={d.overviewValue}>
                {MEMBERSHIP_TIER_LABEL[unit.membershipTier]}
              </dd>
            </div>
            {unit.relationshipTags.length > 0 ? (
              <div className={d.overviewRow}>
                <dt className={d.overviewLabel}>合作关系</dt>
                <dd className={d.overviewValue}>
                  {unit.relationshipTags.map((t) => RELATIONSHIP_TAG_LABEL[t]).join(' / ')}
                </dd>
              </div>
            ) : null}
            {unit.representative ? (
              <div className={d.overviewRow}>
                <dt className={d.overviewLabel}>代表人</dt>
                <dd className={d.overviewValue}>{unit.representative}</dd>
              </div>
            ) : null}
            {unit.coreBusiness ? (
              <div className={d.overviewRow}>
                <dt className={d.overviewLabel}>核心业务</dt>
                <dd className={d.overviewValue}>{unit.coreBusiness}</dd>
              </div>
            ) : null}
            {unit.expertise.length > 0 ? (
              <div className={d.overviewRow}>
                <dt className={d.overviewLabel}>专业领域</dt>
                <dd className={d.overviewValue}>
                  {unit.expertise.map((e) => EXPERTISE_LABEL[e]).join(' / ')}
                </dd>
              </div>
            ) : null}
            {unit.joinedAt ? (
              <div className={d.overviewRow}>
                <dt className={d.overviewLabel}>加入时间</dt>
                <dd className={d.overviewValue}>{unit.joinedAt.replace(/-/g, '.')}</dd>
              </div>
            ) : null}
            {unit.lastVerified ? (
              <div className={d.overviewRow}>
                <dt className={d.overviewLabel}>资料核实</dt>
                <dd className={d.overviewValue}>{unit.lastVerified.replace(/-/g, '.')}</dd>
              </div>
            ) : null}
          </dl>
          <p className={d.complianceNote}>
            本页面为商会会员单位公开资料展示,内容由该单位提供并经商会核实。
          </p>
        </div>
      </section>

      {/* R05 同款 — 参与的会员项目(无数据整块隐藏) */}
      {relatedProjects.length > 0 ? (
        <section className={`${d.learnMoreSection} ${bgAt(0)}`}>
          <div className={d.learnMoreInner}>
            <span className={d.eyebrow}>PROJECTS · 参与的会员项目</span>
            <RevealOnView as="h2" className={d.sectionH2}>
              参与的会员项目
            </RevealOnView>
            <div className={d.learnMoreGrid}>
              {relatedProjects.map((p, i) => (
                <article key={p.slug} className={d.learnMoreCard}>
                  <span className={d.learnMoreNum}>{String(i + 1).padStart(2, '0')}</span>
                  <h3 className={d.learnMoreH3}>{p.title}</h3>
                  <p className={d.learnMoreBody}>
                    {PROJECT_REGION_LABEL[p.region]} · {PROJECT_TYPE_LABEL[p.projectType]}
                  </p>
                  <Link href={`/zh/projects/${p.slug}`} className={d.learnMoreCta}>
                    查看项目详情 →
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* R05 同款 — 该单位的会员人物(无数据整块隐藏) */}
      {relatedProfiles.length > 0 ? (
        <section className={`${d.learnMoreSection} ${bgAt(1)}`}>
          <div className={d.learnMoreInner}>
            <span className={d.eyebrow}>PROFILES · 人物风采</span>
            <RevealOnView as="h2" className={d.sectionH2}>
              人物风采
            </RevealOnView>
            <div className={d.learnMoreGrid}>
              {relatedProfiles.map((p, i) => (
                <article key={p.slug} className={d.learnMoreCard}>
                  <span className={d.learnMoreNum}>{String(i + 1).padStart(2, '0')}</span>
                  <h3 className={d.learnMoreH3}>{p.name}</h3>
                  {p.title ? <p className={d.learnMoreBody}>{p.title}</p> : null}
                  <Link
                    href={`/zh/members/profiles/${p.slug}`}
                    className={d.learnMoreCta}
                  >
                    阅读专访 →
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* R06 同款 — CTA Banner */}
      <section className={d.ctaSection}>
        <div className={d.ctaInner}>
          <RevealOnView as="h2" className={d.ctaH2}>
            想成为 SAREC 会员单位吗
          </RevealOnView>
          <p className={d.ctaSubtitle}>
            会员资料经商会核实并取得书面同意后在此展示。
          </p>
          <div className={d.ctaRow}>
            <Link href="/zh/join" className={d.ctaPrimary}>
              加入商会
            </Link>
            <Link href="/zh/members" className={d.ctaSecondary}>
              返回会员风采
            </Link>
            <Link href="/zh/contact" className={d.ctaSecondary}>
              联系 SAREC
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
