'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { SaImage } from '@/components/shared/SaImage';
import styles from './S05CoInvest.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

type Mechanism = {
  code: string;
  title: string;
  body: string[];
  compliance: string;
};

const MECHANISMS: Mechanism[] = [
  {
    code: '01',
    title: 'LLC 项目公司',
    body: [
      '每个项目设立独立的 LLC 项目公司。',
      '资金通过 Escrow 进项目 LLC 账户，',
      '不进 SAREC 账户。'
    ],
    compliance:
      '账户安排、资金路径、汇报机制和法律文件以项目协议为准。'
  },
  {
    code: '02',
    title: '同股同权',
    body: [
      '在符合 SAREC 参与标准的项目合作场景下，',
      '团队可与客户共同出资。',
      '优先采用利益一致、风险共担的合作结构。'
    ],
    compliance: '具体股权、决策权和退出安排，以项目协议为准。'
  },
  {
    code: '03',
    title: '后端激励',
    body: [
      'SAREC 优先采用利益一致、风险共担、后端激励的合作结构。',
      '项目卖出后才有 Carry。项目赚，我们才赚。'
    ],
    compliance: '具体合作条款以项目阶段和服务边界为准。'
  },
  {
    code: '04',
    title: '项目监督',
    body: [
      '项目期间提供月度汇报、季度评估和重大事项通报。',
      '所有客户使用同一汇报模板。'
    ],
    compliance: '具体汇报频率、形式和内容，以项目协议为准。'
  }
];

const PROJECT_TYPES = [
  '经济适用房开发（ED1）',
  '精品公寓项目',
  '跨境股权合作项目'
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

const listContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE }
  }
};

export function S05CoInvest() {
  return (
    <section id="co-invest" className={styles.section}>
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
            LAYER 03 · CO-INVEST
          </motion.span>
          <motion.h2 className={styles.h2} variants={headerItem}>
            合作结构
          </motion.h2>
          <motion.p className={styles.tagline} variants={headerItem}>
            不直接作为施工开发主体，也不设资金池。
          </motion.p>
        </motion.div>

        {/* 4 mechanisms with compliance */}
        <motion.ul
          className={styles.mechanisms}
          variants={listContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.08 }}
        >
          {MECHANISMS.map((mech) => (
            <motion.li
              key={mech.code}
              className={styles.mechanismItem}
              variants={itemVariants}
            >
              <div className={styles.mechanismHeader}>
                <span className={styles.mechanismNumber}>{mech.code} /</span>
                <h3 className={styles.mechanismTitle}>{mech.title}</h3>
              </div>
              <div className={styles.mechanismBody}>
                {mech.body.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
              <p className={styles.compliance}>
                <span className={styles.complianceLabel}>[合规边界]</span>
                {mech.compliance}
              </p>
            </motion.li>
          ))}
        </motion.ul>

        {/* Project types row — left: existing typesBlock (text), right: ED1 image */}
        <div className={styles.typesRow}>
          <motion.div
            className={styles.typesBlock}
            variants={headerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.span className={styles.subEyebrow} variants={headerItem}>
              PROJECT EXPERIENCE · 项目类型经验
            </motion.span>
            <motion.h3 className={styles.subH3} variants={headerItem}>
              3 类项目经验
            </motion.h3>

            <motion.ul className={styles.typesList} variants={listContainer}>
              {PROJECT_TYPES.map((type) => (
                <motion.li
                  key={type}
                  className={styles.typeItem}
                  variants={itemVariants}
                >
                  <span className={styles.typeBullet} aria-hidden="true">
                    ·
                  </span>
                  <span>{type}</span>
                </motion.li>
              ))}
            </motion.ul>

            <motion.div
              className={styles.typesClosing}
              variants={itemVariants}
            >
              <p>具体项目名称、地址、规模与投资材料 ——</p>
              <p>仅在合格沟通后提供。</p>
            </motion.div>
          </motion.div>

          <figure className={styles.typesPrefix}>
            <p className={styles.typesPrefixLabel}>项目类型 · ED1 案例</p>
            <div className={styles.typesPrefixFrame}>
              <SaImage
                src="/images/projects/2215-wellesley-ed1.webp"
                alt="2215 Wellesley ED1 项目外观渲染"
                fill
                sizes="(max-width: 1023px) 100vw, 540px"
                filterIntensity="none"
              />
            </div>
            <figcaption className={styles.typesPrefixCaption}>
              2215 Wellesley · ED1 单体住宅
            </figcaption>
          </figure>
        </div>

        {/* Inline CTA */}
        <motion.div
          className={styles.ctaWrap}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <Link href="/zh/case-studies" className={styles.cta}>
            <span>查看项目案例</span>
            <span className={styles.ctaArrow} aria-hidden="true">
              →
            </span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
