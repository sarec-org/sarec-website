'use client';

import { motion, type Variants } from 'framer-motion';
import styles from './H03WhySarec.module.css';

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

const CARDS: Card[] = [
  {
    number: '01',
    title: '培训供给充足，但项目判断稀缺',
    body:
      '市场上有大量入门级和理念型的培训内容。但客户真正需要的不是"美国房地产入门"，而是"如何看懂一个具体项目、识别风险、评估结构"。'
  },
  {
    number: '02',
    title: '撮合中介很多，但深度把控很少',
    body:
      '许多服务方靠"介绍项目"赚取一次性佣金。但撮合只是入口。项目能否成立、是否符合投资人利益、风险如何控制 —— 这些需要持续的专业把控。'
  },
  {
    number: '03',
    title: '中介视角丰富，但投资人视角缺失',
    body:
      '许多机构服务的是项目方 —— 帮项目方找钱。但投资人视角下需要的是另一套服务：项目筛选、结构设计、风险评估、过程监督、利益对齐。'
  },
  {
    number: '04',
    title: '业务边界模糊，专业服务伙伴未分工',
    body:
      '许多服务方同时做地产、保险、移民、税务、贷款。更稳健的做法 —— 主叙事聚焦地产，其他服务由专业服务伙伴网络分工提供。'
  }
];

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
          <h2 className={styles.h2}>中美房地产合作的真正门槛</h2>
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
