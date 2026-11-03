/**
 * 渐进式会员资料题库 V1.1 —— 系统配置（单一真源）
 * ------------------------------------------------------------------
 * 依据《SAREC 渐进式会员资料题库与触发规则表 V1.1》第二至四部分、第七部分表 7-1。
 * 改题、加选项只改本文件；规则引擎（lib/crm/engine.ts）不写死任何题目。
 * 选项值直接使用中文标签，便于后台阅读与导出。
 */

export type Layer = 'A' | 'B' | 'R' | 'C' | 'S';
export type InputKind = 'text' | 'contact' | 'single' | 'multi' | 'role' | 'month_day' | 'free_text';

/** 会被视为“未知”的回答：可占必答名额，不发分，进入待补。 */
export const UNKNOWN_OPTIONS = ['暂不方便提供', '暂不确定', '不想填写'] as const;

export type ProfileView = {
  roleCategory: string | null;
  roleSub: string | null;
  otherRoleSubs: string[];
  /** 当前有效答案（item_code → value） */
  answers: Record<string, AnswerValue | undefined>;
};

export type AnswerValue =
  | { text: string }
  | { choice: string; detail?: string }
  | { choices: string[]; detail?: string }
  | { month: number; day: number }
  | { phone?: string; email?: string }
  | { category: string; sub: string };

export type Question = {
  code: string;
  layer: Layer;
  /** 1 最先问，3 最后问 */
  priority: 1 | 2 | 3;
  prompt: string;
  input: InputKind;
  options?: string[];
  maxChoices?: number;
  /** 写入的字段名（开发对照用） */
  field: string;
  /** 动态资料确认周期（天）；null = 不再问 */
  confirmDays: number | null;
  /** 只问一次 */
  askOnce?: boolean;
  /** 出现前提；未提供 = 所有人 */
  appliesTo?: (p: ProfileView) => boolean;
};

// ── 行业分类（表 4-0）────────────────────────────────────────────────
export type RoleSub = { key: string; label: string; branches: string[]; star: string | null };
export type RoleCategory = { key: string; label: string; subs: RoleSub[] };

const G_ALL = ['G1', 'G2', 'G3', 'G4', 'G5'];
const sub = (key: string, label: string, branches: string[], star: string | null): RoleSub => ({
  key,
  label,
  branches,
  star
});

