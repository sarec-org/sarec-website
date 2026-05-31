import type { Metadata } from 'next';
import styles from './sarec-v4.module.css';

/**
 * SAREC V4 设计预览 v2 — /zh/design-preview/sarec-v4
 * 大幅真实摄影 + 奢侈留白 + 超大衬线标题 · 参考 Hines / Tishman Speyer
 * ⚠ noindex/nofollow · 不进 sitemap · 不进 research 索引 · 不链接正式页
 * ⚠ 标题/副标题/CTA 全为占位,正式对齐 SAREC copy-deck
 * ⚠ token 锁 .v4 容器,不碰任何正式页面 / globals.css
 * 图片:Unsplash 免费可商用,已逐个 curl 验证 200 image/jpeg。
 */
export const metadata: Metadata = {
  title: 'SAREC V4 设计预览 v2(内部 · 勿索引)',
  robots: { index: false, follow: false, nocache: true }
};

const PH = '占位文案,正式对齐 SAREC copy-deck';
const IMG = '?w=1600&q=80&auto=format&fit=crop';
const PHOTO = {
  laSkyline: `https://images.unsplash.com/photo-1544413660-299165566b1d${IMG}`,
  facade:    `https://images.unsplash.com/photo-1614595737476-42487331b8a1${IMG}`,
  cityNight: `https://images.unsplash.com/photo-1531819177115-428566ccfb50${IMG}`,
  steel:     `https://images.unsplash.com/photo-1508450859948-4e04fabaa4ea${IMG}`
};

