/**
 * 指令 31（东哥 11/22）：从某个工种方块进来，登记页就是"这个工种的登记页"——只出和这个工种有关的身份选项和字段。
 * 指令 33（东哥 11/22）："该统一的统一"：只按这个工种要不要州执照分两套，不再按组另起一套——
 *   lic（要执照：A 加州承包商牌照、B 其他州执照，含建筑设计、结构、测量、物业管理、估价、搬家、律师、会计、保险）＝电工那套：
 *       一句"这一行要有执照，填上××"＋「我自己有执照」/「我们是有执照的公司或××」（××按这一行的叫法）＋执照号；A 类另有一行不起眼的帮工小字。
 *   nolic（不要州执照：C 类，如清洁保洁、室内设计、房屋检查、房产摄影）＝家政那套：「我一个人做」/「我有团队或公司」，不出执照号。
 * 只是前面这一页按工种裁剪；资质规则（lib/jobs/pros.ts qualificationError）、提交的数据一个字不变——
 *   设计与专业服务、房产服务、法律财税保险这几组里，两个按钮提交的身份都还是原来的「设计与专业服务」（pro_service），只是名称一栏叫法跟着变；
 *   其余工种照旧：持牌师傅 / 施工队或公司 / 工人。小程序 utils/jobs.js tradeFocus 同一份。
 */
import type { Meta, ProRole } from './types';

const PRO_GROUPS = ['design', 'property', 'legal'];
/** 按工种进来时每种身份能选的工种（资质类型）：两端统一用这一份 */
const FOCUS_LIC: Record<ProRole, string[]> = { company: ['A', 'B'], licensed: ['A', 'B'], pro_service: ['B', 'C'], worker: ['A', 'C'] };
export const focusAllows = (role: ProRole | '', licType: string) => !!role && FOCUS_LIC[role].includes(licType);

/** 要执照的工种填哪种执照（按 找工人接活_资质表核实.md 主表"发证机构 / 牌照类别"写的大白话）；没列的 B 类说"执照号" */
const LIC_NAME: Record<string, string> = {
  pest: '结构害虫控制执照号（SPCB）', locksmith: '锁匠公司执照号（BSIS，LCO 开头）', appliance_repair: '家电维修登记号（BHGS，A 开头）',
  architect: '加州建筑师执照号（CAB）', engineer: '加州工程师执照号（BPELSG：土木 C、结构 S、岩土 GE）', surveyor: '加州土地测量师执照号（BPELSG）',
  property_mgmt: '加州房地产经纪执照号（DRE）', appraiser: '加州估价师执照号（BREA）', movers: '搬家许可 Cal-T 号（BHGS）',
  lawyer: '加州律师号（State Bar）', tax: 'CPA 执照号、IRS 注册代理人（EA）号或 CTEC 报税员号', insurance: '加州保险执照号（CDI）'
};
/** 一组入口（「设计」方块）进来时，这一组要执照的不止一种，合起来说 */
const GROUP_LIC_NAME: Record<string, string> = { design: '执照号（建筑设计填加州建筑师执照，结构、土木、测量填加州工程师或测量师执照）' };
/** PRO_GROUPS 这几组的人在列表上显示「设计与专业服务」，两个按钮都提交这个身份；"公司"按这一行的叫法 */
const FIRM_WORD: Record<string, string> = { design: '公司或事务所', property: '公司', legal: '事务所或公司' };

/** key＝页面上的按钮；role＝提交的身份（设计等几组两个按钮都是 pro_service）；firm＝名称一栏填公司名 */
export type FocusChoice = { key: string; role: ProRole; label: string; sub: string; firm: boolean };
export type TradeFocus = {
  trade: string;
  tradeName: string;
  group: string;
  licType: 'A' | 'B' | 'C';
  label: string;
  kind: 'nolic' | 'lic';
  pro: boolean;
  firmWord: string;
  choices: FocusChoice[];
  helper: FocusChoice | null;
  def: string;
  licName: string;
  noLicNote: string;
};

