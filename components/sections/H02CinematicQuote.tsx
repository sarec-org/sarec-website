'use client';

import { useState } from 'react';
import { motion, MotionConfig, type Variants } from 'framer-motion';
import styles from './H02CinematicQuote.module.css';

const EASE = [0.22, 0.61, 0.36, 1] as const;

const quoteMarkVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 1.4, ease: EASE } }
};

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.2, delayChildren: 0.1 } }
};

const lineVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: EASE }
  }
};

const attributionVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: 1.0, ease: EASE }
  }
};

export function H02CinematicQuote() {
  const [underlineReady, setUnderlineReady] = useState(false);

  return (
    <MotionConfig reducedMotion="user">
    <section id="h02-cinematic-quote" className={styles.section}>
      <div className={styles.grain} aria-hidden="true" />

      <motion.div
        className={styles.quoteMarkWrap}
        variants={quoteMarkVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
        aria-hidden="true"
      >
        <span className={styles.quoteMark}>“</span>
      </motion.div>

      <motion.div
        className={styles.content}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
      >
        <motion.p className={styles.line} variants={lineVariants}>
          跨境房地产合作的核心，
        </motion.p>
        <motion.p className={styles.line} variants={lineVariants}>
          不是{' '}
          <span
            className={`${styles.accent} ${underlineReady ? styles.underlineActive : ''}`}
          >
            信息差
          </span>
          ，
        </motion.p>
        <motion.p
          className={styles.line}
          variants={lineVariants}
          onAnimationComplete={() => setUnderlineReady(true)}
        >
          而是判断力、结构能力和长期信任。
        </motion.p>

        <motion.p
          className={styles.attribution}
          variants={attributionVariants}
        >
          — ANDY WANG · SAREC FOUNDER
        </motion.p>
      </motion.div>
    </section>
    </MotionConfig>
  );
}
