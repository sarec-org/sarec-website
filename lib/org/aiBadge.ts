/** 指令 84：「AI 生成」标识的服务器设置（活动海报 poster.png、祝福 render.png 共用；后台「海报模板」页能改） */
import { getPool } from '@/lib/db/client';
import { getSetting } from '@/lib/crm/orders';
import type { Db } from '@/lib/crm/profile';

/**
 * 「AI 生成」显式标识（服务器控制）：crm_settings.ai_badge = { on, textH, opacity }，没有这条 = 默认值。
 * 国家标准 GB 45438-2025 第 5.2 条：图片显式标识文字高度不低于画面最短边的 5%、位于边缘或角落、字体清晰可辨。
 * - textH：最矮的字（「AI」的大写字母）实际字形高度 / 画面最短边，限 0.05–0.08（0.05 是国标下限，卡死不许调低）。旧的 size 字段不认。
 * - opacity：底板深浅（字比底板实），限 0.2–1。
 * - on=false 不画（国标要求保留；关掉需商会确认法律风险）。
 */
export const AI_BADGE_KEY = 'ai_badge';
export type AiBadgeCfg = { on: boolean; textH: number; opacity: number };
export const AI_BADGE_DEFAULT: AiBadgeCfg = { on: true, textH: 0.05, opacity: 0.55 };
export const TEXT_H_MIN = 0.05;
export const TEXT_H_MAX = 0.08;
const clamp = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
export function normalizeAiBadge(v: unknown): AiBadgeCfg {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  return { on: o.on !== false, textH: clamp(o.textH, TEXT_H_MIN, TEXT_H_MAX, AI_BADGE_DEFAULT.textH), opacity: clamp(o.opacity, 0.2, 1, AI_BADGE_DEFAULT.opacity) };
}
export async function aiBadgeConfig(db: Db = getPool()): Promise<AiBadgeCfg> {
  return normalizeAiBadge(await getSetting<unknown>(db, AI_BADGE_KEY, null).catch(() => null));
}

/**
 * 标识尺寸（像素）。NotoSansSC-Bold 实测：字号 100 时「AI」字形高 74px、「生成」95px、「AI 生成」整行宽 317px。
 * 按最矮的「AI」算字号：fs = ceil(textH × 最短边 / 0.74)，所以每个字的字形高度都 ≥ textH × 最短边。
 */
export const CAP_RATIO = 0.74;
export function badgeGeom(cfg: AiBadgeCfg, w: number, h: number) {
  const short = Math.min(w, h);
  const fs = Math.ceil((cfg.textH * short) / CAP_RATIO);
  const bw = Math.ceil(fs * 3.17 + fs * 0.6);
  const bh = Math.ceil(fs * 1.3);
  const m = Math.round(short * 0.015);
  return { fs, bw, bh, m, minGlyph: Math.round(fs * CAP_RATIO), cjkGlyph: Math.round(fs * 0.95) };
}
/** 标识占的右上角区域（0–1，信息位 / 落款位碰到要往下让） */
export function badgeZone(cfg: AiBadgeCfg, w: number, h: number) {
  if (!cfg.on) return { x0: 1, y1: 0 };
  const g = badgeGeom(cfg, w, h);
  return { x0: 1 - (g.bw + g.m * 2) / w, y1: (g.bh + g.m * 2) / h };
}
