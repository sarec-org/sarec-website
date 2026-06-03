import type { Metadata } from 'next';
import Link from 'next/link';
import { SaImage } from '@/components/shared/SaImage';
import { RevealOnView } from '@/components/shared/RevealOnView';
import { createPageMetadata } from '@/lib/seo';
import styles from './founder.module.css';
import { FounderHero } from './FounderHero';

export const metadata: Metadata = createPageMetadata({
  title: 'Andy Wang｜SAREC 中美房地产商会创始人',
  description:
    '一个经历过中国地产完整周期、懂项目、懂资金、懂结构、懂人性,来到美国后整合本地开发商和跨境资本的长期主义操盘者。Andy Wang · SAREC 创始人 · 跨境地产投资人。',
  path: '/zh/about/founder'
});

export default function FounderPage() {
  return (
    <main>
      {/* F01 — Editorial Split(client component:IntersectionObserver 触发 H1 clip-path reveal) */}
      <FounderHero />

      {/* F02 — 一句话定位(全宽 Quote) */}
      <section className={styles.quoteSection}>
        <div className={styles.quoteInner}>
          <RevealOnView as="blockquote" className={styles.quoteText}>
            我不做信息中介。
            <br />
            我做的是—— 把我懂的项目、懂的结构、懂的资本逻辑
            <br />
            变成可以被复制、被传承、被托付的事。
          </RevealOnView>
          <p className={styles.quoteCite}>Andy Wang</p>
        </div>
      </section>

      {/* F03 — 三段式背景 Vertical Timeline(年份按 Andy 拍板 patch) */}
      <section className={styles.timelineSection}>
        <div className={styles.timelineInner}>
          <span className={styles.eyebrow}>BACKGROUND · 背景</span>
          <RevealOnView as="h2" className={styles.sectionH2}>
            从中国地产到中美跨境
          </RevealOnView>
          <ol className={styles.timelineList}>
            <li className={styles.timelineItem}>
              <span className={styles.timelineDot} aria-hidden="true" />
              <span className={styles.timelineYear}>1998 — 2022 · 中国地产</span>
              <p className={styles.timelineBody}>
                我从中国房地产销售行业起步,长期参与多个大型住宅、商业与综合开发项目的销售、招商、客户与现场运营工作。
              </p>
              <p className={styles.timelineBody}>
                从一线销售员到项目操盘手,我亲历了中国房地产从黄金期到调整期的完整周期。
              </p>
            </li>
            <li className={styles.timelineItem}>
              <span className={styles.timelineDot} aria-hidden="true" />
              <span className={styles.timelineYear}>2016 — 2018 · 中欧 EMBA</span>
              <p className={styles.timelineBody}>
                2016 年我进入中欧国际工商学院 EMBA 系统学习。
              </p>
              <p className={styles.timelineBody}>
                不是为了&quot;管理学位&quot;,而是为了把过去 18 年实操经验放进财务、法律、组织、战略的系统框架。
              </p>
              <p className={styles.timelineBody}>
                中欧给我的是结构化思维 + 跨行业的视野。
              </p>
            </li>
            <li className={styles.timelineItem}>
              <span className={styles.timelineDot} aria-hidden="true" />
              <span className={styles.timelineYear}>2022 — 至今 · 美国跨境</span>
              <p className={styles.timelineBody}>
                2022 年我开始把目光转向美国。
              </p>
              <p className={styles.timelineBody}>
                不是逃避中国,而是看到一个新的窗口:中国资本需要美国项目,美国项目需要懂中国的合作方。
              </p>
              <p className={styles.timelineBody}>
                2024 我推动 SAREC 在美国落地。
              </p>
              <p className={styles.timelineBody}>
                SAREC 不是我的第二份事业,是我 28 年地产经验的延续。
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* F04 — 4 个方法论(Proof Grid 2x2);#methodology 锚点供案例页"查看判断方法论"CTA 跳转(deck 锁定路由) */}
      <section id="methodology" className={styles.methodSection}>
        <div className={styles.methodInner}>
          <span className={styles.eyebrow}>METHODOLOGY · 方法论</span>
          <RevealOnView as="h2" className={styles.sectionH2}>
            我看项目的 4 个维度
          </RevealOnView>
          <div className={styles.methodGrid}>
            <article className={styles.methodCard}>
              <span className={styles.methodNum}>01</span>
              <h3 className={styles.methodH3}>看项目本身</h3>
              <p className={styles.methodBody}>
                不是先看回报率,先看项目本身:位置、产品定位、市场需求、退出路径。
              </p>
              <p className={styles.methodBody}>
                项目本身不成立,所有的财务模型都是幻觉。
              </p>
            </article>

            <article className={styles.methodCard}>
              <span className={styles.methodNum}>02</span>
              <h3 className={styles.methodH3}>看法律结构</h3>
              <p className={styles.methodBody}>法律结构决定了项目能不能成。</p>
              <ul className={styles.methodSubList}>
                <li>LLC</li>
                <li>Escrow</li>
                <li>同股同权</li>
                <li>后端激励</li>
              </ul>
              <p className={styles.methodBody}>
                不是技术问题,是利益对齐问题。
              </p>
            </article>

            <article className={styles.methodCard}>
              <span className={styles.methodNum}>03</span>
              <h3 className={styles.methodH3}>看合作开发商</h3>
              <p className={styles.methodBody}>合作开发商比项目更重要。</p>
              <p className={styles.methodBody}>
                一个好开发商可以救活一个普通项目,一个差开发商可以毁掉一个明星项目。
              </p>
            </article>

            <article className={styles.methodCard}>
              <span className={styles.methodNum}>04</span>
              <h3 className={styles.methodH3}>审批路径优于建成价格</h3>
              <p className={styles.methodBody}>
                不是看建成后值多少钱,而是看从今天到建成这条路能不能走通。
              </p>
              <p className={styles.methodBody}>
                ED1 项目就是典型 —— 不是因为价格低,而是因为审批通道快。
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* F05 — 三层视角(对齐 SAREC 三层架构) */}
      <section className={styles.viewsSection}>
        <div className={styles.viewsInner}>
          <span className={styles.eyebrow}>MY VIEW · 我看美国房地产</span>
          <RevealOnView as="h2" className={styles.sectionH2}>
            三层视角
          </RevealOnView>
          <ol className={styles.viewsList}>
            <li className={styles.viewsItem}>
              <span className={styles.viewsTier}>第一层 · 商会层(基础)</span>
              <p className={styles.viewsBody}>
                美国房地产对中国背景的客户来说,最大的障碍不是信息,而是规则的差异、操作的复杂度、风险的不可见。
              </p>
              <p className={styles.viewsBody}>
                SAREC 商会层(研究、培训、活动、考察)帮客户先把&quot;规则、生态、机会和风险&quot;看清楚。
              </p>
            </li>
            <li className={styles.viewsItem}>
              <span className={styles.viewsTier}>第二层 · 咨询层(关键)</span>
              <p className={styles.viewsBody}>看清楚之后,进入具体项目阶段。</p>
              <p className={styles.viewsBody}>
                这一层最大的问题是 —— 许多服务方做一次性服务赚佣金,但不对项目结果负责。
              </p>
              <p className={styles.viewsBody}>
                SAREC 咨询层 —— 做的是用投资人视角持续把控项目,不是介绍完就消失。
              </p>
            </li>
            <li className={styles.viewsItem}>
              <span className={styles.viewsTier}>第三层 · 合作结构设计(深度)</span>
              <p className={styles.viewsBody}>
                当客户和 SAREC 建立长期信任,当某个项目同时符合双方的判断标准 —— 围绕合作结构与风险共担机制推进协作。
              </p>
              <p className={styles.viewsBody}>
                不是为了证明&quot;我们也敢投&quot;,而是真正做到利益一致、风险共担。
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* F06 — 研究文章预告(Placeholder,等 H08 上线后填充) */}
      <section className={styles.researchTeaserSection}>
        <div className={styles.researchTeaserInner}>
          <span className={styles.eyebrow}>RESEARCH · 研究文章</span>
          <RevealOnView as="h2" className={styles.sectionH2}>
            Andy 的研究方向
          </RevealOnView>
          <p className={styles.researchTeaserBody}>
            研究文章模块上线后,此处将展示 Andy 的研究方向与最新内容。
          </p>
          <Link href="/zh/research" className={styles.researchTeaserCta}>
            前往研究专栏 →
          </Link>
        </div>
      </section>

      {/* F07 — Conversion(Andy 1v1 CTA Banner) */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <span className={styles.eyebrow}>TALK WITH ANDY · 与 Andy 对话</span>
          <RevealOnView as="h2" className={styles.ctaH2}>
            想直接和 Andy 聊?
          </RevealOnView>
          <p className={styles.ctaSubtitle}>
            不论你是想了解 SAREC、看具体项目,
            <br />
            还是只想和一个有 28 年地产经验的人聊一聊 ——
            <br />
            可以预约一次 30 分钟的对话。
          </p>
          <div className={styles.ctaRow}>
            <Link href="/zh/contact" className={styles.ctaPrimary}>
              预约与 Andy 对话
            </Link>
            <Link href="/zh/research" className={styles.ctaSecondary}>
              阅读研究文章
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
