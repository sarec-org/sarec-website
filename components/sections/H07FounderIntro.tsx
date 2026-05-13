'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import styles from './H07FounderIntro.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

const CREDENTIALS = [
  '中欧国际工商学院 EMBA',
  '长期从事房地产投资、项目操盘与跨境合作实践',
  '中美双向跨境合作经验',
  '2024 在美国推动 SAREC 落地'
];

/* ===== Variants ===== */
const rightColContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE }
  }
};

const credListContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
};

const portraitVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 1.2, ease: EASE }
  }
};

export function H07FounderIntro() {
  return (
    <section id="h07-founder" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.split}>
          {/* Left: portrait */}
          <motion.div
            className={styles.leftCol}
            variants={portraitVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <div className={styles.portraitWrap}>
              <Image
                src="/images/founder/andy-wang-founder.jpg"
                alt="Andy Wang · SAREC 创始人"
                fill
                className={styles.portraitImage}
                sizes="(max-width: 768px) 320px, (max-width: 1024px) 400px, 480px"
              />
            </div>
          </motion.div>

          {/* Right: credentials + quote + CTA */}
          <motion.div
            className={styles.rightCol}
            variants={rightColContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <motion.span className={styles.eyebrow} variants={item}>
              FOUNDER · 创始人
            </motion.span>

            <motion.h2 className={styles.name} variants={item}>
              Andy Wang
            </motion.h2>

            <motion.p className={styles.title} variants={item}>
              SAREC 创始人
              <span className={styles.titleSep}>·</span>
              跨境地产投资人
            </motion.p>

            <motion.ul className={styles.credentials} variants={credListContainer}>
              {CREDENTIALS.map((c, i) => (
                <motion.li
                  key={i}
                  className={styles.credentialItem}
                  variants={item}
                >
                  <span className={styles.credentialBullet} aria-hidden="true">
                    ·
                  </span>
                  <span className={styles.credentialText}>{c}</span>
                </motion.li>
              ))}
            </motion.ul>

            <motion.blockquote className={styles.quote} variants={item}>
              <motion.span
                className={styles.quoteBar}
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 1.0, ease: EASE, delay: 0.2 }}
                aria-hidden="true"
              />
              <span className={styles.quoteText}>
                “跨境房地产合作的核心，
                <br />
                不是信息差，而是判断力、
                <br />
                结构能力和长期信任。”
              </span>
            </motion.blockquote>

            <motion.div variants={item}>
              <Link href="/zh/about/founder" className={styles.cta}>
                <span>阅读完整创始人背景</span>
                <span className={styles.ctaArrow} aria-hidden="true">
                  →
                </span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
