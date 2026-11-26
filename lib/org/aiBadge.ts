/** 指令 84：「AI 生成」标识的服务器设置（活动海报 poster.png、祝福 render.png 共用；后台「海报模板」页能改） */
import { getPool } from '@/lib/db/client';
import { getSetting } from '@/lib/crm/orders';
import type { Db } from '@/lib/crm/profile';

/**
 * 「AI 生成」显式标识（服务器控制）：crm_settings.ai_badge = { on, textH, opacity }，没有这条 = 默认值。
 * 国家标准 GB 45438-2025 第 5.2 条：图片显式标识文字高度不低于画面最短边的 5%、位于边缘或角落、字体清晰可辨。
 * - textH：最矮的字（「AI」的大写字母）实际字形高度 / 画面最短边，限 0.05–0.08（0.05 是国标下限，卡死不许调低）。旧的 size 字段不认。
 * - opacity：底板深浅（字比底板实），限 0.2–1。
 * - style / pos 见下；每张模板还能用 poster_templates.badge_pos 单独指定位置。
 * - on=false 不画（国标要求保留；关掉需商会确认法律风险）。
 */
export const AI_BADGE_KEY = 'ai_badge';
/** 样式：plaque 圆角小牌（底色从角落取色）/ seal 细金边小章 / strip 贴在落款条、信息栏右端下方，和条子一体 */
export const BADGE_STYLES = ['plaque', 'seal', 'strip'] as const;
export type BadgeStyle = (typeof BADGE_STYLES)[number];
/** 位置：只能在边或角（国标）。strip = 落款条 / 信息栏右端的底边；没有条子退回右下角 */
export const BADGE_PLACES = ['tr', 'tl', 'br', 'bl', 'strip'] as const;
export type BadgePlace = (typeof BADGE_PLACES)[number];
export type AiBadgeCfg = { on: boolean; textH: number; opacity: number; style: BadgeStyle; pos: Exclude<BadgePlace, 'strip'> };
export const AI_BADGE_DEFAULT: AiBadgeCfg = { on: true, textH: 0.05, opacity: 0.55, style: 'seal', pos: 'tr' };
export const TEXT_H_MIN = 0.05;
export const TEXT_H_MAX = 0.08;
const clamp = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
export const isPlace = (v: unknown): v is BadgePlace => typeof v === 'string' && (BADGE_PLACES as readonly string[]).includes(v);
export function normalizeAiBadge(v: unknown): AiBadgeCfg {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  const style = typeof o.style === 'string' && (BADGE_STYLES as readonly string[]).includes(o.style) ? (o.style as BadgeStyle) : AI_BADGE_DEFAULT.style;
  const pos = o.pos === 'tl' || o.pos === 'br' || o.pos === 'bl' || o.pos === 'tr' ? o.pos : AI_BADGE_DEFAULT.pos;
  return { on: o.on !== false, textH: clamp(o.textH, TEXT_H_MIN, TEXT_H_MAX, AI_BADGE_DEFAULT.textH), opacity: clamp(o.opacity, 0.2, 1, AI_BADGE_DEFAULT.opacity), style, pos };
}
export async function aiBadgeConfig(db: Db = getPool()): Promise<AiBadgeCfg> {
  return normalizeAiBadge(await getSetting<unknown>(db, AI_BADGE_KEY, null).catch(() => null));
}
/** 这张图实际用哪个位置：模板自己配的 badge_pos 优先；否则全局（style=strip 时是 strip，否则 pos） */
export function placeFor(cfg: AiBadgeCfg, tplPos: unknown): BadgePlace {
  if (isPlace(tplPos)) return tplPos;
  return cfg.style === 'strip' ? 'strip' : cfg.pos;
}

/**
 * 标识尺寸（像素）。字只写「AI生成」。NotoSansSC-Bold 实测（字号 100）：「AI」字形高 74px、「生成」94px、「AI生成」宽 294px。
 * 按最矮的「AI」算字号：fs = ceil(textH × 最短边 / 0.74)，每个字的字形高度都 ≥ textH × 最短边。
 */
export const CAP_RATIO = 0.74;
export function badgeGeom(cfg: AiBadgeCfg, w: number, h: number) {
  const short = Math.min(w, h);
  const fs = Math.ceil((cfg.textH * short) / CAP_RATIO);
  const padX = Math.round(fs * 0.34);
  const bw = Math.ceil(fs * 2.94) + padX * 2;
  const bh = Math.round(fs * 1.3);
  const m = Math.round(short * 0.015);
  return { fs, bw, bh, m, padX, minGlyph: Math.round(fs * CAP_RATIO), cjkGlyph: Math.round(fs * 0.94) };
}
