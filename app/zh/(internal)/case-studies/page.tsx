import type { Metadata } from 'next';
import Link from 'next/link';
import { SaImage } from '@/components/shared/SaImage';
import { RevealOnView } from '@/components/shared/RevealOnView';
import { createPageMetadata } from '@/lib/seo';
import styles from './case-studies.module.css';
import { CaseStudiesHero } from './CaseStudiesHero';

export const metadata: Metadata = createPageMetadata({
  title: 'SAREC 项目案例｜中美房地产商会',
  description:
    'SAREC 已公开的代表性项目案例。Rosewood ED1 经济适用房 + 三类项目经验 + 案例公开 3 原则。',
  path: '/zh/case-studies'
});

type ProjectCard = {
  code: string;
  name: string;
  image: string;
  location: string;
  type: string;
  stats: { units: string; floors: string; stage: string };
  role: string;
  href?: string;
  hasDetail: boolean;
};

const projects: ProjectCard[] = [
  {
    code: '01',
    name: '4136 Rosewood Ave',
    image: '/images/projects/4136-rosewood-rendering.png',
    location: '洛杉矶 East Hollywood',
    type: 'ED1 经济适用房',
    stats: { units: '69', floors: '6', stage: '在管' },
    role: '项目合作 / 投资人沟通',
    href: '/zh/case-studies/4136-rosewood',
    hasDetail: true
  },
  {
    code: '02',
    name: '3434 Chesapeake Ave',
    image: '/images/projects/3434-chesapeake-ed1.webp',
    location: 'Los Angeles, CA 90016',
    type: 'ED1 经济适用房 · 精品公寓',
    stats: { units: '66', floors: '6', stage: '审批中' },
    role: '项目合作',
    hasDetail: false
  },
  {
    code: '03',
    name: '2215 Wellesley Ave',
    image: '/images/projects/2215-wellesley-ed1.webp',
    location: 'Los Angeles, CA 90064',
    type: 'ED1 经济适用房 · 精品公寓',
    stats: { units: '84', floors: '8', stage: '建设中' },
    role: '项目合作',
    hasDetail: false
  },
  {
    code: '04',
    name: '4155 Wilshire Bronson',
    image: '/images/projects/4155-wilshire-bronson.webp',
    location: '4155 Wilshire Blvd, LA 90010',
    type: '高端住宅 Condo 开发',
    stats: { units: '54', floors: '8', stage: '审批中' },
    role: '项目合作',
    hasDetail: false
  }
];

const projectExperiences = [
  {
    code: '01',
    title: '经济适用房开发(ED1)',
    body: '快速审批、政策窗口、可负担住房需求下的项目机会。',
    role: 'SAREC 角色:政策结构判断 · 项目合作 · 投资人沟通'
  },
  {
    code: '02',
    title: '精品公寓项目',
    body: '洛杉矶核心地段中型住宅开发。',
    role: 'SAREC 角色:项目筛选 · 资本结构咨询 · 结构设计'
  },
  {
    code: '03',
    title: '跨境股权合作项目',
    body: '中美投资人共同参与的项目股权结构。',
    role: 'SAREC 角色:法律结构设计 · 合规咨询 · 风险评估'
  }
];

const disclosurePrinciples = [
  {
    code: '01',
    title: '仅公开经合作方授权的项目',
    body: '每个公开案例需经过项目合作方(开发商、投资人、合作开发商)授权。未授权的项目不会出现在 SAREC 公开材料中。'
  },
  {
    code: '02',
    title: '不公开敏感经济条款',
    body: '公开案例不包含投资金额、投资人姓名、收益预测、Carry 比例、LP/GP 比例等敏感经济条款。'
  },
  {
    code: '03',
    title: '详细资料在合格沟通后提供',
    body: '项目详细资料、财务模型、合作结构、风险清单 —— 仅向通过合格审核的潜在合作方提供。'
  }
];

