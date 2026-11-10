/** 名片模板目录：分类、上线批次、旧模板对照。加模板只需在 templates/ 加文件（再跑 node scripts/cardtpl-index.mjs），这里不用改。 */
import { createHash } from 'node:crypto';
import { ALL_TEMPLATES } from './templates';
import type { CardTemplate } from './types';

/** 我的名片页的分类顺序（新一批放最前） */
export const CATEGORY_ORDER = ['商务精选', '商务经典', '设计经典', '大胆款', '第一批'];

/** 1.3.1 及以前的四个模板已废，旧名字对到新模板（旧版小程序传旧名字时也能出图） */
export const LEGACY_MAP: Record<string, number> = { navy: 90, white: 91, bilingual: 102, estate: 93 };
export const DEFAULT_TEMPLATE = 90;

const byId = new Map<number, CardTemplate>(ALL_TEMPLATES.map((t) => [t.id, t]));

/** 'navy' / '90' / 't090' / 90 → 模板；不认识的返回 null */
export function findTemplate(key: unknown): CardTemplate | null {
  if (key === null || key === undefined || key === '') return null;
  const s = String(key).trim();
  if (LEGACY_MAP[s]) return byId.get(LEGACY_MAP[s]) ?? null;
  const m = /^t?0*(\d{1,3})$/.exec(s);
  return m ? byId.get(Number(m[1])) ?? null : null;
}

/** 已上线的模板（batches = 已开放到第几批，1 = 只开第一批 67–105） */
export function releasedTemplates(batches: number): CardTemplate[] {
  return ALL_TEMPLATES.filter((t) => t.batch <= batches);
}

export function catalog(batches: number) {
  const list = releasedTemplates(batches);
  return CATEGORY_ORDER.map((cat) => ({
    cat,
    items: list.filter((t) => t.cat === cat).sort((a, b) => b.id - a.id).map((t) => ({ id: t.id, name: t.name, desc: t.desc }))
  })).filter((g) => g.items.length > 0);
}

/** 模板内容指纹：改了模板，缓存的卡面图自动失效 */
export function templateHash(t: CardTemplate): string {
  return createHash('sha1').update(t.cls + t.css + t.html).digest('hex').slice(0, 12);
}

export { ALL_TEMPLATES };