export const ROLE_CATEGORIES: RoleCategory[] = [
  {
    key: 'owner_investor',
    label: '业主与投资方',
    subs: [
      sub('owner', '自住业主', ['R01', 'R02'], 'R01'),
      sub('investor', '个人投资人', ['R11', 'R12'], 'R11'),
      sub('hnw', '高净值与家族办公室', ['R13', 'R14'], 'R13'),
      sub('institution', '机构出资方（基金、私募、信托、REIT）', ['R13', 'R14'], 'R13')
    ]
  },
  {
    key: 'developer',
    label: '开发与地产企业',
    subs: [
      sub('developer', '开发商/项目负责人', ['R21', 'R22', 'R23'], 'R21'),
      sub('re_company', '房地产公司（持有、运营）', ['R21', 'R22', 'R23'], 'R21'),
      sub('cn_developer', '中国房企与出海企业', ['R21', 'R22', 'R23', 'R24'], 'R21'),
      sub('land', '土地整合与开发', ['R21', 'R22', 'R23'], 'R21')
    ]
  },
  {
    key: 'transaction',
    label: '交易服务',
    subs: [
      sub('agent', '房地产经纪人', ['R31', 'R32'], 'R31'),
      sub('brokerage', '经纪公司负责人', ['R31', 'R32'], 'R31'),
      sub('escrow', 'Escrow 托管公司', G_ALL, 'G1'),
      sub('title', '产权保险（Title）公司', G_ALL, 'G1'),
      sub('appraiser', '估价师', G_ALL, 'G1'),
      sub('inspector', '验房师', G_ALL, 'G1'),
      sub('auction', '法拍与拍卖服务', G_ALL, 'G1')
    ]
  },
  {
    key: 'finance',
    label: '金融',
    subs: ['银行与贷款公司', '贷款经纪', '硬钱与私人贷款', '建筑贷款机构', 'EB-5 区域中心', '融资顾问与投资银行'].map(
      (label, i) => sub(`finance_${i + 1}`, label, ['R41', 'R42', 'R43', 'G4', 'G5'], 'R41')
    )
  },
  {
    key: 'insurance',
    label: '保险与财富管理',
    subs: ['房屋财产险', '建筑工程险', '人寿与年金', '财富管理与资产配置'].map((label, i) =>
      sub(`insurance_${i + 1}`, label, ['R51', 'G2', 'G4', 'G5'], 'R51')
    )
  },
  {
    key: 'design',
    label: '设计与工程',
    subs: [
      '建筑设计',
      '结构工程',
      '土木工程',
      '水电暖通（MEP）',
      '室内设计',
      '景观设计',
      '测量',
      '规划与许可代办',
      '能源与绿色建筑顾问'
    ].map((label, i) => sub(`design_${i + 1}`, label, G_ALL, 'G1'))
  },
  {
    key: 'construction',
    label: '施工与专业承包',
    subs: [
      '总承包建筑公司',
      '装修公司',
      '消防工程',
      '屋顶',
      '水电专业承包',
      '太阳能与储能',
      '绿化园林',
      '泳池',
      '拆除与土方',
      '防水与外墙',
      '智能家居与安防'
    ].map((label, i) => sub(`construction_${i + 1}`, label, G_ALL, 'G1'))
  },
  {
    key: 'supply',
    label: '建材与供应',
    subs: ['建材供应', '橱柜石材', '门窗', '家具软装', '建筑设备与机械'].map((label, i) =>
      sub(`supply_${i + 1}`, label, ['G1', 'G2', 'G4', 'G5'], 'G1')
    )
  },
  {
    key: 'operations',
    label: '运营与管理',
    subs: [
      sub('property_mgmt', '物业管理公司', ['R91', 'G2', 'G3', 'G4', 'G5'], 'R91'),
      sub('commercial_ops', '商业运营与招商', ['R92', 'G2', 'G3', 'G4', 'G5'], 'R92'),
      sub('hospitality', '酒店与短租运营', G_ALL, 'G1'),
      sub('asset_mgmt', '资产管理', G_ALL, 'G1'),
      sub('hoa', 'HOA（业主协会）管理', G_ALL, 'G1'),
      sub('cleaning', '清洁维修', G_ALL, 'G1')
    ]
  },
  {
    key: 'professional',
    label: '专业服务',
    subs: [
      sub('lawyer', '律师', ['R81', 'G2', 'G4'], 'R81'),
      sub('cpa', '会计师（CPA）', ['R81', 'G2', 'G4'], 'R81'),
      sub('tax', '税务顾问', ['R81', 'G2', 'G4'], 'R81'),
      sub('immigration', '移民顾问', ['G5', 'G2', 'G4'], 'G5'),
      sub('marketing', '房地产营销与媒体', ['G5', 'G2', 'G4'], 'G5'),
      sub('proptech', '房地产科技', ['G5', 'G2', 'G4'], 'G5'),
      sub('hr', '人力与招聘', ['G5', 'G2', 'G4'], 'G5')
    ]
  },
  {
    key: 'public',
    label: '政府、协会与教育',
    subs: ['政府与城市部门', '行业协会与商会', '学校与研究机构', '媒体'].map((label, i) =>
      sub(`public_${i + 1}`, label, ['R96'], 'R96')
    )
  },
  {
    key: 'newcomer',
    label: '学生与行业新人',
    subs: ['学生', '转行新人', '求职者'].map((label, i) => sub(`newcomer_${i + 1}`, label, ['R95'], 'R95'))
  },
  { key: 'other', label: '其他', subs: [sub('other', '其他（可填写）', [], null)] }
];

/** 首次报名页的常用角色快捷按钮（约 8 个），其余从搜索或完整分类选。 */
export const QUICK_ROLES = ['owner', 'investor', 'developer', 'agent', 'finance_1', 'insurance_3', 'construction_1', 'design_1'];

export function findRoleSub(key: string | null | undefined): (RoleSub & { category: string }) | null {
  if (!key) return null;
  for (const c of ROLE_CATEGORIES) {
    const s = c.subs.find((x) => x.key === key);
    if (s) return { ...s, category: c.key };
  }
  return null;
}

function rolesHave(p: ProfileView, code: string): boolean {
  return [p.roleSub, ...p.otherRoleSubs].some((k) => findRoleSub(k)?.branches.includes(code));
}
function anyRoleIn(p: ProfileView, keys: string[]): boolean {
  return [p.roleSub, ...p.otherRoleSubs].some((k) => !!k && keys.includes(k));
}
const branch = (code: string) => (p: ProfileView) => rolesHave(p, code);

