/**
 * 指令 31（东哥 11/22）：从某个工种方块进来，登记页就是"这个工种的登记页"——只出和这个工种有关的身份选项和字段。
 * 只是前面这一页按工种裁剪；资质规则（lib/jobs/pros.ts qualificationError）、提交的数据一个字不变。小程序 utils/jobs.js tradeFocus 同一份。
 *   pro：设计与专业服务、房产服务、法律财税保险这几组 → 身份就是「设计与专业服务」，整排不出；
 *   nolic：不需要州执照的（C 类，如清洁保洁）→「我一个人做」（工人：免费、不交资料）/「我有团队或公司」（设计与专业服务：交营业登记）；
 *   lic：要执照的（A、B 类）→「我自己有执照」（持牌师傅）/「我们是有执照的公司或施工队」（施工队或公司）；A 类另有一行不起眼的「跟着师傅或施工队干活」（工人）。
 */
import type { Meta, ProRole } from './types';

const PRO_GROUPS = ['design', 'property', 'legal'];
/** 按工种进来时每种身份能选的工种（资质类型）：两端统一用这一份 */
const FOCUS_LIC: Record<ProRole, string[]> = { company: ['A', 'B'], licensed: ['A', 'B'], pro_service: ['B', 'C'], worker: ['A', 'C'] };
export const focusAllows = (role: ProRole | '', licType: string) => !!role && FOCUS_LIC[role].includes(licType);

export type FocusChoice = { key: ProRole; label: string; sub: string };
export type TradeFocus = {
  trade: string;
  tradeName: string;
  group: string;
  licType: 'A' | 'B' | 'C';
  label: string;
  kind: 'pro' | 'nolic' | 'lic';
  choices: FocusChoice[];
  helper: FocusChoice | null;
  def: ProRole;
};

export function tradeFocus(meta: Meta, tradeKey: string, groupKey?: string | null): TradeFocus | null {
  const t = meta.trades.find((x) => x.key === tradeKey && (x.open || meta.staffPreview));
  if (!t) return null;
  const entries = meta.workEntries?.length ? meta.workEntries : meta.homeEntries;
  const byTrade = entries.find((e) => e.target.type === 'trade' && e.target.key === t.key);
  const byGroup = groupKey && groupKey === t.group ? entries.find((e) => e.target.type === 'group' && e.target.key === groupKey) : undefined;
  const g = meta.groups.find((x) => x.key === t.group);
  const label = byTrade?.label || byGroup?.label || (groupKey && groupKey === t.group && g?.name) || t.name;
  const kind = PRO_GROUPS.includes(t.group) ? 'pro' : t.licType === 'C' ? 'nolic' : 'lic';
  let choices: FocusChoice[];
  let helper: FocusChoice | null = null;
  if (kind === 'pro') choices = [{ key: 'pro_service', label: '设计与专业服务', sub: '' }];
  else if (kind === 'nolic') {
    choices = [
      { key: 'worker', label: '我一个人做', sub: '免费登记，不用交资料' },
      { key: 'pro_service', label: '我有团队或公司', sub: '交一张营业登记，核验后找人的人能直接看到你' }
    ];
  } else {
    choices = [
      { key: 'licensed', label: '我自己有执照', sub: '' },
      { key: 'company', label: '我们是有执照的公司或施工队', sub: '' }
    ];
    if (t.licType === 'A') helper = { key: 'worker', label: '没有执照，跟着师傅或施工队干活', sub: '' };
  }
  return { trade: t.key, tradeName: t.name, group: t.group, licType: t.licType, label, kind, choices, helper, def: choices[0].key };
}

/** 页面顶上的一句大白话（跟着身份变） */
export function focusIntro(fc: TradeFocus, role: ProRole | ''): string {
  if (fc.kind === 'nolic') {
    return role === 'worker'
      ? `${fc.label}不需要州执照。一个人做的免费登记，不用交资料；有人在商会网站招${fc.label}帮手时，对口的会通知你。`
      : `${fc.label}不需要州执照。交一张营业登记，工作人员核对后，找${fc.label}的人就能看到你。`;
  }
  if (fc.kind === 'lic') {
    return role === 'worker'
      ? '没有执照的，可以免费登记，跟着有执照的师傅或施工队干活；房主直接发的活儿要有执照的人才能接。'
      : `${fc.label}这一行要有执照。${fc.licType === 'A' ? '填上加州承包商牌照号（CSLB），系统自动去官网核对' : '填上执照号，工作人员到发证机构官网核对'}，通过后找${fc.label}的人就能看到你。`;
  }
  return `填上执照号或营业登记，工作人员核对后，找${fc.label}的人就能看到你。`;
}
