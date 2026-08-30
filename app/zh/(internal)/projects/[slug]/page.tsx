import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RevealOnView } from '@/components/shared/RevealOnView';
import { createPageMetadata, SITE_URL } from '@/lib/seo';
import { ViewportLockScript } from '@/components/sections/research/ViewportLockScript';
import { CmsDetailHero } from '@/components/cms/CmsDetailHero';
import { CmsMarkdown } from '@/components/cms/CmsMarkdown';
import { MemberDisclaimer } from '@/components/cms/Disclaimers';
import { GALLERY_IMAGE, PROSE_CLASSES } from '@/components/cms/detailPresets';
import { getProjectBySlug, listProjects } from '@/lib/cms/content';
import { buildProjectJsonLd } from '@/lib/cms/schema';
import { buildBreadcrumbJsonLd } from '@/lib/geo/schema';
import {
  MEMBER_ROLE_LABEL,
  PROJECT_REGION_LABEL,
  PROJECT_STAGE_LABEL,
  PROJECT_TAG_LABEL,
  PROJECT_TYPE_LABEL,
  SAREC_ROLE_LABEL
} from '@/lib/cms/labels';
import d from '@/components/cms/detail.module.css';

/**
 * 会员项目详情 —— /zh/projects/<slug>。
 * ------------------------------------------------------------------
 * 版式逐段照抄站内既有详情页 /zh/case-studies/4136-rosewood:
 *   R01 Cinematic Hero → R02 概览数据表 → R03 Editorial 正文 → R04/R05 卡片 → 免责 → R06 CTA。
 *
 * 【合规硬约束】
 *  - MemberDisclaimer 在本页强制渲染,内容编辑不可关闭。
 *  - 参与方统一用「参与方」口径展示;角色只出枚举 label,不渲染任何自由文本角色。
 *  - 阶段(stage)只在此展示,不作为列表筛选条件。
 *  - JSON-LD 默认 WebPage;仅当确为完整案例文章时才用 Article。
 */

type Params = { slug: string };

/** 无封面图时的兜底头图 —— 与 /zh/projects 页 hero 同一张站内既有素材。 */
const FALLBACK_HERO = '/images/artgrid/la-city-02.jpg';

export function generateStaticParams(): Params[] {
  return listProjects().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const project = getProjectBySlug(params.slug);
  if (!project) return {};
  return createPageMetadata({
    title: `${project.title}｜SAREC 会员项目`,
    description: project.summary,
    path: `/zh/projects/${project.slug}`
  });
}

