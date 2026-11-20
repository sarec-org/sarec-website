/**
 * 找工人 · 接活：固定文字和选项。界面上给人看的字都在这里，scripts/check-jobs-words.ts 会扫。
 */
export type ProRole = 'company' | 'licensed' | 'pro_service' | 'worker';
export type PosterRole = 'owner' | 'landlord' | 'property' | 'developer' | 'crew';
export type Timing = 'asap' | 'week' | 'month' | 'flexible';
export type PostStatus = 'open' | 'found' | 'closed' | 'removed';
export type ProStatus = 'draft' | 'pending' | 'verified' | 'returned' | 'removed';

export const PRO_ROLES: { key: ProRole; label: string }[] = [
  { key: 'company', label: '施工队或公司' },
  { key: 'licensed', label: '持牌师傅' },
  { key: 'pro_service', label: '设计与专业服务' },
  { key: 'worker', label: '工人' }
];
export const POSTER_ROLES: { key: PosterRole; label: string }[] = [
  { key: 'owner', label: '房主' },
  { key: 'landlord', label: '房东' },
  { key: 'property', label: '物业' },
  { key: 'developer', label: '开发商' },
  { key: 'crew', label: '施工队（招工人）' }
];
export const TIMINGS: { key: Timing; label: string }[] = [
  { key: 'asap', label: '尽快' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'flexible', label: '可商量' }
];
export const PROPERTY_TYPES = [
  { key: 'house', label: '独栋' },
  { key: 'condo', label: '公寓' },
  { key: 'commercial', label: '商业' }
];
export const STATUS_LABEL: Record<PostStatus, string> = { open: '找人中', found: '已找到', closed: '已关闭', removed: '已下架' };
export const PRO_STATUS_LABEL: Record<ProStatus, string> = { draft: '还没提交', pending: '核验中', verified: '核验通过', returned: '已退回', removed: '已下架' };

export const roleLabel = (r: string) => PRO_ROLES.find((x) => x.key === r)?.label ?? r;
export const posterLabel = (r: string) => POSTER_ROLES.find((x) => x.key === r)?.label ?? r;
export const timingLabel = (t: string) => TIMINGS.find((x) => x.key === t)?.label ?? t;

/** 退租整修：一键预选的工种（可增减），按工种拆成几条活儿 */
export const TURNOVER_TRADES = ['cleaning', 'handyman', 'painting', 'gardening'];
/** 装修、加建类：多一个勾选“想先找人看现场” */
export const SITE_VISIT_TRADES = ['kitchen_bath', 'remodel', 'adu', 'general', 'roofing', 'flooring', 'specialty_sub', 'solar', 'landscape', 'hardscape'];

/** 服务城市（点选；先覆盖商会会员集中的地区） */
export const CITY_GROUPS: { region: string; cities: string[] }[] = [
  {
    region: '洛杉矶/橙县',
    cities: ['洛杉矶', '阿凯迪亚', '圣盖博', '阿罕布拉', '天普市', '蒙特利公园', '圣马力诺', '帕萨迪纳', '核桃市', '钻石吧', '罗兰岗', '哈岗', '奇诺岗', '尔湾', '橙县其他', '托伦斯', '洛杉矶其他']
  },
  { region: '旧金山湾区', cities: ['旧金山', '圣荷西', '库比蒂诺', '弗里蒙特', '奥克兰', '湾区其他'] },
  { region: '加州其他', cities: ['圣地亚哥', '河滨县', '圣贝纳迪诺县', '加州其他'] }
];
export const ALL_CITIES = CITY_GROUPS.flatMap((g) => g.cities);

export const LANGUAGES = ['普通话', '粤语', '英语', '西班牙语', '其他'];

/** 登记时必须勾选同意的规则 */
export const RULES = [
  '只在自己的执照范围内接活。',
  '登记的资料真实，有变化及时更新。',
  '自己与发布人签约、收款，商会不参与合同与付款。',
  '如有投诉或资质失效，商会可以把我的资料下架。'
];

/** 统一声明（D8） */
export const DISCLAIMER = '商会仅提供信息展示与转达，不参与合同与付款，不承接工程，不担保施工或服务质量；缴纳会费不保证接到活儿。';

export const CLOSED_TEXT = '这个功能还没开放';
export const STAFF_PREVIEW_TEXT = '仅工作人员可见：开关未开';

export const POST_DAYS = 14;
export const REMIND_BEFORE_DAYS = 2; // 第 12 天提醒续期
export const FOLLOWUP_DAY = 7;
export const REVIEW_DAYS = 90;
export const BATCH_SIZE = 20; // 每一批通知多少人
export const SECOND_BATCH_HOURS = 24;

export const WEB_JOBS_PATH = '/zh/jobs';
export function webBase(): string {
  // 测试站发出去的链接指回测试站
  if (process.env.VERCEL_ENV === 'preview') return 'https://sarec-crm-preview.vercel.app';
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://sinoamericanrec.org').replace(/\/$/, '');
}