const US_REGIONS = [
  '洛杉矶市区',
  '圣盖博谷（阿罕布拉、圣盖博、阿卡迪亚等）',
  '东区（核桃、钻石吧、罗兰岗等）',
  '橙县',
  '内陆帝国',
  '南湾',
  '北加州',
  '德州',
  '其他州',
  '暂未确定'
];
const CHINA_CITIES = ['上海', '北京', '深圳', '广州', '杭州', '成都', '香港', '台北'];

// ── 题目 ─────────────────────────────────────────────────────────────
export const QUESTIONS: Question[] = [
  // A 首次必填
  { code: 'Q01', layer: 'A', priority: 1, prompt: '怎么称呼您？', input: 'text', field: 'name', confirmDays: null },
  { code: 'Q02', layer: 'A', priority: 1, prompt: '您的手机号（或邮箱）', input: 'contact', field: 'phone/email', confirmDays: null },
  { code: 'Q03', layer: 'A', priority: 1, prompt: '您目前主要从事哪个行业？（选一个最主要的）', input: 'role', field: 'role_category/role_sub', confirmDays: 365 },

  // B 核心资料
  { code: 'Q04', layer: 'B', priority: 2, prompt: '除了主要身份，您还有哪些角色？', input: 'multi', options: ['没有其他角色'], field: 'roles_other', confirmDays: 365 },
  {
    code: 'Q05', layer: 'B', priority: 1, prompt: '您目前主要住在哪里？', input: 'single', field: 'home_region/home_city', confirmDays: 365,
    options: ['洛杉矶县', '橙县', '内陆帝国', '圣地亚哥', '北加州', '美国其他州', '中国大陆', '港澳台', '其他国家']
  },
  {
    code: 'Q06', layer: 'B', priority: 2, prompt: '您经常往返哪些城市？', input: 'multi', field: 'travel_cities/travel_freq', confirmDays: 365,
    options: ['不经常往返', ...CHINA_CITIES, '其他（可填写）']
  },
  { code: 'Q07', layer: 'B', priority: 1, prompt: '您关注或做业务的美国区域？', input: 'multi', options: US_REGIONS, field: 'focus_regions', confirmDays: 365 },
  {
    code: 'Q08', layer: 'B', priority: 1, prompt: '您最关心哪些主题？（最多 5 个）', input: 'multi', maxChoices: 5, field: 'topics', confirmDays: 365,
    options: ['ADU 加建', '地块分割与小型开发', '新建开发项目', '买房出租', '翻新转卖', '商业地产', '贷款融资', '税务与资产配置', '保险与传承', '投资移民', '中国企业出海', 'AI 与房地产科技', '物业管理', '政策法规', '其他（可填写）']
  },
  {
    code: 'Q09', layer: 'B', priority: 1, prompt: '您近期有哪些具体需求？', input: 'multi', field: 'needs/match_consent', confirmDays: 180,
    options: ['寻找投资项目', '寻找出资人或机构资金', '寻找贷款', '寻找设计或工程', '寻找施工或专业承包（消防、绿化、屋顶等）', '寻找物业管理', '寻找商业运营或招商', '买房或卖房', '交易托管与产权服务', '法律、会计或税务服务', '了解政策与项目可行性', '来美考察或设立公司', '寻找客户', '招聘人才', '学习交流、拓展人脉', '目前没有具体需求']
  },
  {
    code: 'Q10', layer: 'B', priority: 2, prompt: '您能为其他会员提供哪些服务或资源？', input: 'multi', field: 'offers', confirmDays: 365,
    options: ['个人资金', '机构资金', '项目或土地', '买卖房经纪', '交易托管与产权', '估价与验房', '贷款融资', '保险', '设计与工程', '施工与装修', '专业承包（消防、绿化、屋顶、太阳能等）', '建材供应', '物业管理', '商业运营与招商', '法律、会计、税务', '营销与科技', '中国渠道资源', '场地或活动赞助', '目前没有', '其他（可填写）']
  },
  {
    code: 'Q11', layer: 'B', priority: 2, prompt: '您目前处在哪个阶段？', input: 'single', field: 'stage', confirmDays: 180,
    options: ['刚开始了解', '正在找具体项目或客户', '已有项目在推进', '已完成多个项目，想扩大规模']
  },
  {
    code: 'Q12', layer: 'B', priority: 3, prompt: '您所在的公司和职位？', input: 'text', field: 'company/title', confirmDays: 365,
    options: ['个人/自由职业', '退休', '学生', '暂不方便提供']
  },
  {
    code: 'Q13', layer: 'B', priority: 3, prompt: '您希望我们怎么联系您？', input: 'multi', field: 'contact_channels/language', confirmDays: 365,
    options: ['微信', '电话', '短信', '邮件']
  },

  // C 扩展资料（只做选填）
  { code: 'C01', layer: 'C', priority: 3, prompt: '您的常用邮箱', input: 'text', options: ['暂不方便提供'], field: 'email', confirmDays: null },
  { code: 'C02', layer: 'C', priority: 3, prompt: '您的生日（只需月日，用于生日祝福）', input: 'month_day', options: ['不想填写'], field: 'birthday_md', confirmDays: null, askOnce: true },
  {
    code: 'C03', layer: 'C', priority: 3, prompt: '您是怎么认识商会的？', input: 'single', field: 'acquisition_source', confirmDays: null, askOnce: true,
    options: ['朋友推荐', '微信群', '公众号/视频号', '小红书或抖音', '网站搜索', '活动现场', '其他']
  },
  {
    code: 'C04', layer: 'C', priority: 3, prompt: '未来 3 个月会去中国吗？', input: 'single', field: 'trip_city/trip_month', confirmDays: 90,
    options: ['不去', '会去（选城市和大致月份）', '暂不确定'],
    appliesTo: (p) => {
      const q06 = p.answers.Q06 as { choices?: string[] } | undefined;
      const q05 = p.answers.Q05 as { choice?: string } | undefined;
      return (q06?.choices ?? []).some((c) => CHINA_CITIES.includes(c)) || (!!q05?.choice && q05.choice !== '中国大陆');
    }
  },
  {
    code: 'C05', layer: 'C', priority: 3, prompt: '您计划的单个项目投入规模大约是？（指项目投入，不是个人资产）', input: 'single', field: 'invest_budget', confirmDays: 365,
    options: ['50 万美元以下', '50–100 万', '100–300 万', '300 万以上', '暂不方便提供'],
    appliesTo: (p) => anyRoleIn(p, ['investor', 'hnw', 'institution', 'developer', 're_company', 'cn_developer', 'land'])
  },
  { code: 'C06', layer: 'C', priority: 3, prompt: '您能用哪些语言交流？', input: 'multi', options: ['普通话', '粤语', '英文', '其他'], field: 'languages', confirmDays: null, askOnce: true },

  // S 自我介绍
  { code: 'S01', layer: 'S', priority: 3, prompt: '用一句话介绍一下自己吧：做什么、在找什么、能提供什么', input: 'free_text', field: 'self_intro', confirmDays: 365 },

  // R 角色分支
  { code: 'R01', layer: 'R', priority: 2, prompt: '您的物业有考虑加建或改造吗？', input: 'single', field: 'home_upgrade_intent', confirmDays: 180, appliesTo: branch('R01'), options: ['有，一年内想做', '有，还在考虑', '没有', '不适用（租房或无物业）'] },
  { code: 'R02', layer: 'R', priority: 3, prompt: '物业类型和所在城市？', input: 'single', field: 'property_type/property_city', confirmDays: 365, appliesTo: branch('R02'), options: ['独栋', '联排', '公寓', '多户', '其他'] },
  { code: 'R11', layer: 'R', priority: 2, prompt: '您偏好哪些投资方式？', input: 'multi', field: 'invest_modes', confirmDays: 365, appliesTo: branch('R11'), options: ['买房出租', '翻新转卖', '参与开发项目出资', '商业地产', '基金或合伙', '暂未确定'] },
  { code: 'R12', layer: 'R', priority: 3, prompt: '您投资美国房地产多久了？', input: 'single', field: 'invest_years', confirmDays: 365, appliesTo: branch('R12'), options: ['还没投过', '3 年以内', '3–10 年', '10 年以上'] },
  { code: 'R13', layer: 'R', priority: 2, prompt: '您通常以什么方式出资？', input: 'multi', field: 'capital_modes', confirmDays: 365, appliesTo: branch('R13'), options: ['股权投资', '债权或贷款', '夹层或优先股', '联合开发', '作为基金出资人', '暂未确定'] },
  { code: 'R14', layer: 'R', priority: 3, prompt: '偏好的项目类型和单笔规模？', input: 'multi', field: 'capital_types/capital_ticket', confirmDays: 365, appliesTo: branch('R14'), options: ['住宅开发', '多户', '商业', '工业仓储', '酒店', '土地'] },
  { code: 'R21', layer: 'R', priority: 2, prompt: '您主要做哪类开发？', input: 'multi', field: 'dev_types', confirmDays: 365, appliesTo: branch('R21'), options: ['ADU', '地块分割（SB9 等）', '独栋新建', '多户住宅', '商业', '工业仓储', '酒店', '混合用途', '其他'] },
  { code: 'R22', layer: 'R', priority: 3, prompt: '手上项目目前在哪个阶段？', input: 'single', field: 'dev_stage', confirmDays: 180, appliesTo: branch('R22'), options: ['选地', '设计审批', '施工', '销售或出租', '暂无在手项目'] },
  { code: 'R23', layer: 'R', priority: 3, prompt: '目前最缺什么？', input: 'multi', field: 'dev_gaps', confirmDays: 180, appliesTo: branch('R23'), options: ['资金', '土地', '设计', '施工', '审批', '销售或招租渠道', '目前都不缺'] },
  { code: 'R24', layer: 'R', priority: 3, prompt: '在美国发展到了哪一步？', input: 'single', field: 'overseas_stage', confirmDays: 180, appliesTo: branch('R24'), options: ['了解阶段', '计划来美考察', '寻找项目或合作方', '正在设立美国公司', '已在美国运营'] },
  { code: 'R31', layer: 'R', priority: 2, prompt: '您参加活动主要是为了？', input: 'single', field: 'agent_purpose', confirmDays: 365, appliesTo: branch('R31'), options: ['主要为客户了解', '主要为自己投资', '两者都有'] },
  { code: 'R32', layer: 'R', priority: 3, prompt: '您主要服务哪类客户？', input: 'multi', field: 'agent_clients', confirmDays: 365, appliesTo: branch('R32'), options: ['自住买家', '投资客', '中国买家', '开发商', '卖家', '租客', '商业客户', '其他'] },
  { code: 'R41', layer: 'R', priority: 2, prompt: '您提供哪些贷款或融资产品？', input: 'multi', field: 'loan_products', confirmDays: 365, appliesTo: branch('R41'), options: ['自住房贷', '投资房贷款（按租金审批）', '硬钱短期贷', '建筑贷款', '商业贷款', '海外人士贷款', 'EB-5 融资', '股权融资安排', '其他'] },
  { code: 'R42', layer: 'R', priority: 3, prompt: '您可服务的州？', input: 'multi', field: 'loan_states', confirmDays: 365, appliesTo: branch('R42'), options: ['加州', '德州', '纽约', '佛州', '其他州', '全美'] },
  { code: 'R43', layer: 'R', priority: 3, prompt: '单笔规模和最快放款时间？', input: 'single', field: 'loan_ticket/loan_speed', confirmDays: 365, appliesTo: branch('R43'), options: ['50 万美元以下', '50–300 万', '300–2000 万', '2000 万以上'] },
  { code: 'R51', layer: 'R', priority: 2, prompt: '您主要服务哪些方向？', input: 'multi', field: 'insurance_focus', confirmDays: 365, appliesTo: branch('R51'), options: ['房屋财产险', '建筑工程险', '人寿保险', '年金', '税务规划', '信托与传承', '其他'] },
  { code: 'R81', layer: 'R', priority: 2, prompt: '您的专业领域？', input: 'multi', field: 'legal_fields', confirmDays: 365, appliesTo: branch('R81'), options: ['房产交易', '公司设立', '税务', '移民投资', '诉讼', '遗产与信托', '跨境合规', '其他'] },
  { code: 'R91', layer: 'R', priority: 2, prompt: '您管理的物业规模？', input: 'single', field: 'pm_scale', confirmDays: 365, appliesTo: branch('R91'), options: ['50 套以下', '50–500 套', '500 套以上', '以商业物业为主'] },
  { code: 'R92', layer: 'R', priority: 2, prompt: '您运营哪类商业物业？', input: 'multi', field: 'biz_ops_types', confirmDays: 365, appliesTo: branch('R92'), options: ['购物中心', '写字楼', '社区商业', '酒店', '长租公寓', '短租', '仓储物流', '其他'] },
  { code: 'R95', layer: 'R', priority: 2, prompt: '您想进入哪个方向？', input: 'multi', field: 'newcomer_direction', confirmDays: 180, appliesTo: branch('R95'), options: ['经纪', '贷款', '开发', '设计施工', '投资分析', '物业与商业运营', '还在探索'] },
  { code: 'R96', layer: 'R', priority: 2, prompt: '您希望与商会如何合作？', input: 'multi', field: 'partner_modes', confirmDays: 365, appliesTo: branch('R96'), options: ['政策交流', '联合主办活动', '人才合作', '研究合作', '媒体报道', '其他'] },
  { code: 'G1', layer: 'R', priority: 2, prompt: '您的公司主要服务哪类项目？', input: 'multi', field: 'service_project_types', confirmDays: 365, appliesTo: branch('G1'), options: ['独栋住宅', 'ADU 与小型加建', '多户住宅', '商业（零售、办公）', '工业仓储', '酒店', '公共与政府项目', '其他'] },
  { code: 'G2', layer: 'R', priority: 3, prompt: '您的服务区域？', input: 'multi', field: 'service_regions', confirmDays: 365, appliesTo: branch('G2'), options: [...US_REGIONS.filter((r) => r !== '暂未确定'), '全美', '中国'] },
  { code: 'G3', layer: 'R', priority: 3, prompt: '是否持有本行业所需执照或资质？', input: 'single', field: 'license_status', confirmDays: 365, appliesTo: branch('G3'), options: ['有执照并已投保', '有执照', '正在申请', '本行业不需要执照', '暂不方便提供'] },
  { code: 'G4', layer: 'R', priority: 3, prompt: '公司规模？', input: 'single', field: 'company_size', confirmDays: 365, appliesTo: branch('G4'), options: ['个人执业', '2–10 人', '11–50 人', '50 人以上'] },
  { code: 'G5', layer: 'R', priority: 2, prompt: '您希望通过商会获得什么？', input: 'multi', field: 'wants_from_chamber', confirmDays: 365, appliesTo: branch('G5'), options: ['项目机会', '合作伙伴', '中国客户', '美国本地客户', '招聘人才', '品牌曝光', '行业学习', '其他'] }
];

