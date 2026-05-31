import type { Metadata } from 'next';
import styles from './sarec-v5.module.css';
import { Reveal } from './Reveal';

/**
 * SAREC V5 设计预览 — /zh/design-preview/sarec-v5
 * 本地 Artgrid 素材 + 杂志式真实页 + 克制动效。
 * ⚠ noindex/nofollow · 不进 sitemap · 不进 research 索引 · 不链接正式页
 * ⚠ 标题/副标题/CTA 全为占位,正式对齐 SAREC copy-deck
 * ⚠ token 锁 .v5 容器,不碰任何正式页面 / globals.css / 旗舰分支
 * ⚠ 素材取自 public/(部分 public/videos 被 .gitignore 排除,本地可加载;线上媒体后续单独处理)
 */
export const metadata: Metadata = {
  title: 'SAREC V5 设计预览(内部 · 勿索引)',
  robots: { index: false, follow: false, nocache: true }
};

const PH = '占位文案,正式对齐 SAREC copy-deck';

export default function SarecV5PreviewPage() {
  return (
    <div className={styles.harness}>
      <div className={styles.banner}>
        <strong>内部预览 · noindex</strong> —— 标题/副标题/CTA 均为 <strong>占位文案</strong>,正式以 SAREC copy-deck 为准。
        素材取自 <strong>public/ 本地 Artgrid</strong>(视频被 .gitignore 排除,本地可看,线上后续单独处理)。
        本页不进 sitemap、不进 research 索引、不改正式页。
      </div>

      <div className={styles.v5}>
        <div className={styles.device}>

          {/* ① 首页 Hero — 城市视频(克制 muted autoplay loop) */}
          <div className={styles.hero}>
            <video
              className={styles.heroMedia}
              autoPlay
              muted
              loop
              playsInline
              poster="/images/home/los-angeles-hero.jpg"
            >
              <source src="/videos/la-hero-main.mp4" type="video/mp4" />
            </video>
            <div className={styles.scrim} />
            <div className={styles.onMedia}>
              <Reveal delay={0}><span className={styles.eyebrow}>SINO-AMERICAN REAL ESTATE CHAMBER</span></Reveal>
              <Reveal delay={140}><p className={styles.displayEn}>Judgment &amp; Execution</p></Reveal>
              <Reveal delay={280}><h2 className={styles.display}>跨境地产<br />判断与落地</h2></Reveal>
            </div>
          </div>

          {/* ② About */}
          <section className={styles.section}>
            <Reveal>
              <div className={styles.mark}><span className={styles.markNum}>02 — ABOUT</span><span className={styles.markLine} /></div>
              <p className={styles.displayEn}>A Cross-Border Platform</p>
              <h2 className={styles.display}>一个跨境<br />地产平台</h2>
              <div className={styles.goldRule} />
              <p className={styles.lead}>连接中美两端的资本、项目与专业资源,用机构级标准推进每一次跨境合作。</p>
              <p className={styles.body}>
                我们不替代律师、会计与持牌专业人士,而是围绕项目判断、结构设计与风险控制,让合作更稳健地成立与推进。
              </p>
            </Reveal>
            <Reveal delay={120}>
              <figure className={styles.figure}>
                <img className={styles.heroMedia} src="/images/artgrid/la-city-02.jpg" alt="洛杉矶城市(本地素材)" loading="lazy" />
              </figure>
              <p className={styles.figCaption}>LOS ANGELES / ARTGRID · 本地素材</p>
            </Reveal>
            <span className={styles.ph}>{PH}</span>
          </section>

          {/* ③ Membership 深色资产区块 — 天际线大图 + 数据 + 短标题 + CTA */}
          <div>
            <div className={styles.hero}>
              <img className={styles.heroMedia} src="/images/la/la-skyline-marquee.jpg" alt="洛杉矶天际线(本地素材)" loading="lazy" />
              <div className={styles.scrim} />
              <div className={styles.onMedia}>
                <Reveal><span className={styles.eyebrow}>MEMBERSHIP · 会员</span></Reveal>
                <Reveal delay={140}><h2 className={styles.display}>跨境资本<br />的同行者</h2></Reveal>
              </div>
            </div>
            <section className={`${styles.section} ${styles.sectionDark}`}>
              <Reveal>
                <p className={styles.lead}>面向想在美国做地产开发的中国资本,提供持续的判断、资源与协作支持。</p>
                <div className={styles.stats}>
                  <div className={styles.stat}><div className={styles.statNum}>28<span className={styles.statUnit}> 年</span></div><span className={styles.statLabel}>中美实战</span></div>
                  <div className={styles.stat}><div className={styles.statNum}>200<span className={styles.statUnit}> 万 ft²</span></div><span className={styles.statLabel}>开发面积</span></div>
                  <div className={styles.stat}><div className={styles.statNum}>6<span className={styles.statUnit}> 轮</span></div><span className={styles.statLabel}>完整周期</span></div>
                </div>
                <div className={styles.tierLine}>
                  <span className={styles.eyebrow} style={{ margin: 0 }}>核心会员</span>
                  <span className={styles.priceGold}>$ —— / 年</span>
                </div>
                <div className={styles.ctaRow}>
                  <button className={styles.btnPrimary}>申请加入</button>
                  <button className={styles.btnGhost}>查看权益</button>
                </div>
                <span className={styles.ph}>{PH}</span>
              </Reveal>
            </section>
          </div>

          {/* ④ Research Article Hero + 30 秒摘要 */}
          <section className={styles.section}>
            <Reveal>
              <div className={styles.mark}><span className={styles.markNum}>04 — RESEARCH</span><span className={styles.markLine} /></div>
              <p className={styles.displayEn}>Field Notes</p>
              <h2 className={styles.display}>中国资本在美<br />开发的门槛</h2>
              <div className={styles.articleMeta}>
                <span>作者 · 东哥(占位)</span><span className={styles.metaDot} /><span>发布 2026-XX-XX</span>
              </div>
              <p className={styles.lead}>从资金结构到审批周期,拆解每一处真实成本与可执行的避坑要点。</p>
            </Reveal>
            <Reveal delay={120}>
              <figure className={styles.figure}>
                <img className={styles.heroMedia} src="/images/research/research-ed1-asset-break-01-poster.jpg" alt="ED1 开发现场(本地素材)" loading="lazy" />
              </figure>
              <p className={styles.figCaption}>EVIDENCE / DEVELOPMENT CONTEXT · 本地素材</p>
            </Reveal>
            <Reveal delay={120}>
              <div className={styles.tldr}>
                <p className={styles.tldrLabel}>TL;DR · 30 秒摘要</p>
                <h3 className={styles.tldrTitle}>用 30 秒看懂这篇</h3>
                <ul className={styles.tldrList}>
                  <li className={styles.tldrItem}>认知错配是中国资本在美折戟的根因(占位要点)。</li>
                  <li className={styles.tldrItem}>资金结构未落实先动工 = 最常见的死结(占位要点)。</li>
                  <li className={styles.tldrItem}>低估 18–36 个月审批周期拖垮财务模型(占位要点)。</li>
                  <li className={styles.tldrItem}>每条结论配真实公开案例 + 避坑要点(占位要点)。</li>
                </ul>
              </div>
            </Reveal>
            <span className={styles.ph}>{PH}</span>
          </section>

        </div>
      </div>
    </div>
  );
}
