'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import styles from './H08ResearchPreview.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

export type ResearchCard = {
  tag: string;
  title: string;
  description: string;
  href: string;
};

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

const gridContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE }
  }
};

export function H08ResearchPreview({ articles }: { articles: ResearchCard[] }) {
  // 已发布文章由服务端(app/zh/page.tsx)经 accessor 注入;不足时安全降级(只渲染已有卡片,不渲染空链接)。
  const cards = articles.filter((c) => c.title && c.href);

  return (
    <section id="h08-research" className={styles.section}>
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          variants={headerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.span className={styles.eyebrow} variants={headerItem}>
            RESEARCH · 研究中心
          </motion.span>
          <motion.h2 className={styles.h2} variants={headerItem}>
            近期研究
          </motion.h2>
          <motion.p className={styles.lead} variants={headerItem}>
            SAREC 围绕真实项目和真实判断，定期发布美国房地产深度研究。
          </motion.p>
        </motion.div>

        {cards.length > 0 ? (
          <motion.div
            className={styles.grid}
            variants={gridContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {cards.map((card) => (
              <motion.article
                key={card.href}
                className={styles.card}
                variants={cardVariants}
              >
                <span className={styles.tag}>{card.tag}</span>
                <h3 className={styles.title}>{card.title}</h3>
                <p className={styles.description}>{card.description}</p>
                <Link href={card.href} className={styles.subscribe}>
                  <span className={styles.subscribeDash} aria-hidden="true">
                    ——
                  </span>
                  阅读全文
                </Link>
              </motion.article>
            ))}
          </motion.div>
        ) : null}

        <motion.div
          className={styles.viewAllRow}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <Link href="/zh/research" className={styles.viewAll}>
            查看全部研究 →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