export default function ProjectDetailPage({ params }: { params: Params }) {
  const project = getProjectBySlug(params.slug);
  if (!project) notFound();

  const pathname = `/zh/projects/${project.slug}`;
  // PR-1 阶段 memberUnits 尚无内容条目,故不注入关联单位名称;
  // PR-2 回填后由 memberUnits 解析出名称传入 memberOrganizations。
  const projectJsonLd = buildProjectJsonLd(project, { siteUrl: SITE_URL, pathname });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '首页', url: `${SITE_URL}/zh` },
    { name: '会员项目', url: `${SITE_URL}/zh/projects` },
    { name: project.title, url: `${SITE_URL}${pathname}` }
  ]);

  return (
    <main>
      <ViewportLockScript />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(projectJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* R01 同款 — Cinematic Hero */}
      <CmsDetailHero
        eyebrow="MEMBER PROJECT · 会员项目"
        title={project.title}
        sublines={[
          `${PROJECT_REGION_LABEL[project.region]} · ${PROJECT_TYPE_LABEL[project.projectType]}`
        ]}
        stats={[{ status: PROJECT_STAGE_LABEL[project.stage] }]}
        image={{ src: project.coverImage ?? FALLBACK_HERO, alt: project.title }}
        primaryCta={{ label: '项目评估 · 30 分钟', href: '/zh/contact' }}
        secondaryCta={{ label: '查看全部会员项目', href: '/zh/projects' }}
      />

      {/* R02 同款 — 概览数据表 */}
      <section className={d.overviewSection}>
        <div className={d.overviewInner}>
          <span className={d.eyebrow}>PROJECT OVERVIEW · 项目概览</span>
          <RevealOnView as="h2" className={d.sectionH2}>
            项目基本信息
          </RevealOnView>
          <dl className={d.overviewTable}>
            <div className={d.overviewRow}>
              <dt className={d.overviewLabel}>项目名称</dt>
              <dd className={d.overviewValue}>{project.title}</dd>
            </div>
            <div className={d.overviewRow}>
              <dt className={d.overviewLabel}>地区</dt>
              <dd className={d.overviewValue}>{PROJECT_REGION_LABEL[project.region]}</dd>
            </div>
            <div className={d.overviewRow}>
              <dt className={d.overviewLabel}>项目类型</dt>
              <dd className={d.overviewValue}>{PROJECT_TYPE_LABEL[project.projectType]}</dd>
            </div>
            <div className={d.overviewRow}>
              <dt className={d.overviewLabel}>当前阶段</dt>
              <dd className={d.overviewValue}>{PROJECT_STAGE_LABEL[project.stage]}</dd>
            </div>
            {project.sarecRole.length > 0 ? (
              <div className={d.overviewRow}>
                <dt className={d.overviewLabel}>SAREC 角色</dt>
                <dd className={d.overviewValue}>
                  {project.sarecRole.map((r) => SAREC_ROLE_LABEL[r] ?? r).join(' / ')}
                </dd>
              </div>
            ) : null}
            {project.tags.length > 0 ? (
              <div className={d.overviewRow}>
                <dt className={d.overviewLabel}>标签</dt>
                <dd className={d.overviewValue}>
                  {project.tags.map((t) => PROJECT_TAG_LABEL[t]).join(' / ')}
                </dd>
              </div>
            ) : null}
            <div className={d.overviewRow}>
              <dt className={d.overviewLabel}>资料核实</dt>
              <dd className={d.overviewValue}>{project.lastVerified.replace(/-/g, '.')}</dd>
            </div>
          </dl>
          <p className={d.complianceNote}>
            具体投资材料、合作结构和财务细节 —— 仅在合格沟通后提供。
          </p>
          {/* 会员项目免责 —— 强制渲染,内容编辑不可关闭。
              放在概览段内,与页面其余段落左缘对齐。 */}
          <MemberDisclaimer />
        </div>
      </section>

      {/* R03 同款 — Editorial 正文 */}
      {project.body.trim().length > 0 ? (
        <section className={d.ed1Section}>
          <div className={d.ed1Inner}>
            <span className={d.eyebrow}>ABOUT · 项目说明</span>
            <RevealOnView as="h2" className={d.sectionH2}>
              项目说明
            </RevealOnView>
            <div className={d.ed1Block}>
              <CmsMarkdown md={project.body} classes={PROSE_CLASSES} />
            </div>
          </div>
        </section>
      ) : null}

      {/* R05 同款 — 参与方(无关联单位时整块隐藏,不显示空占位)。
          背景按模板的 deepest / deep 交替节奏排布。 */}
      {project.linkedMembers.length > 0 ? (
        <section className={`${d.learnMoreSection} ${d.altBg}`}>
          <div className={d.learnMoreInner}>
            <span className={d.eyebrow}>PARTIES · 参与方</span>
            <RevealOnView as="h2" className={d.sectionH2}>
              参与方
            </RevealOnView>
            <div className={d.learnMoreGrid}>
              {project.linkedMembers.map((m, i) => (
                <article key={m.unit} className={d.learnMoreCard}>
                  <span className={d.learnMoreNum}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className={d.learnMoreH3}>{m.unit}</h3>
                  <p className={d.learnMoreBody}>
                    {m.roles.map((r) => MEMBER_ROLE_LABEL[r]).join(' / ')}
                  </p>
                  {m.roleDescription ? (
                    <p className={d.learnMoreBody}>{m.roleDescription}</p>
                  ) : null}
                  <Link href={`/zh/members/units/${m.unit}`} className={d.learnMoreCta}>
                    查看会员单位 →
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* R05 同款 — 图集卡片网格 */}
      {project.gallery.length > 0 ? (
        <section
          className={`${d.learnMoreSection} ${project.linkedMembers.length > 0 ? '' : d.altBg}`}
        >
          <div className={d.learnMoreInner}>
            <span className={d.eyebrow}>GALLERY · 项目图集</span>
            <RevealOnView as="h2" className={d.sectionH2}>
              项目图集
            </RevealOnView>
            <div className={d.learnMoreGrid}>
              {project.gallery.map((g, i) => (
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
            准备好看具体项目了吗
          </RevealOnView>
          <p className={d.ctaSubtitle}>
            项目评估 · 30 分钟。
            <br />
            匹配则进入项目细节,不匹配也直接告诉你。
          </p>
          <div className={d.ctaRow}>
            <Link href="/zh/contact" className={d.ctaPrimary}>
              项目评估 · 30 分钟
            </Link>
            <Link href="/zh/case-studies" className={d.ctaSecondary}>
              查看案例研究
            </Link>
            <Link href="/zh/projects" className={d.ctaSecondary}>
              返回会员项目
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
