/**
 * SAREC CMS V2 —— 枚举 value → 中文展示 label 的唯一映射。
 * ------------------------------------------------------------------
 * 与 keystatic.config.ts 的 select / multiselect options 保持逐字一致。
 * 前台一律经此映射取中文,渲染层不留自由文本入口(合规要求:
 * 角色 / 类型 / 级别等文案由枚举锁死,编辑不可自定义)。
 */
import type {
  EventStatus,
  MemberRole,
  NewsCategory,
  ProjectRegion,
  ProjectStage,
  ProjectTag,
  ProjectType,
  RegistrationStatus,
} from './types';

export const NEWS_CATEGORY_LABEL: Record<NewsCategory, string> = {
  'chamber-news': '商会新闻',
  'member-update': '会员动态',
  'partnership-progress': '合作进展',
};

/** 聚合页新闻流的展示层筛选值:活动回顾不是 news 分类,数据来自 events。 */
export const RECAP_FILTER_VALUE = 'event-recap';
export const RECAP_FILTER_LABEL = '活动回顾';

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  scheduled: '预告',
  completed: '回顾',
  postponed: '已延期',
  cancelled: '已取消',
};

export const REGISTRATION_STATUS_LABEL: Record<RegistrationStatus, string> = {
  notOpen: '报名尚未开放',
  open: '报名中',
  closed: '报名已截止',
  full: '名额已满',
};

export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  'ed1-affordable': '经济适用房开发(ED1)',
  'boutique-apartment': '精品公寓项目',
  'cross-border-equity': '跨境股权合作项目',
  other: '其他',
};

export const PROJECT_REGION_LABEL: Record<ProjectRegion, string> = {
  'los-angeles': '洛杉矶',
  'socal-other': '南加州其他地区',
  'california-other': '加州其他地区',
  'us-other': '美国其他地区',
};

export const PROJECT_STAGE_LABEL: Record<ProjectStage, string> = {
  'pre-development': '前期评估',
  entitlement: '审批中',
  construction: '建设中',
  operating: '在管',
  completed: '已完成',
};

export const PROJECT_TAG_LABEL: Record<ProjectTag, string> = {
  'sarec-involved': 'SAREC参与',
  'member-submitted': '会员提交',
  'case-study': '案例研究',
};

export const SAREC_ROLE_LABEL: Record<string, string> = {
  'policy-structure': '政策结构判断',
  'project-screening': '项目筛选',
  'project-partnership': '项目合作',
  'structure-design': '结构设计',
  'legal-structure-design': '法律结构设计',
  'capital-structure-advisory': '资本结构咨询',
  'compliance-advisory': '合规咨询',
  'risk-assessment': '风险评估',
  'investor-communication': '投资人沟通',
};

export const MEMBER_ROLE_LABEL: Record<MemberRole, string> = {
  development: '开发',
  lending: '贷款',
  construction: '建筑',
  legal: '法律',
  accounting: '会计',
  brokerage: '经纪',
  other: '其他',
};

/** 时区展示后缀(前台在时间旁标出,避免跨时区读者误读)。 */
export const TIMEZONE_LABEL: Record<string, string> = {
  'America/Los_Angeles': '美西时间',
  'America/New_York': '美东时间',
  'Asia/Shanghai': '北京时间',
};
