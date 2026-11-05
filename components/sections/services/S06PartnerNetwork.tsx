'use client';

import { motion, type Variants } from 'framer-motion';
import {
  ImmigrationIcon,
  LegalIcon,
  WealthIcon,
  TaxIcon,
  InsuranceIcon
} from './icons';
import styles from './S06PartnerNetwork.module.css';
import { partnerCopy, partnerNetwork } from '@/lib/sitePagesCopy';

const EASE = [0.22, 1, 0.36, 1] as const;

type IconComponent = (props: { className?: string; size?: number }) => JSX.Element;

type Partner = {
  code: string;
  title: string;
  body: string;
  Icon: IconComponent;
};

const ICONS: IconComponent[] = [ImmigrationIcon, LegalIcon, WealthIcon, TaxIcon, InsuranceIcon];
const PARTNERS: Partner[] = partnerNetwork.map((p, i) => ({ ...p, Icon: ICONS[i] }));

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
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE }
  }
};

export function S06PartnerNetwork() {
  return (
    <section className={styles.section}>
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
            PARTNER NETWORK · 伙伴网络
          </motion.span>
          <motion.h2 className={styles.h2} variants={headerItem}>
            {partnerCopy.title}
          </motion.h2>
          <motion.p className={styles.lead} variants={headerItem}>
            {partnerCopy.lead}
          </motion.p>
        </motion.div>

        {/* 5 partner categories */}
        <motion.div
          className={styles.partnersGrid}
          variants={gridContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {PARTNERS.map((partner) => (
            <motion.article
              key={partner.code}
              className={styles.partnerCard}
              variants={cardVariants}
            >
              <partner.Icon className={styles.cardIcon} />
              <span className={styles.partnerCode}>{partner.code} /</span>
              <h3 className={styles.partnerTitle}>{partner.title}</h3>
              <p className={styles.partnerBody}>{partner.body}</p>
            </motion.article>
          ))}
        </motion.div>

        {/* Note */}
        <motion.p
          className={styles.note}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <span className={styles.noteLabel}>[note]</span>
          具体合作方式以单独协议为准。如需推荐，请联系 SAREC。
        </motion.p>
      </div>
    </section>
  );
}
