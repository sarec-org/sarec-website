'use client';

import { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import styles from './H09FAQ.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

type QA = {
  question: string;
  answer: string[];
};

const QAS: QA[] = [
  {
    question: 'SAREC 是商会还是投资机构？',
    answer: [
      '都是，但不只是。',
      'SAREC 以商会为入口，以项目判断、结构设计和风险控制为核心。',
      '我们提供商会层服务（研究、培训、活动、考察），',
      '也提供项目咨询与结构设计（项目尽调、财务建模、项目判断与说明），',
      '并在符合参与标准的项目中提供合作结构设计支持。'
    ]
  },
  {
    question: 'SAREC 服务的是哪类客户？',
    answer: [
      'SAREC 主要服务四类客户：',
      '在美华人投资人、出海企业家、中国地产同行、美国项目方。',
      '不在以上 4 类的客户，可以预约 30 分钟沟通讨论匹配度。'
    ]
  },
  {
    question: 'SAREC 和市场上其他地产服务机构有什么不同？',
    answer: [
      '我们做培训和展会，但围绕真实项目而非基础卖课；',
      '项目判断只是第一步，把控才是核心；',
      '我们提供合作结构设计，不直接作为施工开发主体，也不设资金池；',
      '我们做跨境资本合作，但只服务能看懂项目、能承担风险的客户。'
    ]
  },
  {
    question: '如何与 SAREC 开始合作？',
    answer: [
      '三种方式：',
      '预约 30 分钟沟通（适合还在了解阶段）、',
      '提交项目评估（适合已有具体项目）、',
      '申请加入会员（适合长期培育型客户）。',
      '提交后 1 个工作日内由 SAREC 团队回复。'
    ]
  }
];

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
