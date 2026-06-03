/**
 * 统一 CTA 系统 · 单一事实源(实施方案 D 节 · 阶段①双语数据化双写)
 * ------------------------------------------------------------------
 * 全站 5 个 CTA 的文案 / 路由 / 视觉权重集中在这里,改一处即全站生效。
 * 文案双语 { zh, en };渲染只读 .zh(英文阶段 1.5 接 next-intl 时平移,零返工)。
 *
 * ⚠️ 文案为「草案」,终稿走 Final Copy Deck + 合规复核。
 *    入口 2(project-growth)须过 lib/compliance/forbiddenWords.ts 中英禁词 + 战略 Claude 人工复读。
 * ⚠️ 风险初诊价格放 description(轻表达,Andy 定版措辞),不放 button label;不写绝对化承诺。
 * ⚠️ tone 三维降权(color / weight 驱动 颜色·尺寸·形状),配色待 Andy 最终确认(见 CtaBlock.module.css)。
 */
import type { LocalizedText, LocalizedRoute } from '@/lib/i18n/types';

export type CtaId =
  | 'risk-review'
  | 'project-growth'
  | 'ai-search-audit'
  | 'download-guide'
  | 'contact-general';

/** 对应 V2.0 前台入口;lead = Lead Magnet;general = 非漏斗兜底 */
export type CtaAudience = 'investor' | 'project-owner' | 'pro-firm' | 'lead' | 'general';

/** tone 三维 —— 颜色轴(配色待 Andy 确认) */
export type CtaColor = 'gold' | 'navy' | 'neutral';
/** tone 三维 —— 权重轴(驱动 形状[实心/描边] + 尺寸) */
export type CtaWeight = 'primary' | 'medium' | 'muted';
export type CtaTone = { color: CtaColor; weight: CtaWeight };

export type CtaLink = { label: LocalizedText; route: LocalizedRoute };

export type CtaConfig = {
  id: CtaId;
  audience: CtaAudience;
  tone: CtaTone;
  eyebrow: LocalizedText;
  title: LocalizedText;
  /** 副文案(风险初诊价格轻表达放这里) */
  description: LocalizedText;
  intent: string;
  primary: CtaLink;
  secondary?: CtaLink;
};

