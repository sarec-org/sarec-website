'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import styles from './InternalCTABanner.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

export type InternalCTA = {
  label: string;
  href: string;
  variant: 'primary' | 'secondary';
};

export interface InternalCTABannerProps {
  eyebrow?: string;
  title: string;
  subtitle: React.ReactNode;
  ctas: InternalCTA[];
}

const sectionContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE }
  }
};

const ctaGroupVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
};

const ctaItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE }
  }
};

export function InternalCTABanner({
  eyebrow,
  title,
  subtitle,
  ctas
}: InternalCTABannerProps) {
  return (
    <section className={styles.section}>
      <div className={styles.topHairline} aria-hidden="true" />
      <div className={styles.bottomHairline} aria-hidden="true" />

      <motion.div
        className={styles.container}
        variants={sectionContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        {eyebrow && (
          <motion.span className={styles.eyebrow} variants={fadeUp}>
            {eyebrow}
          </motion.span>
        )}

        <motion.h2 className={styles.title} variants={fadeUp}>
          {title}
        </motion.h2>

        <motion.p className={styles.subtitle} variants={fadeUp}>
          {subtitle}
        </motion.p>

        <motion.div className={styles.ctaGroup} variants={ctaGroupVariants}>
          {ctas.map((cta, i) => (
            <motion.div
              key={`${cta.href}-${i}`}
              className={styles.ctaItem}
              variants={ctaItemVariants}
            >
              <Link
                href={cta.href}
                className={
                  cta.variant === 'primary'
                    ? styles.ctaPrimary
                    : styles.ctaSecondary
                }
              >
                <span>{cta.label}</span>
                <span className={styles.ctaArrow} aria-hidden="true">
                  →
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
