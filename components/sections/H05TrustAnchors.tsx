'use client';

import { motion, type Variants } from 'framer-motion';
import styles from './H05TrustAnchors.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

type Anchor = {
  code: string;
  title: string;
  description: string[];
  compliance: string | null;
};

const ANCHORS: Anchor[] = [
  {
    code: '01',
    title: '法律架构',
    description: [
      '三个独立账户：商会账户、咨询账户、项目 LLC 账户。',
      '资金通过 Escrow 进项目公司，不进 SAREC 账户。'
    ],
    compliance:
      '涉及具体项目合作时，账户安排、资金路径、汇报机制和法律文件以项目协议为准。'
  },
  {
    code: '02',
    title: '同股同权',
    description: [
      '在符合 SAREC 参与标准的项目共投场景下，团队可与客户共同出资。',
      '优先采用利益一致、风险共担的合作结构。'
    ],
    compliance: '具体股权、决策权和退出安排，以项目协议为准。'
  },
  {
    code: '03',
    title: '后端激励',
    description: [
      'SAREC 优先采用利益一致、风险共担、后端激励的合作结构。',
      '项目卖出后才有 Carry。项目赚，我们才赚。'
    ],
    compliance: '具体合作条款以项目阶段和服务边界为准。'
  },
  {
    code: '04',
    title: '透明汇报',
    description: [
      '项目期间提供月度汇报、季度评估和重大事项通报。',
      '所有客户使用同一汇报模板。'
    ],
    compliance: '具体汇报频率、形式和内容，以项目协议为准。'
  },
  {
    code: '05',
    title: '长期合作',
    description: [
      'SAREC 的目标不是促成一笔交易，',
      '而是建立可以反复合作 5-10 年的投资人关系。',
      '匹配比数量重要。'
    ],
    compliance: null
  }
];

const headerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } }
};

const headerItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: EASE }
  }
};

const timelineContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } }
};

const anchorVariants: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE }
  }
};

export function H05TrustAnchors() {
  return (
    <section id="h05-trust-anchors" className={styles.section}>
      <div className={styles.container}>
        {/* Header */}
        <motion.div
          className={styles.header}
          variants={headerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.span className={styles.eyebrow} variants={headerItem}>
            HOW WE WORK · 我们如何工作
          </motion.span>

          <motion.h2 className={styles.h2} variants={headerItem}>
            5 件让客户能{' '}
            <span className={styles.accent}>
              托付的事
              <motion.span
                className={styles.accentUnderline}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 1.4, ease: EASE, delay: 0.9 }}
                aria-hidden="true"
              />
            </span>
          </motion.h2>

          <motion.p className={styles.lead} variants={headerItem}>
            不是承诺收益，而是承诺方法。
            <br />
            SAREC 在每个项目中坚持的 5 个核心。
          </motion.p>
        </motion.div>

        {/* Timeline */}
        <motion.div
          className={styles.timeline}
          variants={timelineContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.05 }}
        >
          {ANCHORS.map((anchor, i) => {
            const isLast = i === ANCHORS.length - 1;
            return (
              <motion.article
                key={anchor.code}
                className={`${styles.anchor} ${isLast ? styles.anchorLast : ''}`}
                variants={anchorVariants}
              >
                <div className={styles.anchorLeft}>
                  <motion.span
                    className={styles.dot}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
                    aria-hidden="true"
                  />
                  <span className={styles.dotConnector} aria-hidden="true" />
                </div>
                <div className={styles.anchorRight}>
                  <h3 className={styles.anchorTitle}>
                    <span className={styles.anchorNumber}>{anchor.code} /</span>
                    <span className={styles.anchorTitleText}>{anchor.title}</span>
                  </h3>
                  <div className={styles.anchorDescription}>
                    {anchor.description.map((line, j) => (
                      <p key={j}>{line}</p>
                    ))}
                  </div>
                  {anchor.compliance && (
                    <p className={styles.anchorCompliance}>
                      <span className={styles.complianceLabel}>[合规边界]</span>
                      {anchor.compliance}
                    </p>
                  )}
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