export const CTA_REGISTRY: Record<CtaId, CtaConfig> = {
  /* 入口 1 · 漏斗核心 · gold / primary / full —— 视觉权重最高 ---------- */
  'risk-review': {
    id: 'risk-review',
    audience: 'investor',
    tone: { color: 'gold', weight: 'primary' },
    eyebrow: { zh: '项目风险初诊 · RISK REVIEW', en: 'RISK REVIEW' },
    title: {
      zh: '在投入大额资金前,先判断项目能不能碰',
      en: 'Before committing significant capital, assess whether the project is worth pursuing'
    },
    // 价格轻表达(Andy 定版措辞,不写绝对化承诺)
    description: {
      zh: '项目初诊通常为 $1,500–$3,000,适合在投入大额资金前做一次独立风险判断。',
      en: 'Typical starting range: $1,500–$3,000, designed for investors who need an independent risk review before committing capital.'
    },
    intent: 'risk-review',
    primary: {
      label: { zh: '预约项目风险初诊', en: 'Book Project Risk Review' },
      route: { zh: '/zh/contact?intent=risk-review' }
    },
    secondary: {
      label: { zh: '了解咨询服务', en: 'Explore Advisory' },
      route: { zh: '/zh/services' }
    }
  },

  /* 入口 2 · B 端项目方 · gold / medium —— 中等权重,不与入口 1 同级 ---- */
  /* (配色 gold→navy 由 Andy 最终确认;合规最敏感,文案须过中英禁词 + 人工复读) */
  'project-growth': {
    id: 'project-growth',
    audience: 'project-owner',
    tone: { color: 'gold', weight: 'medium' },
    eyebrow: { zh: '华人市场增长 · PROJECT GROWTH', en: 'PROJECT GROWTH' },
    title: {
      zh: '帮美国房地产项目方进入华人市场',
      en: 'Help U.S. real estate project teams build trust in the Chinese-speaking market'
    },
    description: {
      zh: '为项目方建立面向华人市场的定位、内容资产、投资人教育材料与信任沟通体系,提升品牌信任与 AI 搜索可见度。',
      en: 'Help U.S. real estate project teams build Chinese-market positioning, content assets, stakeholder education, and relationship-building materials — strengthening brand trust and AI search visibility.'
    },
    intent: 'project-growth',
    primary: {
      label: { zh: '申请项目增长诊断', en: 'Request a Growth Assessment' },
      route: { zh: '/zh/contact?intent=project-growth' }
    }
  },

  /* 入口 3 · 副线专业机构 · neutral / muted —— 明显降权 ---------------- */
  'ai-search-audit': {
    id: 'ai-search-audit',
    audience: 'pro-firm',
    tone: { color: 'neutral', weight: 'muted' },
    eyebrow: { zh: 'AI 搜索可见度 · GEO AUDIT', en: 'GEO AUDIT' },
    title: {
      zh: 'AI 搜索与官网内容可见度诊断',
      en: 'AI Search and Website Content Visibility Review'
    },
    description: {
      zh: '从 SEO 与 GEO 两个维度,检查官网内容结构、关键信息与跨文化表达,提升官网在 Google 与 AI 搜索中的可见度、解释准确性与表达清晰度。',
      en: 'Review website content structure, key messaging, and cross-cultural clarity from both SEO and GEO perspectives to improve visibility, interpretability, and clarity in Google and AI search.'
    },
    intent: 'ai-search-audit',
    primary: {
      label: { zh: '预约 AI 搜索可见度诊断', en: 'Request an AI Search Visibility Review' },
      route: { zh: '/zh/contact?intent=ai-search-audit' }
    }
  },

  /* Lead Magnet · 资料下载 · neutral / muted ------------------------- */
  'download-guide': {
    id: 'download-guide',
    audience: 'lead',
    tone: { color: 'neutral', weight: 'muted' },
    eyebrow: { zh: '行业资料 · RESOURCES', en: 'RESOURCES' },
    title: {
      zh: '下载 SAREC 白皮书与行业清单',
      en: 'Download SAREC white papers and industry checklists'
    },
    description: {
      zh: '留下邮箱,获取中美房地产项目判断的深度白皮书、风险清单与实操指南。',
      en: 'Leave your email to receive in-depth white papers, risk checklists, and practical guides on judging U.S.–China real estate projects.'
    },
    intent: 'download-guide',
    primary: {
      label: { zh: '下载资料', en: 'Download the Guide' },
      // /zh/resources 为阶段②/③ 落地路由,M1 仅登记真实目标(占位,尚未上线)
      route: { zh: '/zh/resources' }
    }
  },

  /* 通用兜底 · neutral / muted -------------------------------------- */
  'contact-general': {
    id: 'contact-general',
    audience: 'general',
    tone: { color: 'neutral', weight: 'muted' },
    eyebrow: { zh: '联系 SAREC · CONTACT', en: 'CONTACT' },
    title: {
      zh: '有项目想聊?直接联系我们',
      en: 'Have a project to discuss? Get in touch'
    },
    description: {
      zh: '无论是项目判断、华人市场增长,还是 AI 搜索内容底座,告诉我们你的情况,我们会安排合适的人跟进。',
      en: "Whether it's project judgment, Chinese-market growth, or an AI search content foundation, tell us your situation and we'll have the right team member follow up."
    },
    intent: 'contact-general',
    primary: {
      label: { zh: '联系我们', en: 'Contact Us' },
      route: { zh: '/zh/contact' }
    }
  }
};

/** 按入口取默认 CTA(供上层模板 audience → CTA 自动选择,实施方案 E.3) */
export const CTA_BY_AUDIENCE: Record<CtaAudience, CtaId> = {
  investor: 'risk-review',
  'project-owner': 'project-growth',
  'pro-firm': 'ai-search-audit',
  lead: 'download-guide',
  general: 'contact-general'
};
