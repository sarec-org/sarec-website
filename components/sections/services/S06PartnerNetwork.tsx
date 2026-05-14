'use client';

import { motion, type Variants } from 'framer-motion';
import styles from './S06PartnerNetwork.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

type Partner = {
  code: string;
  title: string;
  body: string;
};

const PARTNERS: Partner[] = [
  {
    code: '01',
    title: '移民服务',
    body: 'EB-5 / L1 / E2 / 投资移民相关法律服务'
  },
  {
    code: '02',
    title: '法律服务',
    body: '公司法 / 合同法 / 跨境合规 / 税务结构'
  },
  {
    code: '03',
    title: '财富管理',
    body: '家族办公室 / 信托 / 资产配置'
  },
  {
    code: '04',
    title: '税务服务',
    body: '跨境税务 / 公司税 / 个人税'
  },
  {
    code: '05',
    title: '保险服务',
    body: '人寿 / 商业保险 / 跨境保险'
  }
];

const headerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } }
};

const headerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE }
  }
};

const gridContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE }
  }
};

export function S06PartnerNetwork() {
  return (
    <section className={styles.section}>
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
            PARTNER NETWORK · 伙伴网络
          </motion.span>
          <motion.h2 className={styles.h2} variants={headerItem}>
            主叙事之外
          </motion.h2>
          <motion.p className={styles.lead} variants={headerItem}>
            SAREC 主叙事聚焦地产。其他业务由专业服务伙伴分工提供。
          </motion.p>
        </motion.div>

        {/* 5 partner categories */}
        <motion.div
          className={styles.partnersGrid}
          variants={gridContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {PARTNERS.map((partner) => (
            <motion.article
              key={partner.code}
              className={styles.partnerCard}
              variants={cardVariants}
            >
              <span className={styles.partnerCode}>{partner.code} /</span>
              <h3 className={styles.partnerTitle}>{partner.title}</h3>
              <p className={styles.partnerBody}>{partner.body}</p>
            </motion.article>
          ))}
        </motion.div>

        {/* Note */}
        <motion.p
          className={styles.note}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <span className={styles.noteLabel}>[note]</span>
          具体合作方式以单独协议为准。如需推荐，请联系 SAREC。
        </motion.p>
      </div>
    </section>
  );
}
