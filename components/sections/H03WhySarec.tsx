'use client';

import { motion, type Variants } from 'framer-motion';
import styles from './H03WhySarec.module.css';
import { homeCopy } from '@/lib/sitePagesCopy';

const EASE = [0.22, 1, 0.36, 1] as const;

const leftVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.0, ease: EASE }
  }
};

const listVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE }
  }
};

type Card = {
  number: string;
  title: string;
  body: string;
};

const CARDS: Card[] = homeCopy.why.cards;

export function H03WhySarec() {
  return (
    <section id="h03-why-sarec" className={styles.section}>
      <div className={styles.container}>
        <motion.div
          className={styles.left}
          variants={leftVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
        >
          <span className={styles.eyebrow}>WHY SAREC · 为什么需要 SAREC</span>
          <h2 className={styles.h2}>
            <span className={styles.h2Line}>中美房地产合作</span>
            <span className={styles.h2Line}>真正的门槛</span>
          </h2>
          <p className={styles.lead}>
            不是机会的缺乏，
            <br />
            而是判断力、结构能力和长期信任的稀缺。
          </p>
        </motion.div>

        <motion.div
          className={styles.right}
          variants={listVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {CARDS.map((card) => (
            <motion.article
              key={card.number}
              className={styles.card}
              variants={cardVariants}
            >
              <span className={styles.cardNumber} aria-hidden="true">
                {card.number}
              </span>
              <h3 className={styles.cardTitle}>{card.title}</h3>
              <p className={styles.cardBody}>{card.body}</p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
