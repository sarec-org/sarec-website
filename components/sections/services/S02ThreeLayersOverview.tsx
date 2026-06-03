'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { ChamberIcon, AdvisoryIcon } from './icons';
import styles from './S02ThreeLayersOverview.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

type IconComponent = (props: { className?: string; size?: number }) => JSX.Element;

type Layer = {
  layerLabel: string;
  titleZh: string;
  titleEn: string;
  fit: string;
  entry: string;
  partnership: string;
  linkLabel: string;
  linkHref: string;
  Icon: IconComponent;
};

const LAYERS: Layer[] = [
  {
    layerLabel: 'LAYER 01',
    titleZh: '商会',
    titleEn: 'Chamber',
    fit: '想系统接触美国房地产投资和跨境合作的人',
    entry: '会员服务',
    partnership: '年度会员费',
    linkLabel: '查看商会详细',
    linkHref: '#chamber',
    Icon: ChamberIcon
  },
  {
    layerLabel: 'LAYER 02',
    titleZh: '项目咨询与结构设计',
    titleEn: 'Advisory & Deal Coordination',
    fit: '已有具体项目方向，希望深度合作的人',
    entry: '咨询服务',
    partnership: '按项目阶段约定',
    linkLabel: '查看项目咨询详细',
    linkHref: '#advisory',
    Icon: AdvisoryIcon
  }
];

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
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE }
  }
};

export function S02ThreeLayersOverview() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          variants={headerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.span className={styles.eyebrow} variants={headerItem}>
            OVERVIEW · 总览
          </motion.span>
          <motion.h2 className={styles.h2} variants={headerItem}>
            按参与深度分层
          </motion.h2>
          <motion.p className={styles.lead} variants={headerItem}>
            不同客户在不同阶段进入。商会是入口，深度合作是延伸。
          </motion.p>
        </motion.div>

        <motion.div
          className={styles.grid}
          variants={gridContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {LAYERS.map((layer) => (
            <motion.article
              key={layer.layerLabel}
              className={styles.card}
              variants={cardVariants}
            >
              <layer.Icon className={styles.cardIcon} />
              <span className={styles.cardLayerLabel}>{layer.layerLabel}</span>
              <div className={styles.cardTitleRow}>
                <h3 className={styles.cardTitleZh}>{layer.titleZh}</h3>
                <span className={styles.cardTitleEn}>{layer.titleEn}</span>
              </div>
              <div className={styles.cardMeta}>
                <span className={styles.metaLabel}>适合</span>
                <span className={styles.metaValue}>{layer.fit}</span>
                <span className={styles.metaLabel}>入口</span>
                <span className={styles.metaValue}>{layer.entry}</span>
                <span className={styles.metaLabel}>合作方式</span>
                <span className={styles.metaValue}>{layer.partnership}</span>
              </div>
              <Link href={layer.linkHref} className={styles.cardLink}>
                <span>{layer.linkLabel}</span>
                <span className={styles.cardLinkArrow} aria-hidden="true">
                  →
                </span>
              </Link>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