export function tradeFocus(meta: Meta, tradeKey: string, groupKey?: string | null): TradeFocus | null {
  const t = meta.trades.find((x) => x.key === tradeKey && (x.open || meta.staffPreview));
  if (!t) return null;
  const entries = meta.workEntries?.length ? meta.workEntries : meta.homeEntries;
  const byTrade = entries.find((e) => e.target.type === 'trade' && e.target.key === t.key);
  const fromGroup = !!groupKey && groupKey === t.group;
  const byGroup = fromGroup ? entries.find((e) => e.target.type === 'group' && e.target.key === groupKey) : undefined;
  const g = meta.groups.find((x) => x.key === t.group);
  const label = byTrade?.label || byGroup?.label || (fromGroup && g?.name) || t.name;
  const kind = t.licType === 'C' ? 'nolic' : 'lic';
  const pro = PRO_GROUPS.includes(t.group);
  const firm = FIRM_WORD[t.group] ?? '';
  let choices: FocusChoice[];
  let helper: FocusChoice | null = null;
  if (kind === 'nolic') {
    choices = pro
      ? [
          { key: 'solo', role: 'pro_service', label: '我一个人做', sub: '交市或县的营业登记或 DBA', firm: false },
          { key: 'team', role: 'pro_service', label: '我有团队或公司', sub: '交公司的营业登记', firm: true }
        ]
      : [
          { key: 'worker', role: 'worker', label: '我一个人做', sub: '免费登记，不用交资料', firm: false },
          { key: 'pro_service', role: 'pro_service', label: '我有团队或公司', sub: '交一张营业登记，核验后找人的人能直接看到你', firm: true }
        ];
  } else {
    choices = pro
      ? [
          { key: 'self', role: 'pro_service', label: '我自己有执照', sub: '', firm: false },
          { key: 'firm', role: 'pro_service', label: `我们是有执照的${firm}`, sub: '', firm: true }
        ]
      : [
          { key: 'licensed', role: 'licensed', label: '我自己有执照', sub: '', firm: false },
          { key: 'company', role: 'company', label: t.licType === 'A' ? '我们是有执照的公司或施工队' : '我们是有执照的公司', sub: '', firm: true }
        ];
    if (t.licType === 'A') helper = { key: 'worker', role: 'worker', label: '没有执照，跟着师傅或施工队干活', sub: '', firm: false };
  }
  const licName = t.licType === 'A' ? '加州承包商牌照号（CSLB）' : (fromGroup && GROUP_LIC_NAME[t.group]) || LIC_NAME[t.key] || '执照号';
  // 同一组里不需要州执照的细项（如设计组的室内设计、房屋检查），如实说一句
  const noLic = kind === 'lic' && pro ? meta.trades.filter((x) => x.group === t.group && x.licType === 'C' && (x.open || meta.staffPreview)).map((x) => x.name) : [];
  return {
    trade: t.key, tradeName: t.name, group: t.group, licType: t.licType, label, kind, pro, firmWord: firm, choices, helper, def: choices[0].key,
    licName, noLicNote: noLic.length ? `${noLic.join('、')}不需要州执照：只做这几样的，勾上它们、去掉要执照的那几项，改交营业登记就行。` : ''
  };
}

const allChoices = (fc: TradeFocus) => (fc.helper ? [...fc.choices, fc.helper] : fc.choices);
/** 身份值（role）→ 页面上哪个按钮（已登记过 / 会员资料里的身份说得通就用它） */
export const focusPickFor = (fc: TradeFocus, role: unknown) => allChoices(fc).find((c) => c.role === role) ?? null;
export const focusChoice = (fc: TradeFocus, key: string) => allChoices(fc).find((c) => c.key === key) ?? null;

/** 页面顶上的一句大白话（跟着身份变） */
export function focusIntro(fc: TradeFocus, role: ProRole | '', choice?: FocusChoice | null): string {
  if (fc.kind === 'nolic') {
    // V16-3：按选中的按钮说（室内设计等两个按钮提交的身份一样，不能只看身份）
    if (choice ? !choice.firm && choice.role === 'worker' : role === 'worker') return `一个人做${fc.label}的，免费登记，不用交资料；有人在商会网站招${fc.label}帮手时，对口的会通知你。`;
    if (choice && !choice.firm) return `一个人做${fc.label}的，交一张市或县的营业登记或 DBA，工作人员核对后，找${fc.label}的人就能看到你。`;
    return `有团队或公司的，交一张营业登记，工作人员核对后，找${fc.label}的人就能看到你。`;
  }
  return role === 'worker'
    ? '没有执照的，可以免费登记，跟着有执照的师傅或施工队干活；房主直接发的活儿要有执照的人才能接。'
    : `${fc.label}这一行要有执照。填上${fc.licName}，${fc.licType === 'A' ? '系统自动去官网核对' : '工作人员到发证机构官网核对'}，通过后找${fc.label}的人就能看到你。`;
}
