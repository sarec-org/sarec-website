'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { CTA_REGISTRY } from '@/lib/cta/registry';
import { localize } from '@/lib/i18n/types';
import styles from './H04ThreeLayers.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

type Weight = 'primary' | 'secondary' | 'muted';

type Entry = {
  code: string;
  title: string;
  preview: string;
  linkHref: string;
  weight: Weight;
};

// V2.0 三入口轻量预览;标题与 /zh/services hub 一致,预览句为锁定版,
// CTA 链向真实子页。H04 不再含 membership 入口、不再做 sticky 滚动叙事。
const ENTRIES: Entry[] = [
  {
    code: '01',
    title: '投资人 & 开发者',
    preview: '为跨境投资人与开发者提供项目风险判断、可行性评估与开发全程顾问。',
    linkHref: '/zh/services/investors',
    weight: 'primary'
  },
  {
    code: '02',
    title: '项目方',
    preview: '为项目方提供市场定位、内容资产与投资人教育，建立 AI 搜索可见度与品牌信任。',
    linkHref: '/zh/services/project-owners',
    weight: 'secondary'
  },
  {
    code: '03',
    title: '专业服务机构',
    preview: '面向律师、会计、顾问等专业服务机构的协作入口。',
    linkHref: '/zh/services/professional-firms',
    weight: 'muted'
  }
];

const WEIGHT_CLASS: Record<Weight, string> = {
  primary: styles.cardLg,
  secondary: styles.cardMd,
  muted: styles.cardSm
};

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } }
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } }
};

export function H04ThreeLayers() {
  const risk = CTA_REGISTRY['risk-review'];

  return (
    <section id="h04-three-layers" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* 左列:总判断 + risk-review 主 CTA */}
          <motion.div
            className={styles.intro}
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
          >
            <motion.p className={styles.eyebrow} variants={item}>
              SERVICES · 服务入口
            </motion.p>
            <motion.h2 className={styles.statement} variants={item}>
              中美房地产项目，判断先于投入。
            </motion.h2>
            <motion.div variants={item}>
              <Link href={risk.primary.route.zh} className={styles.introCta}>
                <span>{localize(risk.primary.label)}</span>
                <span className={styles.introCtaArrow} aria-hidden="true">
                  →
                </span>
              </Link>
            </motion.div>
          </motion.div>

          {/* 右列:三入口卡片(权重 1>2≫3) */}
          <motion.ul
            className={styles.cards}
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            {ENTRIES.map((entry) => (
              <motion.li
                key={entry.code}
                className={`${styles.card} ${WEIGHT_CLASS[entry.weight]}`}
                variants={item}
              >
                <span className={styles.cardCounter}>{entry.code}</span>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{entry.title}</h3>
                  <p className={styles.cardPreview}>{entry.preview}</p>
                  <Link href={entry.linkHref} className={styles.cardLink}>
                    <span>了解</span>
                    <span className={styles.cardLinkArrow} aria-hidden="true">
                      →
                    </span>
                  </Link>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </div>
    </section>
  );
}
