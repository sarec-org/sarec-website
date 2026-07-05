'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { SaImage } from '@/components/shared/SaImage';
import { SaVideo } from '@/components/shared/SaVideo';
import styles from './S03Chamber.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

type Service = {
  code: string;
  title: string;
  body: string[];
};

const SERVICES: Service[] = [
  {
    code: '01',
    title: '研究内容',
    body: [
      'SAREC 定期发布美国房地产研究内容，',
      '关注政策动向、市场结构、项目机会和风险清单。',
      '会员可优先访问。'
    ]
  },
  {
    code: '02',
    title: '主题培训',
    body: [
      '不做泛泛而谈的基础培训。',
      '围绕真实项目、市场判断、风险识别和资源协同 ——',
      '包括项目结构、财务建模实操、风险识别清单。'
    ]
  },
  {
    code: '03',
    title: '项目研讨与闭门分享',
    body: [
      '针对常务理事和副会长单位的小范围分享。',
      '通常涉及具体项目或敏感话题。'
    ]
  },
  {
    code: '04',
    title: '行业展会与论坛',
    body: [
      '跨境地产投资相关的行业活动。',
      'SAREC 主办或联办，会员可优先参加。'
    ]
  },
  {
    code: '05',
    title: '美国实地考察',
    body: [
      'SAREC 将根据项目进度和会员需求，',
      '组织美国实地考察、项目走访和专题交流。',
      '会员可优先参加考察活动。'
    ]
  }
];

type Tier = {
  zh: string;
  en: string;
  fit: string;
};

const TIERS: Tier[] = [
  {
    zh: '理事会员',
    en: 'Council Member',
    fit: '希望系统了解美国房地产投资和跨境合作的人'
  },
  {
    zh: '常务理事',
    en: 'Executive Council Member',
    fit: '已有具体项目方向或投资意向，希望深度参与的人'
  },
  {
    zh: '副会长单位',
    en: 'Vice President Member',
    fit: '在房地产、金融、专业服务领域有长期合作意向的机构或个人'
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

const listContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE }
  }
};

export function S03Chamber() {
  return (
    <section id="chamber" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.stickyBlock}>
          <div className={styles.videoCol}>
            <div className={styles.videoSticky}>
              <div className={styles.videoFrame}>
                <SaVideo
                  src="/videos/chamber-boardroom-discussion.mp4"
                  poster="/videos/chamber-boardroom-discussion-poster.jpg"
                  alt="商会会议室研讨"
                  fill
                  filterIntensity="editorial"
                />
              </div>
              <div className={styles.videoCaption}>
                <span className={styles.videoCaptionBracket}>[</span>
                <span className={styles.videoCaptionLabel}>BOARDROOM</span>
                <span className={styles.videoCaptionDivider}>·</span>
                <span className={styles.videoCaptionZh}>商会研讨</span>
                <span className={styles.videoCaptionBracket}>]</span>
              </div>

              <figure className={styles.proofBlock}>
                <p className={styles.proofLabel}>项目落地 · 商会服务案例</p>
                <div className={styles.proofFrame}>
                  <SaImage
                    src="/images/projects/4155-wilshire-bronson.webp"
                    alt="4155 Wilshire 商业综合体外观渲染"
                    fill
                    sizes="(max-width: 1023px) 100vw, 500px"
                    filterIntensity="none"
                  />
                </div>
                <figcaption className={styles.proofCaption}>
                  4155 Wilshire Blvd · 9 层综合体
                </figcaption>
              </figure>
            </div>
          </div>
          <div className={styles.contentCol}>
        {/* Header */}
        <motion.div
          className={styles.header}
          variants={headerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.span className={styles.eyebrow} variants={headerItem}>
            PLATFORM · 平台
          </motion.span>
          <motion.h2 className={styles.h2} variants={headerItem}>
            平台信任与服务深度
          </motion.h2>
          <motion.p className={styles.tagline} variants={headerItem}>
            围绕真实项目的高含金量内容。
          </motion.p>
        </motion.div>

        {/* 5 services list */}
        <motion.ul
          className={styles.servicesList}
          variants={listContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {SERVICES.map((service) => (
            <motion.li
              key={service.code}
              className={styles.serviceItem}
              variants={itemVariants}
            >
              <div className={styles.serviceHeader}>
                <span className={styles.serviceNumber}>{service.code} /</span>
                <h3 className={styles.serviceTitle}>{service.title}</h3>
              </div>
              <div className={styles.serviceBody}>
                {service.body.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </motion.li>
          ))}
        </motion.ul>
          </div>
        </div>

        {/* Membership tiers heading */}
        <motion.div
          variants={headerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.span className={styles.subEyebrow} variants={headerItem}>
            MEMBERSHIP · 会员级别
          </motion.span>
          <motion.h3 className={styles.subH3} variants={headerItem}>
            3 个会员级别
          </motion.h3>
        </motion.div>

        {/* Tiers grid */}
        <motion.div
          className={styles.tiers}
          variants={listContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {TIERS.map((tier, i) => (
            <motion.article
              key={tier.zh}
              className={styles.tier}
              variants={itemVariants}
            >
              <div className={styles.tierTitleRow}>
                <h4 className={styles.tierTitleZh}>
                  {i + 1}. {tier.zh}
                </h4>
                <span className={styles.tierTitleEn}>{tier.en}</span>
              </div>
              <p className={styles.tierFit}>
                <span className={styles.tierFitLabel}>适合</span>
                {tier.fit}
              </p>
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
          会员费与各档位权益已公开，详见会员页；具体合作方式与入会安排以单独协议为准。
        </motion.p>

        {/* Inline CTA */}
        <motion.div
          className={styles.ctaWrap}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <Link href="/zh/membership" className={styles.memberLink}>
            了解会员服务 →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
