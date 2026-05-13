'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import styles from './H10CTABanner.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

const sectionContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
};

const fadeUpSmall: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE }
  }
};

const fadeUpMedium: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE }
  }
};

const ctaGroupVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
};

const ctaItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE }
  }
};

export function H10CTABanner() {
  return (
    <section id="h10-cta-banner" className={styles.section}>
      <div className={styles.topHairline} aria-hidden="true" />
      <div className={styles.bottomHairline} aria-hidden="true" />

      <motion.div
        className={styles.container}
        variants={sectionContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <motion.span className={styles.eyebrow} variants={fadeUpSmall}>
          BEGIN · 开始合作
        </motion.span>

        <motion.h2 className={styles.title} variants={fadeUpMedium}>
          准备好开始了吗
        </motion.h2>

        <motion.p className={styles.subtitle} variants={fadeUpSmall}>
          不论你是第一次接触美国房地产投资，
          <br />
          还是已经在路上 —— SAREC 可以一起谈。
        </motion.p>

        <motion.div className={styles.ctaGroup} variants={ctaGroupVariants}>
          <motion.div className={styles.ctaItem} variants={ctaItemVariants}>
            <Link href="/zh/contact" className={styles.ctaPrimary}>
              <span>预约 30 分钟沟通</span>
              <span className={styles.ctaArrow} aria-hidden="true">
                →
              </span>
            </Link>
          </motion.div>

          <motion.div className={styles.ctaItem} variants={ctaItemVariants}>
            <Link
              href="/zh/contact#project-evaluation"
              className={styles.ctaSecondary}
            >
              <span>项目评估 · 30 分钟</span>
              <span className={styles.ctaArrow} aria-hidden="true">
                →
              </span>
            </Link>
          </motion.div>

          <motion.div className={styles.ctaItem} variants={ctaItemVariants}>
            <Link href="/zh/membership" className={styles.ctaSecondary}>
              <span>申请加入会员</span>
              <span className={styles.ctaArrow} aria-hidden="true">
                →
              </span>
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
