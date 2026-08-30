import type { Metadata } from 'next';
import Link from 'next/link';
import { SaImage } from '@/components/shared/SaImage';
import { RevealOnView } from '@/components/shared/RevealOnView';
import { createPageMetadata } from '@/lib/seo';
import { ViewportLockScript } from '@/components/sections/research/ViewportLockScript';
import { FilterableProjectGrid, type FilterOption } from '@/components/cms/Filters';
import { listProjects } from '@/lib/cms/content';
import {
  PROJECT_REGION_LABEL,
  PROJECT_STAGE_LABEL,
  PROJECT_TYPE_LABEL,
  SAREC_ROLE_LABEL
} from '@/lib/cms/labels';
import type { ProjectItem, ProjectRegion, ProjectType } from '@/lib/cms/types';
import styles from './projects.module.css';
import { ProjectsHero } from './ProjectsHero';

export const metadata: Metadata = createPageMetadata({
  title: 'SAREC 会员项目｜中美房地产商会',
  description:
    '汇集会员单位发起、参与及提供专业服务的房地产项目。覆盖经济适用房开发(ED1)、精品公寓、跨境股权合作等类型,采用清晰的法律结构、账户结构和风险边界。',
  path: '/zh/projects'
});

/* ── 以下两组固定内容为原 /zh/projects 页面正文(P02 项目类型、P04 合作机制),
      逐字未改,仅调整了在页面中的位置。合规注(complianceNote)随原文一并保留。 ── */

const projectTypes = [
  {
    code: '01',
    title: '经济适用房开发(ED1)',
    body: '快速审批、政策窗口、可负担住房需求下的项目机会。',
    role: 'SAREC 角色:政策结构判断 · 项目合作 · 投资人沟通',
    fitLabel: '适合特点:',
    fit: ['审批通道快', '政策红利明确', '市场刚需稳定', '中型规模'],
    image: '/images/projects/3434-chesapeake-ed1.webp',
    alt: 'SAREC ED1 项目实景 — 3434 Chesapeake'
  },
  {
    code: '02',
    title: '精品公寓项目',
    body: '洛杉矶核心地段中型住宅开发。',
    role: 'SAREC 角色:项目筛选 · 资本结构咨询 · 结构设计',
    fitLabel: '适合特点:',
    fit: [
      '区位价值清晰',
      '单位经济模型可验证',
      '长期持有 + 退出灵活',
      '适合中等规模投资人组合'
    ],
    image: '/images/projects/236-berendo.webp',
    alt: 'SAREC 精品公寓项目实景 — 236 Berendo'
  },
  {
    code: '03',
    title: '跨境股权合作项目',
    body: '中美投资人共同参与的项目股权结构。',
    role: 'SAREC 角色:法律结构设计 · 合规咨询 · 风险评估',
    fitLabel: '适合特点:',
    fit: [
      '跨境合规要求高',
      '投资人多元(中美双向)',
      '长期股权合作',
      '适合复杂结构需求'
    ],
    image: '/images/projects/2478-purdue.webp',
    alt: 'SAREC 跨境股权合作项目实景 — 2478 Purdue'
  }
];

const mechanisms = [
  {
    code: '01',
    title: 'LLC 项目公司',
    body: [
      '每个项目设立独立的 LLC 项目公司。',
      '资金通过 Escrow 进项目 LLC 账户,不进 SAREC 账户。'
    ],
    compliance:
      '涉及具体项目合作时,账户安排、资金路径、汇报机制和法律文件以项目协议为准。'
  },
  {
    code: '02',
    title: '同股同权',
    body: [
      '在符合 SAREC 服务标准的项目协作场景下,围绕合作结构与风险共担机制推进。',
      '我们优先采用利益一致、风险共担的合作结构。'
    ],
    compliance: '具体股权、决策权和退出安排,以项目协议为准。'
  },
  {
    code: '03',
    title: '后端激励',
    body: ['SAREC 优先采用利益一致、风险共担、后端激励的合作结构。'],
    compliance: '具体合作条款以项目阶段和服务边界为准。'
  },
  {
    code: '04',
    title: '项目监督',
    body: ['项目期间提供月度汇报、季度评估和重大事项通报。'],
    compliance: '具体汇报频率、形式和内容,以项目协议为准。'
  }
];

