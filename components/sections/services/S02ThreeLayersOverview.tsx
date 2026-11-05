'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { SaImage } from '@/components/shared/SaImage';
import styles from './S02ThreeLayersOverview.module.css';
import { servicesCopy } from '@/lib/sitePagesCopy';

const EASE = [0.22, 1, 0.36, 1] as const;

type Weight = 'primary' | 'secondary' | 'muted';

type Entry = {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  linkLabel: string;
  linkHref: string;
  weight: Weight;
  image?: { src: string; alt: string };
};

const ENTRIES: Entry[] = servicesCopy.entries;

const WEIGHT_CLASS: Record<Weight, string> = {
  primary: styles.cardPrimary,
  secondary: styles.cardSecondary,
  muted: styles.cardMuted
};

const headerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } }
};

const headerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } }
};

const gridContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } }
};

export function S02ThreeLayersOverview() {
  return (
    <section id="service-entries" className={styles.section}>
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          variants={headerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.span className={styles.eyebrow} variants={headerItem}>
            SERVICES · 服务入口
          </motion.span>
          <motion.h2 className={styles.h2} variants={headerItem}>
            你属于哪一类客户?
          </motion.h2>
          <motion.p className={styles.lead} variants={headerItem}>
            SAREC 面向三类客户提供服务。选择最贴近你的入口,看清下一步。
          </motion.p>
        </motion.div>

        <motion.div
          className={styles.grid}
          variants={gridContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.12 }}
        >
          {ENTRIES.map((entry) =>
            entry.weight === 'primary' ? (
              <motion.article
                key={entry.title}
                className={`${styles.card} ${styles.cardPrimary}`}
                variants={cardVariants}
              >
                <div className={styles.cardMain}>
                  <span className={styles.cardEyebrow}>{entry.eyebrow}</span>
                  <h3 className={styles.cardTitle}>{entry.title}</h3>
                  <p className={styles.cardDesc}>{entry.description}</p>
                  <Link href={entry.linkHref} className={styles.cardLink}>
                    <span>{entry.linkLabel}</span>
                    <span className={styles.cardLinkArrow} aria-hidden="true">
                      →
                    </span>
                  </Link>
                </div>
                <div className={styles.cardAside}>
                  {entry.image ? (
                    <div className={styles.cardImage}>
                      <SaImage
                        src={entry.image.src}
                        alt={entry.image.alt}
                        fill
                        sizes="(max-width: 1023px) 100vw, 36vw"
                        filterIntensity="editorial"
                      />
                    </div>
                  ) : null}
                  <ul className={styles.cardPoints}>
                    {entry.points.map((p) => (
                      <li key={p} className={styles.cardPoint}>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.article>
            ) : (
              <motion.article
                key={entry.title}
                className={`${styles.card} ${WEIGHT_CLASS[entry.weight]}`}
                variants={cardVariants}
              >
                <span className={styles.cardEyebrow}>{entry.eyebrow}</span>
                <h3 className={styles.cardTitle}>{entry.title}</h3>
                <p className={styles.cardDesc}>{entry.description}</p>
                <ul className={styles.cardPoints}>
                  {entry.points.map((p) => (
                    <li key={p} className={styles.cardPoint}>
                      {p}
                    </li>
                  ))}
                </ul>
                <Link href={entry.linkHref} className={styles.cardLink}>
                  <span>{entry.linkLabel}</span>
                  <span className={styles.cardLinkArrow} aria-hidden="true">
                    →
                  </span>
                </Link>
              </motion.article>
            )
          )}
        </motion.div>
      </div>
    </section>
  );
}
