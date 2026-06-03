'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  motion,
  useMotionValueEvent,
  useScroll,
  type Variants
} from 'framer-motion';
import styles from './H04ThreeLayers.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

type Layer = {
  code: string;
  en: string;
  zh: string;
  tagline: string;
  services: string;
  entry: string;
  entryNote: string;
  partnership: string;
  partnershipNote: string;
  linkText: string;
  linkHref: string;
  progressLabel: string;
};

const LAYERS: Layer[] = [
  {
    code: '01',
    en: 'LAYER 01 · CHAMBER',
    zh: '商会',
    tagline: '围绕真实项目的高含金量内容。',
    services: '· 研究 · 培训 · 展会 · 活动 · 考察 · 教育 · 资源协同',
    entry: '会员服务',
    entryNote: '研究、培训、活动、考察 —— 长期接触跨境地产合作的入口。',
    partnership: '年度会员费',
    partnershipNote: '按级别 (理事 / 常务理事 / 副会长单位) 区分。',
    linkText: '了解第一层',
    linkHref: '/zh/services#chamber',
    progressLabel: 'CHAMBER'
  },
  {
    code: '02',
    en: 'LAYER 02 · ADVISORY & DEAL COORDINATION',
    zh: '项目咨询与结构设计',
    tagline: '项目判断只是第一步，把控才是核心。',
    services: '· 项目尽调 · 财务建模 · 结构设计 · 风险评估 · 项目判断与说明',
    entry: '咨询服务',
    entryNote: '已有具体项目方向, 希望深度合作的客户。',
    partnership: '按项目阶段约定',
    partnershipNote: '尽调、建模、结构设计等按阶段计费。',
    linkText: '了解第二层',
    linkHref: '/zh/services#advisory',
    progressLabel: 'ADVISORY'
  }
];

const CARD_BG: Record<number, string> = {
  0: styles.card1,
  1: styles.card2,
  2: styles.card3
};

const BOTTOM_MARK: Record<number, string> = {
  0: styles.bottomMark1,
  1: styles.bottomMark2,
  2: styles.bottomMark3
};

/* ===== Variants ===== */
const cardVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.15 } }
};

const groupVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE }
  }
};

/* ===== Card ===== */
function Card({
  data,
  index,
  total
}: {
  data: Layer;
  index: number;
  total: number;
}) {
  const counter = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;

  return (
    <motion.article
      className={`${styles.card} ${CARD_BG[index]}`}
      style={{ zIndex: index + 1 }}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
      aria-label={data.en}
    >
      <motion.div className={styles.topBar} variants={itemVariants}>
        <span className={styles.eyebrow}>{data.en}</span>
        <span className={styles.counter}>{counter}</span>
      </motion.div>

      <motion.div className={styles.leftSide} variants={groupVariants}>
        <motion.h3 className={styles.h2} variants={itemVariants}>
          {data.zh}
        </motion.h3>

        <motion.span className={styles.tagline} variants={itemVariants}>
          {data.tagline}
          <motion.span
            className={styles.taglineUnderline}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 1.4, ease: EASE, delay: 0.9 }}
            aria-hidden="true"
          />
        </motion.span>

        <motion.p className={styles.services} variants={itemVariants}>
          {data.services}
        </motion.p>
      </motion.div>

      <motion.div className={styles.rightSide} variants={groupVariants}>
        <motion.div className={styles.metaBlock} variants={itemVariants}>
          <span className={styles.metaLabel}>入口</span>
          <span className={styles.metaValue}>{data.entry}</span>
          <p className={styles.metaNote}>{data.entryNote}</p>
        </motion.div>
        <motion.div className={styles.metaBlock} variants={itemVariants}>
          <span className={styles.metaLabel}>合作方式</span>
          <span className={styles.metaValue}>{data.partnership}</span>
          <p className={styles.metaNote}>{data.partnershipNote}</p>
        </motion.div>
      </motion.div>

      <motion.div className={styles.bottomBar} variants={itemVariants}>
        <Link href={data.linkHref} className={styles.link}>
          <span>{data.linkText}</span>
          <span className={styles.linkArrow} aria-hidden="true">
            →
          </span>
        </Link>
        <div className={BOTTOM_MARK[index]} aria-hidden="true" />
      </motion.div>
    </motion.article>
  );
}

/* ===== Progress indicator ===== */
function ProgressIndicator({
  activeIndex,
  outerRef
}: {
  activeIndex: number;
  outerRef: React.RefObject<HTMLElement>;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = outerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '-30% 0px -30% 0px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [outerRef]);

  return (
    <div
      className={`${styles.progress} ${visible ? styles.progressVisible : ''}`}
      aria-hidden="true"
    >
      {LAYERS.map((layer, i) => (
        <div
          key={layer.code}
          className={`${styles.progressItem} ${
            activeIndex === i ? styles.progressActive : ''
          }`}
        >
          <span className={styles.progressDot} />
          <span className={styles.progressConnector} />
          <span className={styles.progressLabel}>
            <span className={styles.progressNumber}>{layer.code}</span>
            {layer.progressLabel}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ===== Main ===== */
export function H04ThreeLayers() {
  const outerRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ['start start', 'end end']
  });

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    const next = latest < 0.5 ? 0 : 1;
    setActiveIndex((prev) => (prev === next ? prev : next));
  });

  return (
    <section id="h04-three-layers" ref={outerRef} className={styles.outer}>
      {LAYERS.map((layer, i) => (
        <Card key={layer.code} data={layer} index={i} total={LAYERS.length} />
      ))}
      <ProgressIndicator activeIndex={activeIndex} outerRef={outerRef} />
    </section>
  );
}
