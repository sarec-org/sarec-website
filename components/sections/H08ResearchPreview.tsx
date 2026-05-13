'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import styles from './H08ResearchPreview.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

type ResearchCard = {
  tag: string;
  title: string;
  description: string;
  href: string;
};

const CARDS: ResearchCard[] = [
  {
    tag: '即将发布',
    title: 'ED1 政策与项目机会深度解读',
    description:
      '从政策窗口到真实周期，从资格定义到审批通道 —— ED1 经济适用房项目的完整理解框架。',
    href: '/zh/contact'
  },
  {
    tag: '即将发布',
    title: '中美跨境地产合作的法律结构',
    description:
      'LLC / Escrow / Carry / LP-GP —— 跨境地产投资中真正决定成败的是法律结构，不是项目本身。',
    href: '/zh/contact'
  },
  {
    tag: '即将发布',
    title: '洛杉矶房地产周期与机会窗口',
    description:
      '在长周期市场中识别短期窗口 —— 洛杉矶各区域 2025-2027 年的项目机会和风险清单。',
    href: '/zh/contact'
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

const gridContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE }
  }
};

export function H08ResearchPreview() {
  return (
    <section id="h08-research" className={styles.section}>
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          variants={headerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.span className={styles.eyebrow} variants={headerItem}>
            RESEARCH · 研究中心
          </motion.span>
          <motion.h2 className={styles.h2} variants={headerItem}>
            近期研究方向
          </motion.h2>
          <motion.p className={styles.lead} variants={headerItem}>
            SAREC 围绕真实项目和真实判断，定期发布美国房地产深度研究。
          </motion.p>
        </motion.div>

        <motion.div
          className={styles.grid}
          variants={gridContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {CARDS.map((card, i) => (
            <motion.article
              key={i}
              className={styles.card}
              variants={cardVariants}
            >
              <span className={styles.tag}>{card.tag}</span>
              <h3 className={styles.title}>{card.title}</h3>
              <p className={styles.description}>{card.description}</p>
              <Link href={card.href} className={styles.subscribe}>
                <span className={styles.subscribeDash} aria-hidden="true">
                  ——
                </span>
                关注订阅
              </Link>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
