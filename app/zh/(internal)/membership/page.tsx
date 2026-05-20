import type { Metadata } from 'next';
import Link from 'next/link';
import { SaImage } from '@/components/shared/SaImage';
import { createPageMetadata } from '@/lib/seo';
import styles from './membership.module.css';

export const metadata: Metadata = createPageMetadata({
  title: '会员服务｜SAREC 中美房地产商会',
  description:
    'SAREC 会员是商会层服务的入口。通过会员,系统接触美国房地产研究、培训、活动、考察和专业服务伙伴网络,逐步进入更深层的咨询、撮合与项目合作。',
  path: '/zh/membership'
});

export default function MembershipPage() {
  return (
    <main>
      {/* M01 Hero — Editorial Split 文字版变体(无图无视频,简洁机构感 + 双圆嵌套商会 SVG 印章)*/}
      <section className={styles.heroSection}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>MEMBERSHIP · 会员</span>
          <h1 className={styles.heroH1}>
            <span className={styles.heroRevealLine}>加入 SAREC 会员</span>
          </h1>
          <p className={styles.heroLead}>
            SAREC 会员是商会层服务的入口。通过会员,你可以系统接触美国房地产研究、培训、活动、考察和专业服务伙伴网络,并逐步进入更深层的咨询、撮合与项目合作。
          </p>
          <div className={styles.ctaGroup}>
            <Link href="/zh/contact" className={styles.ctaPrimary}>
              申请加入会员
            </Link>
            <Link href="#benefits" className={styles.ctaSecondary}>
              查看会员权益
            </Link>
          </div>
        </div>

        <div className={styles.heroSealWrap} aria-hidden="true">
          <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <path id="sealTopArc" d="M 60 200 A 140 140 0 0 1 340 200" fill="none" />
              <path id="sealBottomArc" d="M 340 200 A 140 140 0 0 1 60 200" fill="none" />
            </defs>

            {/* 双圆嵌套 */}
            <circle
              cx="200"
              cy="200"
              r="195"
              fill="none"
              style={{ stroke: 'var(--gold)' }}
              strokeWidth="1.5"
            />
            <circle
              cx="200"
              cy="200"
              r="160"
              fill="none"
              style={{ stroke: 'var(--gold)' }}
              strokeWidth="1"
            />

            {/* 外圈拉丁文(沿圆周)*/}
            <text style={{ fill: 'var(--gold)', fontFamily: 'var(--mono)', letterSpacing: '0.4em' }} fontSize="13">
              <textPath href="#sealTopArc" startOffset="50%" textAnchor="middle">
                SINO-AMERICAN REAL ESTATE CHAMBER
              </textPath>
            </text>
            <text style={{ fill: 'var(--gold)', fontFamily: 'var(--mono)', letterSpacing: '0.4em' }} fontSize="13">
              <textPath href="#sealBottomArc" startOffset="50%" textAnchor="middle">
                EST · LOS ANGELES
              </textPath>
            </text>

            {/* 中线分隔 */}
            <line
              x1="80"
              y1="200"
              x2="320"
              y2="200"
              style={{ stroke: 'var(--gold-dim)' }}
              strokeWidth="0.5"
            />

            {/* 中心 SAREC 标识 */}
            <text
              x="200"
              y="195"
              style={{ fill: 'var(--gold)', fontFamily: 'var(--serif-zh)', letterSpacing: '0.1em' }}
              fontSize="48"
              fontWeight="600"
              textAnchor="middle"
              dominantBaseline="alphabetic"
            >
              SAREC
            </text>

            {/* 中线下方:CORPORATE SEAL(替换原 EST · 2024)*/}
            <text
              x="200"
              y="225"
              style={{ fill: 'var(--gold-dim)', fontFamily: 'var(--mono)', letterSpacing: '0.3em' }}
              fontSize="11"
              textAnchor="middle"
            >
              CORPORATE SEAL
            </text>
          </svg>
        </div>
      </section>

      {/* Membership Manifesto — Masked Text Marquee(字内嵌建筑图,horizontal marquee 无限循环) */}
      <section
        className={styles.membershipManifestoSection}
        aria-label="SAREC Membership · 长期入口 · 跨境资本 · 专业服务 · 美国房地产"
      >
        <div className={styles.maskedMarqueeViewport}>
          <div className={styles.maskedMarqueeTrack} aria-hidden="true">
            <span className={styles.maskedMarqueeText}>
              SAREC MEMBERSHIP · 长期入口 · 跨境资本 · 专业服务 · 美国房地产 ·
            </span>
            <span className={styles.maskedMarqueeText}>
              SAREC MEMBERSHIP · 长期入口 · 跨境资本 · 专业服务 · 美国房地产 ·
            </span>
            <span className={styles.maskedMarqueeText}>
              SAREC MEMBERSHIP · 长期入口 · 跨境资本 · 专业服务 · 美国房地产 ·
            </span>
          </div>
        </div>
      </section>

      {/* M02 — Editorial Split §5.2:为什么加入 + advisory video */}
      <section className={styles.whyJoinSection} id="benefits">
        <div className={styles.whyJoinGrid}>
          <div className={styles.whyJoinMedia}>
            <video
              src={`${process.env.NEXT_PUBLIC_MEDIA_BASE ?? ''}/videos/advisory-presentation.mp4`}
              autoPlay
              muted
              loop
              playsInline
              className={styles.whyJoinVideo}
            />
          </div>
          <div className={styles.whyJoinText}>
            <span className={styles.eyebrow}>WHY JOIN · 为什么加入</span>
            <h2 className={styles.sectionH2}>为什么加入 SAREC 会员</h2>
            <p className={styles.sectionLead}>
              SAREC 会员不只是访问内容的权限。它是连接美国房地产投资、跨境资本合作和专业服务伙伴网络的长期入口。
            </p>
            <ol className={styles.whyJoinList}>
              <li>
                <span className={styles.whyJoinNum}>01</span>
                <div>
                  <h3 className={styles.whyJoinH3}>系统化研究内容</h3>
                  <p className={styles.whyJoinBody}>
                    定期发布美国房地产研究内容,关注政策动向、市场结构、项目机会和风险清单。
                  </p>
                  <ul className={styles.whyJoinSubList}>
                    <li>研究内容优先访问</li>
                    <li>市场观察简报</li>
                    <li>专题报告与活动资料</li>
                  </ul>
                </div>
              </li>
              <li>
                <span className={styles.whyJoinNum}>02</span>
                <div>
                  <h3 className={styles.whyJoinH3}>高含金量培训与活动</h3>
                  <p className={styles.whyJoinBody}>
                    不做泛泛而谈的基础培训。围绕真实项目、市场判断、风险识别和资源对接 —— 包括项目研讨、闭门分享、行业展会。
                  </p>
                  <p className={styles.whyJoinBody}>
                    详见 →{' '}
                    <Link href="/zh/events" className={styles.inlineLink}>
                      活动与考察
                    </Link>
                  </p>
                </div>
              </li>
              <li>
                <span className={styles.whyJoinNum}>03</span>
                <div>
                  <h3 className={styles.whyJoinH3}>美国实地考察</h3>
                  <p className={styles.whyJoinBody}>
                    SAREC 将根据项目进度和会员需求,组织美国实地考察、项目走访和专题交流。会员可优先参加考察活动,直接接触本地华人开发商、专业服务伙伴和真实项目现场。
                  </p>
                </div>
              </li>
              <li>
                <span className={styles.whyJoinNum}>04</span>
                <div>
                  <h3 className={styles.whyJoinH3}>专业服务伙伴对接</h3>
                  <p className={styles.whyJoinBody}>
                    SAREC 与非竞争性专业服务伙伴建立资源互荐机制。
                  </p>
                  <ul className={styles.whyJoinSubList}>
                    <li>地产服务(律师、会计师、贷款经纪)</li>
                    <li>法律 / 税务 / 移民 / 财富管理</li>
                    <li>跨境合规 / 公司架构</li>
                  </ul>
                  <p className={styles.whyJoinBody}>
                    会员可获得专业服务伙伴的优先对接。
                  </p>
                  <p className={styles.complianceNote}>
                    具体合作方式以单独协议为准。
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* M03 — Proof Grid 3 卡 §5.3 变体:三档会员,中间金边强调 */}
      <section className={styles.tiersSection}>
        <div className={styles.tiersInner}>
          <span className={styles.eyebrow}>MEMBERSHIP LEVELS · 会员级别</span>
          <h2 className={styles.sectionH2}>三档会员</h2>
          <p className={styles.sectionLead}>
            SAREC 会员目前设有三个级别,对应不同的参与深度和合作意向。
          </p>
          <div className={styles.tiersGrid}>
            <article className={styles.tierCard}>
              <h3 className={styles.tierTitle}>理事会员</h3>
              <p className={styles.tierEn}>Council Member</p>
              <p className={styles.tierFit}>
                适合:希望系统了解美国房地产投资和跨境合作的人
              </p>
              <p className={styles.tierIncludes}>权益包括:</p>
              <ul className={styles.tierList}>
                <li>研究内容优先访问</li>
                <li>市场观察简报</li>
                <li>参加公开活动与培训</li>
                <li>美国实地考察报名资格(需符合资格审核)</li>
              </ul>
              <Link href="/zh/contact" className={styles.tierCta}>
                申请理事会员 →
              </Link>
            </article>
            <article className={`${styles.tierCard} ${styles.tierCardFeatured}`}>
              <h3 className={styles.tierTitle}>常务理事</h3>
              <p className={styles.tierEn}>Executive Council Member</p>
              <p className={styles.tierFit}>
                适合:已有具体项目方向或投资意向,希望深度参与的人
              </p>
              <p className={styles.tierIncludes}>
                权益包括理事会员全部内容,并额外包括:
              </p>
              <ul className={styles.tierList}>
                <li>专题报告与闭门分享</li>
                <li>项目研讨与圆桌讨论</li>
                <li>美国实地考察优先权</li>
                <li>专业服务伙伴优先对接</li>
                <li>与 SAREC 团队定期沟通</li>
              </ul>
              <Link href="/zh/contact" className={styles.tierCta}>
                申请常务理事 →
              </Link>
            </article>
            <article className={styles.tierCard}>
              <h3 className={styles.tierTitle}>副会长单位</h3>
              <p className={styles.tierEn}>Vice President Member</p>
              <p className={styles.tierFit}>
                适合:在房地产、金融、专业服务领域有长期合作意向的机构或个人
              </p>
              <p className={styles.tierBody}>权益按单独协议约定。</p>
              <Link href="/zh/contact" className={styles.tierCta}>
                申请副会长单位 →
              </Link>
            </article>
          </div>
          <p className={styles.tiersNote}>
            具体会员费、合作方式和入会资格审核标准,在初次沟通后提供。
          </p>
        </div>
      </section>

      {/* M04 — Editorial Split 反向 §5.2:会员的核心价值 + 项目图 */}
      <section className={styles.valuesSection}>
        <div className={styles.valuesGrid}>
          <div className={styles.valuesMedia}>
            <div className={styles.valuesImageBox}>
              <div className={styles.valuesImageMotion}>
                <SaImage
                  src="/images/la/la-skyline-marquee.jpg"
                  alt="SAREC 项目场景 — Los Angeles downtown"
                  fill
                  sizes="(max-width: 768px) 100vw, 55vw"
                  filterIntensity="none"
                  className={styles.valuesImage}
                />
              </div>
            </div>
          </div>
          <div className={styles.valuesText}>
            <span className={styles.eyebrow}>WHAT YOU GET · 会员权益</span>
            <h2 className={styles.sectionH2}>会员的核心价值</h2>
            <p className={styles.sectionLead}>
              SAREC 会员的核心价值,在于持续接触美国房地产投资和跨境合作的真实场景。
            </p>
            <ol className={styles.valuesList}>
              <li>
                <span className={styles.valuesNum}>01</span>
                <div>
                  <h3 className={styles.valuesH3}>研究内容订阅</h3>
                  <p className={styles.valuesBody}>
                    定期发布的市场观察、政策深度、风险清单和专题研究。
                  </p>
                  <p className={styles.valuesBody}>会员获得优先访问。</p>
                </div>
              </li>
              <li>
                <span className={styles.valuesNum}>02</span>
                <div>
                  <h3 className={styles.valuesH3}>主题培训与项目研讨</h3>
                  <p className={styles.valuesBody}>
                    围绕真实项目和真实判断设计的培训内容。
                  </p>
                  <p className={styles.valuesBody}>
                    包括项目结构、财务建模、风险识别等专题。
                  </p>
                </div>
              </li>
              <li>
                <span className={styles.valuesNum}>03</span>
                <div>
                  <h3 className={styles.valuesH3}>行业展会与论坛</h3>
                  <p className={styles.valuesBody}>跨境地产投资相关的行业活动。</p>
                  <p className={styles.valuesBody}>
                    会员可优先参加,部分活动需要资格审核。
                  </p>
                </div>
              </li>
              <li>
                <span className={styles.valuesNum}>04</span>
                <div>
                  <h3 className={styles.valuesH3}>美国实地考察</h3>
                  <p className={styles.valuesBody}>
                    根据项目进度和会员需求组织。
                  </p>
                  <p className={styles.valuesBody}>
                    包括项目走访、本地开发商面对面、专业服务伙伴见面等。
                  </p>
                </div>
              </li>
              <li>
                <span className={styles.valuesNum}>05</span>
                <div>
                  <h3 className={styles.valuesH3}>闭门分享</h3>
                  <p className={styles.valuesBody}>
                    针对常务理事和副会长单位的小范围分享。
                  </p>
                  <p className={styles.valuesBody}>通常涉及具体项目或敏感话题。</p>
                </div>
              </li>
            </ol>
            <p className={styles.valuesFooter}>
              完整活动安排见 →{' '}
              <Link href="/zh/events" className={styles.inlineLink}>
                活动与考察
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* M05 — 4 步水平时间线:申请流程(VISUAL_SPEC §5.3 横向变体) */}
      <section className={styles.applySection}>
        <div className={styles.applyInner}>
          <span className={styles.eyebrow}>HOW TO APPLY · 如何申请</span>
          <h2 className={styles.sectionH2}>4 步加入 SAREC 会员</h2>

          <ol className={styles.applySteps}>
            <li className={styles.applyStep}>
              <span className={styles.applyNum}>01</span>
              <h3 className={styles.applyH3}>提交申请</h3>
              <p className={styles.applyBody}>填写"申请加入会员"表单。</p>
              <p className={styles.applyBody}>提供你的背景、当前阶段、合作意向。</p>
            </li>
            <li className={styles.applyStep}>
              <span className={styles.applyNum}>02</span>
              <h3 className={styles.applyH3}>初步评估</h3>
              <p className={styles.applyBody}>SAREC 团队在 1 个工作日内回复,</p>
              <p className={styles.applyBody}>评估你的需求与 SAREC 服务的匹配度。</p>
            </li>
            <li className={styles.applyStep}>
              <span className={styles.applyNum}>03</span>
              <h3 className={styles.applyH3}>30 分钟沟通</h3>
              <p className={styles.applyBody}>匹配的申请人将安排 30 分钟视频或电话沟通,</p>
              <p className={styles.applyBody}>进一步了解需求,确认合作意向和会员级别。</p>
            </li>
            <li className={styles.applyStep}>
              <span className={styles.applyNum}>04</span>
              <h3 className={styles.applyH3}>正式入会</h3>
              <p className={styles.applyBody}>确认合作意向后,提供会员费支付方式,</p>
              <p className={styles.applyBody}>完成会员资格生效。</p>
            </li>
          </ol>

          <p className={styles.complianceNote}>
            整个流程通常 3-5 个工作日完成。
          </p>
        </div>
      </section>

      {/* M06 — FAQ 4 题:<details>/<summary> 原生折叠,全部默认折叠 */}
      <section className={styles.faqSection}>
        <div className={styles.faqInner}>
          <span className={styles.eyebrow}>FAQ · 常见问题</span>
          <h2 className={styles.sectionH2}>会员常见问题</h2>

          <div className={styles.faqList}>
            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                <span className={styles.faqQNum}>Q1</span>
                <span className={styles.faqQText}>会员费多少?</span>
                <span className={styles.faqChevron} aria-hidden="true">
                  +
                </span>
              </summary>
              <div className={styles.faqAnswer}>
                <p>不同会员级别会员费不同。</p>
                <p>
                  理事会员 / 常务理事 / 副会长单位各有不同的权益和费用结构。
                </p>
                <p>
                  具体会员费、合作方式和入会资格审核标准,在初次沟通后提供。
                </p>
              </div>
            </details>

            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                <span className={styles.faqQNum}>Q2</span>
                <span className={styles.faqQText}>
                  不加入会员可以参加活动吗?
                </span>
                <span className={styles.faqChevron} aria-hidden="true">
                  +
                </span>
              </summary>
              <div className={styles.faqAnswer}>
                <p>部分公开活动非会员可单次报名(需资格审核)。</p>
                <p>
                  但 SAREC 大部分高含金量活动 —— 包括闭门分享、实地考察、深度研讨 —— 仅向会员开放。
                </p>
              </div>
            </details>

            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                <span className={styles.faqQNum}>Q3</span>
                <span className={styles.faqQText}>
                  会员可以获得具体项目投资机会吗?
                </span>
                <span className={styles.faqChevron} aria-hidden="true">
                  +
                </span>
              </summary>
              <div className={styles.faqAnswer}>
                <p>
                  会员服务属于第一层商会层 —— 研究、培训、活动、考察、资源对接。
                </p>
                <p>
                  具体项目投资属于第二层(咨询撮合)和第三层(共投)服务,需要单独评估匹配度并签署相关文件。
                </p>
                <p>
                  会员是建立信任和了解 SAREC 的入口,不直接等同于项目投资资格。
                </p>
              </div>
            </details>

            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                <span className={styles.faqQNum}>Q4</span>
                <span className={styles.faqQText}>如何取消会员?</span>
                <span className={styles.faqChevron} aria-hidden="true">
                  +
                </span>
              </summary>
              <div className={styles.faqAnswer}>
                <p>会员按年度生效,可在每年到期前选择是否续约。</p>
                <p>如有特殊情况需提前终止,按会员协议约定处理。</p>
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* M07 Conversion Panel — 3 CTA(1 主 + 2 副) */}
      <section className={styles.ctaBannerSection}>
        <div className={styles.ctaBannerInner}>
          <h2 className={styles.ctaBannerH2}>准备好加入 SAREC 会员了吗</h2>
          <p className={styles.ctaBannerLead}>
            不是单纯付费访问内容,而是进入一个长期合作和资源对接的网络。
          </p>
          <div className={styles.ctaBannerGroup}>
            <Link href="/zh/contact" className={styles.ctaPrimary}>
              申请加入会员
            </Link>
            <div className={styles.ctaBannerSecondaryRow}>
              <Link href="/zh/services" className={styles.ctaSecondary}>
                查看完整服务架构
              </Link>
              <Link href="/zh/contact" className={styles.ctaSecondary}>
                预约 30 分钟沟通
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
