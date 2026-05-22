import type { Metadata } from 'next';
import Link from 'next/link';
import { RevealOnView } from '@/components/shared/RevealOnView';
import { createPageMetadata } from '@/lib/seo';
import styles from './rosewood.module.css';
import { RosewoodHero } from './RosewoodHero';

export const metadata: Metadata = createPageMetadata({
  title: '4136 Rosewood Ave｜SAREC 项目案例',
  description:
    '4136 Rosewood Ave — 洛杉矶 East Hollywood ED1 经济适用房开发项目。69 单元、6 层、在管。SAREC 角色:项目合作 / 投资人沟通。',
  path: '/zh/case-studies/4136-rosewood'
});

const overview = [
  ['项目名称', '4136 Rosewood Ave'],
  ['地址', '洛杉矶 East Hollywood'],
  ['项目类型', '经济适用房开发(ED1)'],
  ['规模', '69 单元'],
  ['层数', '6 层'],
  ['当前阶段', '在管']
] as const;

type RoleCard = {
  code: string;
  title: string;
  body: string[];
  bulletList?: string[];
  compliance: string | null;
};

const roles: RoleCard[] = [
  {
    code: '01',
    title: '项目合作',
    body: [
      '与合作开发商共同推进项目。',
      '参与项目筛选、结构设计、风险评估。',
      '合作开发商具备 15 年美国本地经验。'
    ],
    compliance: null
  },
  {
    code: '02',
    title: '投资人沟通',
    body: [
      '代表投资人视角,确保项目结构对齐投资人利益。',
      '包括:项目尽调、合同审核、风险评估、投资结构设计。'
    ],
    compliance: null
  },
  {
    code: '03',
    title: '过程监督',
    body: ['项目期间持续监督:'],
    bulletList: [
      '进度跟踪',
      '财务状况',
      '重大事项通报',
      '投资人沟通会'
    ],
    compliance: '具体汇报频率、形式和内容,以项目协议为准。'
  }
];

const learnMore = [
  {
    code: '01',
    title: '项目评估对话',
    body: '如果你正在考虑此类项目投资,预约 30 分钟项目评估,讨论 Rosewood 项目和你的需求匹配度。',
    cta: '项目评估 · 30 分钟',
    href: '/zh/contact'
  },
  {
    code: '02',
    title: '加入 SAREC 会员',
    body: '会员可获得:类似项目的优先信息、实地考察机会、与合作开发商面对面。',
    cta: '申请加入会员',
    href: '/zh/contact'
  },
  {
    code: '03',
    title: '阅读 ED1 政策研究',
    body: 'SAREC 即将发布 ED1 政策与项目机会的深度研究。',
    cta: '查看研究中心',
    href: '/zh/research'
  }
];

