'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { CTA_REGISTRY } from '@/lib/cta/registry';
import { localize } from '@/lib/i18n/types';
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
  const risk = CTA_REGISTRY['risk-review'];

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
          BEGIN · 开始判断
        </motion.span>

        <motion.h2 className={styles.title} variants={fadeUpMedium}>
          中美房地产项目，先做一次风险判断。
        </motion.h2>

        <motion.p className={styles.subtitle} variants={fadeUpSmall}>
          无论你是在评估一个具体的美国房地产项目，还是在寻找可靠的判断与专业服务，都可以先从一次项目风险初诊开始。
        </motion.p>

        <motion.div className={styles.ctaGroup} variants={ctaGroupVariants}>
          <motion.div className={styles.ctaItem} variants={ctaItemVariants}>
            <Link href={risk.primary.route.zh} className={styles.ctaPrimary}>
              <span>{localize(risk.primary.label)}</span>
              <span className={styles.ctaArrow} aria-hidden="true">
                →
              </span>
            </Link>
          </motion.div>

          <motion.div className={styles.ctaItem} variants={ctaItemVariants}>
            <Link href="/zh/services" className={styles.ctaSecondary}>
              <span>查看服务入口</span>
              <span className={styles.ctaArrow} aria-hidden="true">
                →
              </span>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div className={styles.weakLinkRow} variants={ctaItemVariants}>
          <Link href="/zh/membership" className={styles.weakLink}>
            了解会员服务
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