export default function ProjectsPage() {
  const projects = listProjects();

  const usedRegions = new Set(projects.map((p: ProjectItem) => p.region));
  const usedTypes = new Set(projects.map((p: ProjectItem) => p.projectType));
  const regionOptions: FilterOption[] = (Object.keys(PROJECT_REGION_LABEL) as ProjectRegion[])
    .filter((r) => usedRegions.has(r))
    .map((r) => ({ value: r as string, label: PROJECT_REGION_LABEL[r] }));
  const typeOptions: FilterOption[] = (Object.keys(PROJECT_TYPE_LABEL) as ProjectType[])
    .filter((t) => usedTypes.has(t))
    .map((t) => ({ value: t as string, label: PROJECT_TYPE_LABEL[t] }));

  // 筛选器是可选工具,只在某个维度确实有多个取值、点了会起作用时才出现。
  const showFilters = regionOptions.length > 1 || typeOptions.length > 1;

  // 锚点顺序 = 页面实际段落顺序。
  const anchors = [
    { href: '#project-types', label: '项目类型' },
    ...(projects.length > 0 ? [{ href: '#member-projects', label: '会员项目' }] : []),
    { href: '#how-we-work', label: '合作机制' }
  ];

  return (
    <main>
      <ViewportLockScript />

      {/* P01 — Cinematic Hero(client component:LA 项目实景 + Ken Burns + reveal H1) */}
      <ProjectsHero />

      {/* 页内锚点条(无强制 Tab) */}
      <nav className={styles.anchorBar} aria-label="页内导航">
        <div className={styles.anchorBarInner}>
          {anchors.map((a) => (
            <a key={a.href} href={a.href} className={styles.anchorLink}>
              {a.label}
            </a>
          ))}
        </div>
      </nav>

      {/* P02 — 项目类型 3 类(图 + 编号 + 标题 + body + 角色 + 适合特点) */}
      <section
        className={`${styles.typesSection} ${styles.anchorTarget}`}
        id="project-types"
      >
        <div className={styles.typesInner}>
          <span className={styles.eyebrow}>PROJECT TYPES · 项目类型</span>
          <RevealOnView as="h2" className={styles.sectionH2}>
            SAREC 参与的项目类型
          </RevealOnView>
          <p className={styles.sectionLead}>
            SAREC 不限定单一项目类型。我们关注符合&quot;项目判断、结构设计、风险控制&quot;原则的多种类型。
          </p>
          <div className={styles.typesGrid}>
            {projectTypes.map((p) => (
              <article key={p.code} className={styles.typeCard}>
                <div className={styles.typeImageBox}>
                  <SaImage
                    src={p.image}
                    alt={p.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    filterIntensity="none"
                    className={styles.typeImage}
                  />
                </div>
                <div className={styles.typeText}>
                  <span className={styles.typeNum}>{p.code}</span>
                  <h3 className={styles.typeH3}>{p.title}</h3>
                  <p className={styles.typeBody}>{p.body}</p>
                  <p className={styles.typeRole}>{p.role}</p>
                  <p className={styles.typeFitLabel}>{p.fitLabel}</p>
                  <ul className={styles.typeFitList}>
                    {p.fit.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.complianceNote}>
            具体项目名称、地址、规模与投资材料 —— 仅在合格沟通后提供。
          </p>
        </div>
      </section>

      {/* 会员项目卡片区 —— 接管被删除的 P03「代表性项目」段的位置与外壳,
          页面 deep / deepest 交替节奏与 main 逐段一致。
          措辞中性,不用「重点 / 精选 / 推荐」等可被读作商会评级的字样。 */}
      {projects.length > 0 ? (
        <section
          className={`${styles.featuredSection} ${styles.anchorTarget}`}
          id="member-projects"
        >
          <div className={styles.featuredInner}>
            <span className={styles.eyebrow}>MEMBER PROJECTS · 会员项目</span>
            <RevealOnView as="h2" className={styles.sectionH2}>
              会员项目
            </RevealOnView>
            {projects.length > 1 && showFilters ? (
              <p className={styles.sectionLead}>
                筛选是可选工具 —— 不选也可直接浏览全部项目。
              </p>
            ) : null}
            {projects.length === 1 ? (
              <FeaturedProject item={projects[0]} />
            ) : showFilters ? (
              <FilterableProjectGrid
                regionOptions={regionOptions}
                typeOptions={typeOptions}
                items={projects.map((p: ProjectItem) => ({
                  key: p.slug,
                  region: p.region as string,
                  projectType: p.projectType as string,
                  node: <ProjectCard item={p} />
                }))}
                classes={{
                  row: styles.filterRow,
                  btn: styles.filterBtn,
                  btnActive: styles.filterBtnActive,
                  stack: styles.typesGrid,
                  empty: styles.emptyNote
                }}
              />
            ) : (
              <div className={styles.typesGrid}>
                {projects.map((p: ProjectItem) => (
                  <ProjectCard key={p.slug} item={p} />
                ))}
              </div>
            )}
            <p className={styles.complianceNote}>
              具体项目名称、地址、规模与投资材料 —— 仅在合格沟通后提供。
            </p>
          </div>
        </section>
      ) : null}

      {/* P04 — 4 个核心机制(2x2 卡片) */}
      <section
        className={`${styles.mechanismSection} ${styles.anchorTarget}`}
        id="how-we-work"
      >
        <div className={styles.mechanismInner}>
          <span className={styles.eyebrow}>HOW WE WORK · 项目合作机制</span>
          <RevealOnView as="h2" className={styles.sectionH2}>
            4 个核心机制
          </RevealOnView>
          <p className={styles.sectionLead}>
            SAREC 项目合作的核心机制 —— 不是规模、不是回报承诺,而是法律结构、账户结构和风险边界。
          </p>
          <div className={styles.mechanismGrid}>
            {mechanisms.map((m) => (
              <article key={m.code} className={styles.mechanismCard}>
                <span className={styles.mechanismNum}>{m.code}</span>
                <h3 className={styles.mechanismH3}>{m.title}</h3>
                {m.body.map((line, i) => (
                  <p key={i} className={styles.mechanismBody}>
                    {line}
                  </p>
                ))}
                <p className={styles.complianceNote}>{m.compliance}</p>
              </article>
            ))}
          </div>
          <p className={styles.mechanismInlineCta}>
            完整服务入口详见 →{' '}
            <Link href="/zh/services" className={styles.inlineLink}>
              /zh/services
            </Link>
          </p>
        </div>
      </section>

      {/* P05 — FAQ 3 题(<details>/<summary> 同 Events E05) */}
      <section className={styles.faqSection}>
        <div className={styles.faqInner}>
          <span className={styles.eyebrow}>FAQ · 常见问题</span>
          <RevealOnView as="h2" className={styles.sectionH2}>
            项目常见问题
          </RevealOnView>
          <div className={styles.faqList}>
            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                <span className={styles.faqQNum}>Q1</span>
                <span className={styles.faqQText}>
                  SAREC 目前有多少在管项目?
                </span>
                <span className={styles.faqChevron} aria-hidden="true">
                  +
                </span>
              </summary>
              <div className={styles.faqAnswer}>
                <p>
                  SAREC 已参与多个南加州房地产项目合作,覆盖经济适用房(ED1)、精品公寓、跨境股权合作等类型。
                </p>
                <p className={styles.complianceNote}>
                  具体项目数量、规模和投资材料,仅在合格沟通后提供。
                </p>
              </div>
            </details>

            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                <span className={styles.faqQNum}>Q2</span>
                <span className={styles.faqQText}>
                  投资 SAREC 项目的最小金额是多少?
                </span>
                <span className={styles.faqChevron} aria-hidden="true">
                  +
                </span>
              </summary>
              <div className={styles.faqAnswer}>
                <p>
                  不同项目类型最小投资金额不同,通常在合格投资人(Accredited Investor)标准之上。
                </p>
                <p className={styles.complianceNote}>
                  具体金额、合作方式和投资材料,在合格沟通后提供。
                </p>
              </div>
            </details>

            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                <span className={styles.faqQNum}>Q3</span>
                <span className={styles.faqQText}>
                  SAREC 自己是否参与项目投资?
                </span>
                <span className={styles.faqChevron} aria-hidden="true">
                  +
                </span>
              </summary>
              <div className={styles.faqAnswer}>
                <p>
                  在符合 SAREC 服务标准的项目协作场景下,围绕合作结构与风险共担机制推进。
                </p>
                <p>优先采用利益一致、风险共担、后端激励的合作结构。</p>
                <p className={styles.complianceNote}>
                  具体股权、决策权和退出安排,以项目协议为准。
                </p>
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* P06 — CTA Banner(上下金线 + 3 CTA) */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <RevealOnView as="h2" className={styles.ctaH2}>
            准备好看具体项目了吗
          </RevealOnView>
          <p className={styles.ctaSubtitle}>
            项目评估 · 30 分钟。
            <br />
            匹配则进入项目细节,不匹配也直接告诉你。
          </p>
          <div className={styles.ctaRow}>
            <Link href="/zh/contact" className={styles.ctaPrimary}>
              项目评估 · 30 分钟
            </Link>
            <Link href="/zh/case-studies" className={styles.ctaSecondary}>
              查看案例研究
            </Link>
            <Link href="/zh/contact" className={styles.ctaSecondary}>
              预约 30 分钟沟通
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ── 卡片 —— 全部复用本页 P02 项目类型卡的既有规格(.typeCard / .typeImageBox /
      .typeImage / .typeText / .typeNum / .typeH3 / .typeBody / .typeRole),不新造卡片样式。
      角色统一走枚举 label,渲染层不留自由文本入口。 ── */

function ProjectCard({ item }: { item: ProjectItem }) {
  return (
    <article className={styles.typeCard}>
      {item.coverImage ? (
        <div className={styles.typeImageBox}>
          <SaImage
            src={item.coverImage}
            alt={item.title}
            fill
            sizes="(max-width: 1024px) 100vw, 33vw"
            filterIntensity="none"
            className={styles.typeImage}
          />
        </div>
      ) : null}
      <div className={styles.typeText}>
        <span className={styles.typeNum}>
          {PROJECT_REGION_LABEL[item.region]} · {PROJECT_STAGE_LABEL[item.stage]}
        </span>
        <h3 className={styles.typeH3}>{item.title}</h3>
        <p className={styles.typeBody}>{item.summary}</p>
        {item.sarecRole.length > 0 ? (
          <p className={styles.typeRole}>
            SAREC 角色:{item.sarecRole.map((r) => SAREC_ROLE_LABEL[r] ?? r).join(' · ')}
          </p>
        ) : null}
        <Link href={`/zh/projects/${item.slug}`} className={styles.featuredCta}>
          查看项目详情 →
        </Link>
      </div>
    </article>
  );
}

/* ── 单条项目时的 50/50 布局 —— DOM 结构与 className 逐段照抄 main 的 P03
      「代表性项目」信息卡 + 大图,只把写死的内容换成 collection 字段。
      规格一字未改;≥2 条时改用上方 P02 同款 .typesGrid 3 列栅格。 ── */

function FeaturedProject({ item }: { item: ProjectItem }) {
  return (
    <div className={styles.featuredGrid}>
      <div className={styles.featuredCard}>
        <p className={styles.featuredAddress}>{item.title}</p>
        <p className={styles.featuredLocation}>
          {PROJECT_REGION_LABEL[item.region]} · {PROJECT_TYPE_LABEL[item.projectType]}
        </p>
        <div className={styles.featuredStats}>
          <div className={styles.featuredStat}>
            <span className={styles.featuredStatStatus}>
              {PROJECT_STAGE_LABEL[item.stage]}
            </span>
          </div>
        </div>
        <div className={styles.featuredMeta}>
          <p className={styles.featuredMetaRow}>
            <span className={styles.featuredMetaLabel}>项目类型:</span>{' '}
            {PROJECT_TYPE_LABEL[item.projectType]}
          </p>
          {item.sarecRole.length > 0 ? (
            <p className={styles.featuredMetaRow}>
              <span className={styles.featuredMetaLabel}>SAREC 角色:</span>{' '}
              {item.sarecRole.map((r) => SAREC_ROLE_LABEL[r] ?? r).join(' / ')}
            </p>
          ) : null}
        </div>
        <Link href={`/zh/projects/${item.slug}`} className={styles.featuredCta}>
          查看项目详情 →
        </Link>
      </div>
      {item.coverImage ? (
        <div className={styles.featuredMedia}>
          <div className={styles.featuredImageBox}>
            <SaImage
              src={item.coverImage}
              alt={item.title}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              filterIntensity="none"
              className={styles.featuredImage}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
