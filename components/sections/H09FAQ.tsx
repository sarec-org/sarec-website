'use client';

import { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import styles from './H09FAQ.module.css';
import { homeCopy } from '@/lib/sitePagesCopy';

const EASE = [0.22, 1, 0.36, 1] as const;

type QA = {
  question: string;
  answer: string[];
};

const QAS: QA[] = homeCopy.faq;

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

const listContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE }
  }
};

export function H09FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="h09-faq" className={styles.section}>
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          variants={headerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.span className={styles.eyebrow} variants={headerItem}>
            FAQ · 常见问题
          </motion.span>
          <motion.h2 className={styles.h2} variants={headerItem}>
            来访者最常问的
          </motion.h2>
        </motion.div>

        <motion.div
          className={styles.accordion}
          variants={listContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {QAS.map((qa, i) => {
            const isOpen = openIndex === i;
            const panelId = `h09-faq-panel-${i}`;
            return (
              <motion.div
                key={i}
                className={styles.item}
                variants={itemVariants}
              >
                <button
                  type="button"
                  className={styles.questionRow}
                  onClick={() => setOpenIndex(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                >
                  <span className={styles.questionCode}>Q{i + 1} /</span>
                  <span className={styles.questionText}>{qa.question}</span>
                  <span className={styles.indicator} aria-hidden="true">
                    <span className={styles.indicatorBar} />
                    <motion.span
                      className={styles.indicatorBar}
                      animate={{ rotate: isOpen ? 0 : 90 }}
                      transition={{ duration: 0.4, ease: EASE }}
                    />
                  </span>
                </button>
                <motion.div
                  id={panelId}
                  initial={false}
                  animate={{
                    height: isOpen ? 'auto' : 0,
                    opacity: isOpen ? 1 : 0
                  }}
                  transition={{ duration: 0.4, ease: EASE }}
                  style={{ overflow: 'hidden' }}
                  aria-hidden={!isOpen}
                >
                  <div className={styles.panelInner}>
                    {qa.answer.map((line, j) => (
                      <p key={j} className={styles.answerLine}>
                        {line}
                      </p>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