export const QUESTION_BY_CODE: Record<string, Question> = Object.fromEntries(QUESTIONS.map((q) => [q.code, q]));

/** 表 7-1：活动主题 → 加分题目 */
export const TOPIC_BOOSTS: Record<string, string[]> = {
  adu: ['R01', 'R21', 'G1', 'Q08'],
  financing: ['Q09', 'R41', 'R43', 'Q11'],
  investment: ['R11', 'R13', 'R14', 'C05', 'Q07'],
  china: ['Q06', 'C04', 'R24', 'G5'],
  wealth: ['R51', 'R81', 'Q09'],
  transaction: ['R31', 'G1', 'G2'],
  construction: ['G1', 'G3', 'R22', 'R23'],
  operations: ['R91', 'R92', 'G2', 'Q10'],
  ai: ['Q08', 'Q10', 'Q12']
};

export const TOPIC_LABELS: Record<string, string> = {
  adu: 'ADU、加建、小型开发',
  financing: '贷款融资',
  investment: '投资、项目推介',
  china: '中国企业出海、中国考察',
  wealth: '税务、保险、资产配置',
  transaction: '交易流程、托管与产权',
  construction: '设计、施工、消防与建筑规范',
  operations: '物业管理、商业运营与招商',
  ai: 'AI 与房地产科技'
};

/** 核心题：A、B 层 + 本人主角色的★题（主角色为“其他”时没有★题）。 */
export function coreCodes(p: ProfileView): string[] {
  const base = QUESTIONS.filter((q) => q.layer === 'A' || q.layer === 'B').map((q) => q.code);
  const star = findRoleSub(p.roleSub)?.star;
  return star ? [...base, star] : base;
}

export function isUnknownAnswer(v: AnswerValue | undefined): boolean {
  if (!v) return false;
  if ('choice' in v) return (UNKNOWN_OPTIONS as readonly string[]).includes(v.choice);
  if ('choices' in v) return v.choices.length > 0 && v.choices.every((c) => (UNKNOWN_OPTIONS as readonly string[]).includes(c));
  if ('text' in v) return (UNKNOWN_OPTIONS as readonly string[]).includes(v.text.trim());
  return false;
}