export default function SarecV4PreviewPage() {
  return (
    <div className={styles.harness}>
      <div className={styles.harnessHead}>
        <h1 className={styles.harnessTitle}>SAREC V4 设计预览 v2 · 大幅摄影 + 奢侈留白</h1>
        <p className={styles.harnessSub}>固定亮底 + 深色资产区块 + 克制暗金 · 参考 Hines / Tishman Speyer · 图为 Unsplash 可商用占位</p>
      </div>
      <div className={styles.banner}>
        <strong>内部预览 · noindex</strong> —— 标题/副标题/CTA 均为 <strong>占位文案</strong>,正式以 SAREC copy-deck 为准。
        图片为 Unsplash 免费可商用占位,正式上线替换为 SAREC 自有/授权摄影。本页不进 sitemap、不进 research 索引、不改正式页。
      </div>

      <div className={styles.frames}>

        {/* ① 首页 Hero — 全幅 LA 天际线 + 标题压图 */}
        <div className={styles.frameWrap}>
          <p className={styles.frameLabel}>① 首页 Hero</p>
          <div className={styles.phone}>
            <div className={styles.v4}>
              <div className={styles.screen}>
                <div className={styles.heroFull}>
                  <img className={styles.img} src={PHOTO.laSkyline} alt="洛杉矶天际线(占位摄影)" loading="lazy" />
                  <div className={styles.scrim} />
                  <div className={styles.onPhoto}>
                    <span className={styles.eyebrow}>SINO-AMERICAN REAL ESTATE CHAMBER</span>
                    <p className={styles.displayEn}>Judgment &amp; Execution</p>
                    <h2 className={styles.display}>跨境地产<br />判断与落地</h2>
                  </div>
                </div>
                <section className={`${styles.section} ${styles.sectionTight}`}>
                  <p className={styles.lead}>
                    在美国房地产开发中,认知比资本更重要。我们提供项目判断、结构设计与风险控制。
                  </p>
                  <div className={styles.ctaRow}>
                    <button className={styles.btnPrimary}>预约咨询</button>
                    <button className={styles.btnGhost}>了解服务体系</button>
                  </div>
                  <span className={styles.ph}>{PH}</span>
                </section>
              </div>
            </div>
          </div>
        </div>

        {/* ② About Hero — 亮底超大标题 + 大幅建筑立面 */}
        <div className={styles.frameWrap}>
          <p className={styles.frameLabel}>② About Hero</p>
          <div className={styles.phone}>
            <div className={styles.v4}>
              <div className={styles.screen}>
                <section className={styles.section}>
                  <span className={styles.eyebrow}>ABOUT · 关于 SAREC</span>
                  <p className={styles.displayEn}>A Cross-Border Platform</p>
                  <h2 className={styles.display}>一个跨境<br />地产平台</h2>
                  <div className={styles.goldRule} />
                  <p className={styles.lead}>
                    连接中美两端的资本、项目与专业资源,用机构级标准推进每一次跨境合作。
                  </p>
                  <p className={styles.body}>
                    我们不替代律师、会计与持牌专业人士,而是围绕项目判断、结构设计与风险控制,让合作更稳健地成立与推进。
                  </p>
                  <figure className={styles.figure}>
                    <img className={styles.img} src={PHOTO.facade} alt="现代建筑立面(占位摄影)" loading="lazy" />
                  </figure>
                  <p className={styles.figCaption}>ARCHITECTURE / 占位摄影 · Unsplash</p>
                  <span className={styles.ph}>{PH}</span>
                </section>
              </div>
            </div>
          </div>
        </div>

        {/* ③ Membership Hero — 城市夜景压深块 + tier 卡 */}
        <div className={styles.frameWrap}>
          <p className={styles.frameLabel}>③ Membership Hero(深色区块)</p>
          <div className={styles.phone}>
            <div className={styles.v4}>
              <div className={styles.screen}>
                <div className={styles.heroFull}>
                  <img className={styles.img} src={PHOTO.cityNight} alt="城市夜景(占位摄影)" loading="lazy" />
                  <div className={styles.scrim} />
                  <div className={styles.onPhoto}>
                    <span className={styles.eyebrow}>MEMBERSHIP · 会员</span>
                    <h2 className={styles.display}>跨境资本<br />的同行者</h2>
                  </div>
                </div>
                <section className={`${styles.section} ${styles.sectionDark} ${styles.sectionTight}`}>
                  <p className={styles.lead}>
                    面向想在美国做地产开发的中国资本,提供持续的判断、资源与协作支持。
                  </p>
                  <div className={styles.stats}>
                    <div className={styles.stat}><div className={styles.statNum}>28<span style={{ fontSize: '1rem' }}> 年</span></div><span className={styles.statLabel}>中美实战</span></div>
                    <div className={styles.stat}><div className={styles.statNum}>200<span style={{ fontSize: '1rem' }}> 万 ft²</span></div><span className={styles.statLabel}>开发面积</span></div>
                    <div className={styles.stat}><div className={styles.statNum}>6<span style={{ fontSize: '1rem' }}> 轮</span></div><span className={styles.statLabel}>完整周期</span></div>
                  </div>
                  <div className={styles.tierCard}>
                    <span className={styles.eyebrow}>核心会员</span>
                    <div className={styles.priceGold}>$ —— / 年</div>
                    <p className={styles.lead} style={{ marginBottom: 0 }}>
                      项目判断 · 结构设计 · 资源协同 · 闭门研究
                    </p>
                  </div>
                  <div className={styles.ctaRow}>
                    <button className={styles.btnPrimary}>申请加入</button>
                    <button className={styles.btnGhost}>查看权益</button>
                  </div>
                  <span className={styles.ph} style={{ color: 'var(--v4-on-dark-mute)' }}>{PH}</span>
                </section>
              </div>
            </div>
          </div>
        </div>

        {/* ④ Research Article Hero + 30 秒摘要 — 钢结构大图 */}
        <div className={styles.frameWrap}>
          <p className={styles.frameLabel}>④ Research Article Hero + 30 秒摘要</p>
          <div className={styles.phone}>
            <div className={styles.v4}>
              <div className={styles.screen}>
                <section className={styles.section}>
                  <span className={styles.eyebrow}>RESEARCH · 跨境地产</span>
                  <p className={styles.displayEn}>Field Notes</p>
                  <h2 className={styles.display}>中国资本在美<br />开发的门槛</h2>
                  <div className={styles.articleMeta}>
                    <span>作者 · 东哥(占位)</span>
                    <span className={styles.metaDot} />
                    <span>发布 2026-XX-XX</span>
                  </div>
                  <p className={styles.lead}>
                    从资金结构到审批周期,拆解每一处真实成本与可执行的避坑要点。
                  </p>
                  <figure className={styles.figure}>
                    <img className={styles.img} src={PHOTO.steel} alt="钢结构工地(占位摄影)" loading="lazy" />
                  </figure>
                  <p className={styles.figCaption}>EVIDENCE / DEVELOPMENT CONTEXT · 占位摄影</p>

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
                  <span className={styles.ph}>{PH}</span>
                </section>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ---- token 速览 ---- */}
      <div className={styles.legend}>
        <p className={styles.legendH}>颜色 token</p>
        <div className={styles.swatchRow}>
          <span className={styles.sw}><span className={styles.swBox} style={{ background: '#F7F6F2' }} />base #F7F6F2</span>
          <span className={styles.sw}><span className={styles.swBox} style={{ background: '#FFFFFF' }} />surface #FFFFFF</span>
          <span className={styles.sw}><span className={styles.swBox} style={{ background: '#F0EFEB' }} />surface-2 #F0EFEB</span>
          <span className={styles.sw}><span className={styles.swBox} style={{ background: '#1B2A33' }} />ink #1B2A33</span>
          <span className={styles.sw}><span className={styles.swBox} style={{ background: '#101820' }} />dark #101820</span>
          <span className={styles.sw}><span className={styles.swBox} style={{ background: '#15232B' }} />dark-2 #15232B</span>
          <span className={styles.sw}><span className={styles.swBox} style={{ background: '#9C7A3C' }} />gold-line #9C7A3C</span>
          <span className={styles.sw}><span className={styles.swBox} style={{ background: '#B18A45' }} />gold-solid #B18A45</span>
        </div>
        <p className={styles.legendH}>mobile typography scale</p>
        <p className={styles.legendP}>
          display clamp 40→52 / display-en(Cormorant Garamond)28→40 / h1 30→40 / h2 22→28 / lead 17 / body 16 / eyebrow 11(px)
          · 中文 Noto Serif SC 700 + 字距 .04em · 英文 Cormorant Garamond italic(Georgia 兜底)· word-break:keep-all
        </p>
        <p className={styles.legendH}>spacing scale</p>
        <p className={styles.legendP}>
          8 · 12 · 16 · 24 · 32 · 48 · 64 (px) · gutter 24 · section clamp 88→120(奢侈留白)
        </p>
        <p className={styles.legendH}>图(已 curl 验证 200 · filter: saturate(.92) contrast(1.04))</p>
        <p className={styles.legendP}>
          ① LA 天际线 photo-1544413660 · ② 现代立面 photo-1614595737476 · ③ 城市夜景 photo-1531819177115 · ④ 钢结构 photo-1508450859948
        </p>
      </div>
    </div>
  );
}
