'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import styles from './InternalHero.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

export type InternalHeroCTA = {
  label: string;
  href: string;
};

export interface InternalHeroProps {
  /** Mono caps eyebrow line, e.g., "SERVICES · 服务架构" */
  eyebrow: string;
  /**
   * H1 — string or JSX. To highlight a phrase in gold italic Cormorant
   * (e.g., A01's "[跨境地产平台]"), wrap it in:
   *   <span className={internalHeroStyles.accent}>...</span>
   * importing internalHeroStyles from this file.
   */
  h1: React.ReactNode;
  /**
   * Sub-paragraph. Pass a string (use \n is ignored — wrap lines in JSX
   * with explicit <br /> or split into <p> tags), or rich JSX.
   * Rendered in Inter Tight (sans), NOT italic — informational tone.
   */
  sub: React.ReactNode;
  /** Optional compliance / disclaimer footnote below sub. */
  note?: string;
  /**
   * Optional inline stats strip (e.g., Rosewood R01: ["[69] 单元", "[6] 层", "[在管]"]).
   * Substrings wrapped in [...] render in italic gold Cormorant accent.
   */
  stats?: string[];
  /** Primary CTA. Omit for Contact Hero (CT01). */
  primaryCTA?: InternalHeroCTA;
  /** Secondary CTA. Omit when no primary. */
  secondaryCTA?: InternalHeroCTA;
  /** Background variant. 'standard' = var(--ink-deep), 'darkest' = var(--ink-deepest). */
  background?: 'standard' | 'darkest';
}

/* ===== Variants ===== */
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

/* Split a stat string on bracketed groups so they can render with
   the italic gold accent class while the rest stays mono caps. */
function renderStat(stat: string) {
  const parts = stat.split(/(\[[^\]]*\])/g);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith('[') && part.endsWith(']')) {
      return (
        <span key={i} className={styles.statAccent}>
          {part}
        </span>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function InternalHero({
  eyebrow,
  h1,
  sub,
  note,
  stats,
  primaryCTA,
  secondaryCTA,
  background = 'standard'
}: InternalHeroProps) {
  const hasCTAs = Boolean(primaryCTA || secondaryCTA);

  return (
    <section
      className={`${styles.section} ${
        background === 'darkest' ? styles.sectionDarkest : ''
      }`}
    >
      <motion.div
        className={styles.container}
        variants={sectionContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <motion.span className={styles.eyebrow} variants={fadeUp}>
          {eyebrow}
        </motion.span>

        <motion.h1 className={styles.h1} variants={fadeUp}>
          {h1}
        </motion.h1>

        <motion.p className={styles.sub} variants={fadeUp}>
          {sub}
        </motion.p>

        {note && (
          <motion.p className={styles.note} variants={fadeUp}>
            {note}
          </motion.p>
        )}

        {stats && stats.length > 0 && (
          <motion.div className={styles.stats} variants={fadeUp}>
            {stats.map((stat, i) => (
              <span key={i} className={styles.statItem}>
                {renderStat(stat)}
              </span>
            ))}
          </motion.div>
        )}

        {hasCTAs && (
          <motion.div className={styles.ctaRow} variants={ctaGroupVariants}>
            {primaryCTA && (
              <motion.div variants={ctaItemVariants}>
                <Link href={primaryCTA.href} className={styles.ctaPrimary}>
                  <span>{primaryCTA.label}</span>
                  <span className={styles.ctaArrow} aria-hidden="true">
                    →
                  </span>
                </Link>
              </motion.div>
            )}
            {secondaryCTA && (
              <motion.div variants={ctaItemVariants}>
                <Link href={secondaryCTA.href} className={styles.ctaSecondary}>
                  <span>{secondaryCTA.label}</span>
                  <span className={styles.ctaArrow} aria-hidden="true">
                    →
                  </span>
                </Link>
              </motion.div>
            )}
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}

/**
 * Re-export the CSS Module styles object so callers can apply the
 * scoped class names from outside this file (notably `accent` for
 * inline H1 highlights like A01's "[跨境地产平台]").
 */
export { styles as internalHeroStyles };
