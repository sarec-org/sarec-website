'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import styles from './S04Advisory.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

type Service = {
  code: string;
  title: string;
  body: string[];
};

const SERVICES: Service[] = [
  {
    code: '01',
    title: '项目尽调',
    body: [
      'SAREC 用投资人视角，对项目进行系统评估：',
      '项目背景 · 市场定位 · 财务模型 · 法律结构 · 退出路径 · 风险清单。'
    ]
  },
  {
    code: '02',
    title: '财务建模',
    body: [
      '不是简单 IRR 计算，',
      '而是带情景测试的完整财务模型：',
      '基准 / 乐观 / 悲观三套预测。'
    ]
  },
  {
    code: '03',
    title: '结构设计',
    body: [
      '设计符合投资人利益的法律结构：',
      'LLC 项目公司 · 同股同权 · Escrow 资金路径 · 后端激励机制。'
    ]
  },
  {
    code: '04',
    title: '撮合介绍',
    body: [
      '在尽调通过、结构设计完成后，',
      '将项目介绍给匹配的投资人或开发商。'
    ]
  }
];

const FIT = [
  '已经在做美国房地产投资，想找专业把控',
  '已经有具体项目想让 SAREC 看一下',
  '需要项目尽调、财务建模、结构设计支持'
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
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE }
  }
};

export function S04Advisory() {
  return (
    <section id="advisory" className={styles.section}>
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
            LAYER 02 · ADVISORY &amp; DEAL COORDINATION
          </motion.span>
          <motion.h2 className={styles.h2} variants={headerItem}>
            咨询撮合
          </motion.h2>
          <motion.p className={styles.tagline} variants={headerItem}>
            撮合只是入口，把控才是核心。
          </motion.p>
        </motion.div>

        {/* 4 services 2x2 */}
        <motion.div
          className={styles.servicesGrid}
          variants={gridContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {SERVICES.map((service) => (
            <motion.article
              key={service.code}
              className={styles.serviceCard}
              variants={itemVariants}
            >
              <div className={styles.serviceHeader}>
                <span className={styles.serviceNumber}>{service.code} /</span>
                <h3 className={styles.serviceTitle}>{service.title}</h3>
              </div>
              <div className={styles.serviceBody}>
                {service.body.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </motion.article>
          ))}
        </motion.div>

        {/* Note */}
        <motion.div
          className={styles.note}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <p>
            <span className={styles.noteLabel}>[note]</span>
            撮合不代表 SAREC 必然作为 GP / 共投方。
          </p>
          <p>具体合作方式以单独协议为准。</p>
        </motion.div>

        {/* 适合谁 */}
        <motion.div
          className={styles.fitBlock}
          variants={headerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.span className={styles.fitEyebrow} variants={headerItem}>
            FIT · 适合谁
          </motion.span>
          <motion.ul className={styles.fitList} variants={gridContainer}>
            {FIT.map((line) => (
              <motion.li
                key={line}
                className={styles.fitItem}
                variants={itemVariants}
              >
                <span className={styles.fitBullet} aria-hidden="true">
                  ·
                </span>
                <span>{line}</span>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Inline CTA */}
        <motion.div
          className={styles.ctaWrap}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <Link href="/zh/contact#project-evaluation" className={styles.cta}>
            <span>项目评估 · 30 分钟</span>
            <span className={styles.ctaArrow} aria-hidden="true">
              →
            </span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
