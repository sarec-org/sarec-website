/** 指令 84：「AI 生成」标识的服务器设置（活动海报 poster.png、祝福 render.png 共用；后台「海报模板」页能改） */
import { getPool } from '@/lib/db/client';
import { getSetting } from '@/lib/crm/orders';
import type { Db } from '@/lib/crm/profile';

/**
 * 指令 84「AI 生成」标识（服务器控制）：crm_settings.ai_badge = { on, size（标识宽 / 画面宽）, opacity }，没有这条 = 默认值。
 * on=false 不画（以后规则松了后台一关就没有，不用发版）。size 限 0.04–0.10、opacity 限 0.2–1。
 */
export const AI_BADGE_KEY = 'ai_badge';
export type AiBadgeCfg = { on: boolean; size: number; opacity: number };
export const AI_BADGE_DEFAULT: AiBadgeCfg = { on: true, size: 0.07, opacity: 0.55 };
const clamp = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
export function normalizeAiBadge(v: unknown): AiBadgeCfg {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  return { on: o.on !== false, size: clamp(o.size, 0.04, 0.1, AI_BADGE_DEFAULT.size), opacity: clamp(o.opacity, 0.2, 1, AI_BADGE_DEFAULT.opacity) };
}
export async function aiBadgeConfig(db: Db = getPool()): Promise<AiBadgeCfg> {
  return normalizeAiBadge(await getSetting<unknown>(db, AI_BADGE_KEY, null).catch(() => null));
}
