'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import styles from './H06ProjectsFeatured.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

type ProjectType = {
  code: string;
  title: string;
  description: string;
  role: string;
};

const PROJECT_TYPES: ProjectType[] = [
  {
    code: '01',
    title: '经济适用房开发（ED1）',
    description: '快速审批、政策窗口、可负担住房需求下的项目机会',
    role: '政策结构判断 · 项目合作 · 投资人沟通'
  },
  {
    code: '02',
    title: '精品公寓项目',
    description: '洛杉矶核心地段中型住宅开发',
    role: '项目筛选 · 资本对接 · 结构设计'
  },
  {
    code: '03',
    title: '跨境股权合作项目',
    description: '中美投资人共同参与的项目股权结构',
    role: '法律结构设计 · 合规咨询 · 风险评估'
  }
];

/* ===== Variants ===== */
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

const leftListContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } }
};

const projectVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE }
  }
};

const featuredCardVariants: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 1.0, ease: EASE }
  }
};

const imageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.8, delay: 0.4, ease: EASE }
  }
};

export function H06ProjectsFeatured() {
  return (
    <section id="h06-projects-featured" className={styles.section}>
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
            PROJECTS · 项目类型
          </motion.span>
          <motion.h2 className={styles.h2} variants={headerItem}>
            SAREC 参与的项目
          </motion.h2>
          <motion.p className={styles.lead} variants={headerItem}>
            三类项目经验 + 一个已公开的代表性案例。
          </motion.p>
        </motion.div>

        {/* Split */}
        <div className={styles.split}>
          {/* Left: project type list */}
          <motion.div
            className={styles.leftCol}
            variants={leftListContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            {PROJECT_TYPES.map((type) => (
              <motion.article
                key={type.code}
                className={styles.projectType}
                variants={projectVariants}
              >
                <h3 className={styles.projectTypeTitle}>
                  <span className={styles.projectTypeNumber}>{type.code} /</span>
                  <span className={styles.projectTypeName}>{type.title}</span>
                </h3>
                <p className={styles.projectTypeDescription}>{type.description}</p>
                <p className={styles.projectTypeRole}>
                  <span className={styles.roleLabel}>SAREC 角色：</span>
                  {type.role}
                </p>
              </motion.article>
            ))}
          </motion.div>

          {/* Right: featured project (sticky) */}
          <div className={styles.rightCol}>
            <motion.article
              className={styles.featuredCard}
              variants={featuredCardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
            >
              <span className={styles.featuredLabel}>
                FEATURED PROJECT · 代表性项目
              </span>
              <h3 className={styles.featuredTitle}>4136 Rosewood Ave</h3>
              <p className={styles.featuredSubtitle}>
                East Hollywood, Los Angeles
                <span className={styles.featuredSep}>·</span>
                ED1 经济适用房
              </p>

              <motion.div
                className={styles.imageWrap}
                variants={imageVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15 }}
              >
                <Image
                  src="/images/projects/4136-rosewood-rendering.png"
                  alt="4136 Rosewood Ave 项目效果图"
                  width={1536}
                  height={1024}
                  className={styles.image}
                />
              </motion.div>

              <div className={styles.stats}>
                <div className={styles.statCell}>
                  <span className={styles.statValue}>[69]</span>
                  <span className={styles.statLabel}>Units</span>
                </div>
                <div className={styles.statCell}>
                  <span className={styles.statValue}>[6]</span>
                  <span className={styles.statLabel}>Floors</span>
                </div>
                <div className={styles.statCell}>
                  <span className={styles.statValue}>[ED1]</span>
                  <span className={styles.statLabel}>Affordable Housing</span>
                </div>
              </div>

              <div className={styles.description}>
                <p className={styles.featuredRole}>
                  <span className={styles.roleLabel}>SAREC 角色：</span>
                  项目合作 · 投资人沟通
                </p>
                <p className={styles.descriptionText}>
                  与本地有 15 年美国经验的合作开发商共同推进。
                </p>
                <p className={styles.descriptionText}>
                  所有项目采用 LLC 项目公司结构、Escrow 托管资金、利益一致风险共担的合作结构。
                </p>
              </div>

              <Link href="/zh/case-studies/4136-rosewood" className={styles.cta}>
                <span>查看完整案例</span>
                <span className={styles.ctaArrow} aria-hidden="true">
                  →
                </span>
              </Link>
            </motion.article>
          </div>
        </div>
      </div>
    </section>
  );
}