export default function Rosewood4136Page() {
  return (
    <main>
      {/* R01 — Cinematic Hero(client component:4136 渲染图 + Ken Burns + reveal H1)*/}
      <RosewoodHero />

      {/* R02 — 项目概览(6 行数据表 + [note])*/}
      <section className={styles.overviewSection}>
        <div className={styles.overviewInner}>
          <span className={styles.eyebrow}>PROJECT OVERVIEW · 项目概览</span>
          <RevealOnView as="h2" className={styles.sectionH2}>
            项目基本信息
          </RevealOnView>
          <dl className={styles.overviewTable}>
            {overview.map(([label, value]) => (
              <div key={label} className={styles.overviewRow}>
                <dt className={styles.overviewLabel}>{label}</dt>
                <dd className={styles.overviewValue}>{value}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.complianceNote}>
            具体投资材料、合作结构和财务细节 —— 仅在合格沟通后提供。
          </p>
        </div>
      </section>

      {/* R03 — ED1 政策深度(Editorial 长文 4 块)*/}
      <section className={styles.ed1Section}>
        <div className={styles.ed1Inner}>
          <span className={styles.eyebrow}>ABOUT ED1 · 关于 ED1 政策</span>
          <RevealOnView as="h2" className={styles.sectionH2}>
            理解 ED1 政策
          </RevealOnView>
          <p className={styles.sectionLead}>
            理解 4136 Rosewood 项目,需要先理解 ED1 政策背景。
          </p>

          {/* Block 1 — ED1 定义 */}
          <div className={styles.ed1Block}>
            <h3 className={styles.ed1BlockH3}>ED1 = Executive Directive 1</h3>
            <p className={styles.ed1Body}>
              洛杉矶市长 Karen Bass 于 2022 年 12 月 16 日颁布的行政指令,旨在加快洛杉矶市内庇护所和 100% 经济适用房项目(Shelters and 100 Percent Affordable Housing Projects)的审批通道。
            </p>
            <p className={styles.ed1Body}>
              ED1 已经过多次修订,最近一次为 2024 年 7 月 1 日,重点增加了对原住租户、历史建筑和环境敏感区域的保护。
            </p>
          </div>

          <div className={styles.ed1Sep} aria-hidden="true" />

          {/* Block 2 — 核心特点 3 子条 */}
          <div className={styles.ed1Block}>
            <h3 className={styles.ed1BlockH3}>ED1 项目的核心特点</h3>

            <div className={styles.ed1Sub}>
              <p className={styles.ed1SubLabel}>
                01 / 部级审批程序(Ministerial Approval Process)
              </p>
              <p className={styles.ed1Body}>
                合格项目走简化的部级审批通道,豁免裁量性审查(Discretionary Review),由城市规划局(City Planning)、建设安全局(LADBS)和洛杉矶住房局(LAHD)协同处理。
              </p>
            </div>

            <div className={styles.ed1Sub}>
              <p className={styles.ed1SubLabel}>02 / 审批周期</p>
              <p className={styles.ed1Body}>
                ED1 设定的官方目标是:60 天内完成审批 + 5 天内出具建设许可。
              </p>
              <p className={styles.ed1Body}>
                实际项目周期受现场条件、申请完整度、合作方响应速度、是否涉及历史保护或租户安置等因素影响,通常需要 9 个月,部分复杂项目可能需要 1 年。
              </p>
              <p className={styles.ed1Body}>
                相比传统经济适用房项目通常 18 个月以上的审批周期,ED1 项目仍显著缩短了时间表。
              </p>
              <p className={styles.insightNote}>
                理解真实周期是项目财务建模的前提之一。
              </p>
            </div>

            <div className={styles.ed1Sub}>
              <p className={styles.ed1SubLabel}>03 / 资格定义</p>
              <p className={styles.ed1Body}>
                ED1 适用于 5 单元以上、100% 经济适用房项目,所有单元须在 80% 区域中位收入(AMI)或更低,或采用混合收入结构(最多 20% 单元在 120% AMI、其余在 80% AMI 以下)。
              </p>
              <p className={styles.ed1Body}>具体资格审核由 LAHD 负责。</p>
            </div>
          </div>

          <div className={styles.ed1Sep} aria-hidden="true" />

          {/* Block 3 — 为什么值得关注 */}
          <div className={styles.ed1Block}>
            <h3 className={styles.ed1BlockH3}>为什么 ED1 项目值得关注</h3>
            <p className={styles.ed1Body}>
              <span className={styles.ed1Inline}>审批确定性:</span>
              相比传统审批通道,ED1 项目时间表更可预测,资金回笼周期可控。
            </p>
            <p className={styles.ed1Body}>
              <span className={styles.ed1Inline}>政策窗口:</span>
              当前在窗口期内推进的项目,享受简化审批流程;后续政策可能调整。
            </p>
            <p className={styles.ed1Body}>
              <span className={styles.ed1Inline}>可负担住房需求:</span>
              洛杉矶住房危机背景下,经济适用房有明确的市场需求和政府支持。
            </p>
          </div>

          <div className={styles.ed1Sep} aria-hidden="true" />

          {/* Block 4 — 资料来源 */}
          <div className={styles.ed1Block}>
            <h3 className={styles.ed1BlockH3}>资料来源</h3>
            <ul className={styles.ed1Sources}>
              <li>洛杉矶市城市规划局 · Executive Directive 1</li>
              <li>洛杉矶市长办公室 · Mayor Bass 关于 ED1 的官方声明</li>
            </ul>
          </div>
        </div>
      </section>

      {/* R04 — SAREC 在项目中的角色(3 卡横排)*/}
      <section className={styles.rolesSection}>
        <div className={styles.rolesInner}>
          <span className={styles.eyebrow}>OUR ROLE · 我们的角色</span>
          <RevealOnView as="h2" className={styles.sectionH2}>
            SAREC 在 4136 Rosewood 项目中
          </RevealOnView>
          <p className={styles.sectionLead}>
            SAREC 在 4136 Rosewood 项目中承担的具体工作。
          </p>
          <div className={styles.rolesGrid}>
            {roles.map((r) => (
              <article key={r.code} className={styles.roleCard}>
                <span className={styles.roleNum}>{r.code}</span>
                <h3 className={styles.roleH3}>{r.title}</h3>
                {r.body.map((line, i) => (
                  <p key={i} className={styles.roleBody}>
                    {line}
                  </p>
                ))}
                {r.bulletList ? (
                  <ul className={styles.roleBulletList}>
                    {r.bulletList.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                ) : null}
                {r.compliance ? (
                  <p className={styles.complianceNote}>{r.compliance}</p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* R05 — 了解更多 3 种入口(每卡含独立 CTA)*/}
      <section className={styles.learnMoreSection}>
        <div className={styles.learnMoreInner}>
          <span className={styles.eyebrow}>LEARN MORE · 了解更多</span>
          <RevealOnView as="h2" className={styles.sectionH2}>
            更多 4136 Rosewood 项目细节
          </RevealOnView>
          <p className={styles.sectionLead}>
            更多 4136 Rosewood 项目细节 —— 包括完整投资材料、财务模型、合作结构和风险清单 —— 仅向通过合格审核的潜在合作方提供。
          </p>
          <div className={styles.learnMoreGrid}>
            {learnMore.map((m) => (
              <article key={m.code} className={styles.learnMoreCard}>
                <span className={styles.learnMoreNum}>{m.code}</span>
                <h3 className={styles.learnMoreH3}>{m.title}</h3>
                <p className={styles.learnMoreBody}>{m.body}</p>
                <Link href={m.href} className={styles.learnMoreCta}>
                  {m.cta} →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* R06 — CTA Banner(上下金线 + 3 CTA)*/}
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <RevealOnView as="h2" className={styles.ctaH2}>
            对 4136 Rosewood 感兴趣?
          </RevealOnView>
          <p className={styles.ctaSubtitle}>
            项目评估 · 30 分钟。
            <br />
            合格沟通后,提供完整项目资料。
          </p>
          <div className={styles.ctaRow}>
            <Link href="/zh/contact" className={styles.ctaPrimary}>
              项目评估 · 30 分钟
            </Link>
            <Link href="/zh/membership" className={styles.ctaSecondary}>
              加入会员
            </Link>
            <Link href="/zh/case-studies" className={styles.ctaSecondary}>
              查看所有案例
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