export default function CaseStudiesPage() {
  return (
    <main>
      {/* C01 — Cinematic Hero(client component:2219 Wellesley + Ken Burns + reveal H1) */}
      <CaseStudiesHero />

      {/* C02 — 4 个已公开案例(2x2 grid) */}
      <section className={styles.featuredSection}>
        <div className={styles.featuredInner}>
          <span className={styles.eyebrow}>PUBLISHED CASES · 已公开案例</span>
          <RevealOnView as="h2" className={styles.sectionH2}>
            当前已公开的代表性项目
          </RevealOnView>
          <div className={styles.projectGrid}>
            {projects.map((p) => (
              <article key={p.code} className={styles.projectCard}>
                <div className={styles.projectImageBox}>
                  <SaImage
                    src={p.image}
                    alt={p.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    filterIntensity="none"
                    className={styles.projectImage}
                  />
                </div>
                <div className={styles.projectBody}>
                  <span className={styles.projectNum}>{p.code}</span>
                  <h3 className={styles.projectName}>{p.name}</h3>
                  <p className={styles.projectLocation}>{p.location}</p>
                  <p className={styles.projectType}>{p.type}</p>
                  <div className={styles.projectStats}>
                    <div className={styles.projectStat}>
                      <span className={styles.projectStatNum}>
                        {p.stats.units}
                      </span>
                      <span className={styles.projectStatLabel}>单元</span>
                    </div>
                    <span className={styles.projectStatSep} aria-hidden="true">
                      ·
                    </span>
                    <div className={styles.projectStat}>
                      <span className={styles.projectStatNum}>
                        {p.stats.floors}
                      </span>
                      <span className={styles.projectStatLabel}>层</span>
                    </div>
                    <span className={styles.projectStatSep} aria-hidden="true">
                      ·
                    </span>
                    <div className={styles.projectStat}>
                      <span className={styles.projectStatStatus}>
                        {p.stats.stage}
                      </span>
                    </div>
                  </div>
                  <p className={styles.projectRole}>
                    <span className={styles.projectRoleLabel}>
                      SAREC 角色:
                    </span>{' '}
                    {p.role}
                  </p>
                  {p.hasDetail && p.href ? (
                    <Link href={p.href} className={styles.projectCta}>
                      查看完整案例 →
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
          <p className={styles.featuredNote}>更多案例陆续公开。</p>
        </div>
      </section>

      {/* C03 — 三类项目经验(纯文字 3 列) */}
      <section className={styles.experienceSection}>
        <div className={styles.experienceInner}>
          <span className={styles.eyebrow}>
            PROJECT EXPERIENCE · 项目类型经验
          </span>
          <RevealOnView as="h2" className={styles.sectionH2}>
            三类项目经验
          </RevealOnView>
          <p className={styles.sectionLead}>
            除已公开案例外,SAREC 在以下三类项目中均有合作经验。
          </p>
          <div className={styles.experienceGrid}>
            {projectExperiences.map((p) => (
              <article key={p.code} className={styles.experienceCard}>
                <span className={styles.experienceNum}>{p.code}</span>
                <h3 className={styles.experienceH3}>{p.title}</h3>
                <p className={styles.experienceBody}>{p.body}</p>
                <p className={styles.experienceRole}>{p.role}</p>
              </article>
            ))}
          </div>
          <p className={styles.complianceNote}>
            具体项目名称、地址、规模与投资材料 —— 仅在合格沟通后提供。
          </p>
        </div>
      </section>

      {/* C04 — 案例公开 3 原则(3 列卡片) */}
      <section className={styles.disclosureSection}>
        <div className={styles.disclosureInner}>
          <span className={styles.eyebrow}>
            DISCLOSURE PRINCIPLES · 公开原则
          </span>
          <RevealOnView as="h2" className={styles.sectionH2}>
            案例公开 3 个原则
          </RevealOnView>
          <p className={styles.sectionLead}>
            SAREC 在案例公开上遵循三个原则。
          </p>
          <div className={styles.disclosureGrid}>
            {disclosurePrinciples.map((d) => (
              <article key={d.code} className={styles.disclosureCard}>
                <span className={styles.disclosureNum}>{d.code}</span>
                <h3 className={styles.disclosureH3}>{d.title}</h3>
                <p className={styles.disclosureBody}>{d.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* C05 — CTA Banner(上下金线 + 2 CTA) */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <RevealOnView as="h2" className={styles.ctaH2}>
            想看具体项目细节?
          </RevealOnView>
          <p className={styles.ctaSubtitle}>
            合格沟通后,提供完整项目资料。
          </p>
          <div className={styles.ctaRow}>
            <Link href="/zh/contact" className={styles.ctaPrimary}>
              项目评估 · 30 分钟
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
