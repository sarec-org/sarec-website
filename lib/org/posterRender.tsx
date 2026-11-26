/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text -- 这里的 <img> 是给 next/og 出图用的，不是网页 */
/**
 * 1.7.0 模板海报成品图（GET /api/v1/org/events/<id>/poster.png）。
 * ------------------------------------------------------------------
 * - 底图 = 模板大图（1080×1620）；活动名称、日期星期时间、地点（地点名＋地址）、主办方、右侧报名码＋「长按识别报名」排在模板的信息位（box）里。
 * - 有 box（重做过关的模板）：字直接印在信息位上，字色用模板 ink，没有就按信息位底色深浅自动选深 / 浅。
 * - 没 box（第一批老图）：默认信息位 [0.06, 0.70, 0.94, 0.95]，下面垫一块半透明深色圆角底板，白字。
 * - 「AI生成」标识（指令 84/88，国标 GB 45438-2025：边或角、字高 ≥ 最短边 5%）：crm_settings.ai_badge 管样式 / 位置 / 字高，模板 badge_pos 可单独指定位置；
 *   信息位碰到标识会自动让开，任何字都不盖住它（planBadge）。
 * - 字体 NotoSansSC-Bold（SIL OFL，授权文本 lib/org/fonts/NotoSansSC_OFL.txt），next.config.js 的 outputFileTracingIncludes 把它打进函数包。
 * - 「传自己的海报」（posterOwn）：原图铺满宽度，底部接一条白色报名条（活动名、时间、地点、主办方、报名码）；
 *   上传时说是 AI 生成的（ai_generated）才画右上角「AI 生成」标识，不是就不画。
 * - 报名码用 posterData 同一个：codePng(code, 'register')（测试站没配微信时是测试码，照样画）。
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { getPool } from '@/lib/db/client';
import { AI_BADGE_DEFAULT, aiBadgeConfig, badgeGeom, placeFor, type AiBadgeCfg, type BadgePlace } from './aiBadge';
import { CrmError } from '@/lib/crm/events';
import { codePng, eventAccess, whenText } from './service';
import { DEFAULT_BOX, LARGE, fetchTemplateImage, getTemplate } from './posterTemplates';
import { getOwnPoster, ownPosterBlocked } from './posterOwn';

const W = LARGE.w;
const H = LARGE.h;

export { AI_BADGE_DEFAULT, AI_BADGE_KEY, aiBadgeConfig, badgeGeom, normalizeAiBadge, placeFor, type AiBadgeCfg, type BadgePlace } from './aiBadge';


let fontCache: Promise<Buffer> | null = null;
export function font(): Promise<Buffer> {
  if (!fontCache) {
    fontCache = readFile(path.join(process.cwd(), 'lib/org/fonts/NotoSansSC-Bold.otf')).catch((e) => {
      fontCache = null;
      throw e;
    });
  }
  return fontCache;
}

/** 去掉表情符号等字体里没有的字（避免出图时去网上找字体） */
const EMOJI = new RegExp('[\\p{Extended_Pictographic}\\u{FE0F}\\u{200D}]', 'gu');
export const clean = (s: string | null | undefined) => String(s ?? '').replace(EMOJI, '').replace(/\s+/g, ' ').trim();

/** 估算一行字的宽度（中文 / 全角 1em；英文小写和数字约 0.62em、大写 0.74em、空格 0.28em、半角标点 0.36em——宁宽勿窄） */
export function textWidth(s: string, size: number): number {
  let w = 0;
  for (const ch of s) {
    if (ch === ' ') w += 0.28;
    else if (/[A-Z]/.test(ch)) w += 0.74;
    else if (/[a-z0-9]/.test(ch)) w += 0.62;
    else if (/[\u0021-\u007e\u00b7\u2013\u2014]/.test(ch)) w += 0.36;
    else w += 1;
  }
  return w * size;
}
/** 每一行固定行高（satori 按字体自身的上下高度排行，lineHeight 小于它时不生效；固定高度才和估算一致） */
export const ln = (size: number, k: number) => ({ height: Math.round(size * k), lineHeight: `${Math.round(size * k)}px`, display: 'flex' as const, alignItems: 'center' as const, overflow: 'hidden' as const });
/** 按宽度断行（最多 n 行，放不下的最后一行末尾加「…」） */
export function wrap(s: string, size: number, width: number, n: number): string[] {
  const chars = Array.from(s);
  const lines: string[] = [];
  let cur = '';
  let i = 0;
  for (; i < chars.length && lines.length < n; i++) {
    const ch = chars[i];
    if (cur && textWidth(cur + ch, size) > width) {
      // 英文单词不从中间断：往回找最近的空格（只在最后 14 个字以内找）
      const sp = cur.lastIndexOf(' ');
      if (/[A-Za-z0-9]/.test(ch) && sp > 0 && cur.length - sp <= 14) {
        lines.push(cur.slice(0, sp));
        cur = cur.slice(sp + 1) + ch;
      } else {
        lines.push(cur);
        cur = ch === ' ' ? '' : ch;
      }
    } else cur += ch;
  }
  if (lines.length < n) {
    if (cur) lines.push(cur);
    return lines;
  }
  // 放不下：最后一行截短加省略号
  let last = lines[n - 1];
  while (last && textWidth(last + '…', size) > width) last = last.slice(0, -1);
  lines[n - 1] = last + '…';
  return lines;
}

/** 信息位底色深浅（0 黑 – 1 白） */
export async function boxLuminance(img: Buffer, box: number[]): Promise<number> {
  const left = Math.round(box[0] * W);
  const top = Math.round(box[1] * H);
  const width = Math.max(1, Math.round((box[2] - box[0]) * W));
  const height = Math.max(1, Math.round((box[3] - box[1]) * H));
  // 注意：sharp 的 stats() 不管前面的 resize / extract，直接算整张原图——要先 toBuffer() 把裁出来的那块落成图再算
  const crop = await sharp(img).resize(W, H, { fit: 'fill' }).extract({ left, top, width: Math.min(width, W - left), height: Math.min(height, H - top) }).toBuffer();
  const st = await sharp(crop).stats();
  const [r, g, b] = st.channels.map((c) => c.mean / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** 底图某一块的平均颜色（box 按底图自身比例 0–1） */
export async function regionStats(img: Buffer, box: number[]): Promise<{ r: number; g: number; b: number; lum: number }> {
  const meta = await sharp(img).metadata();
  const iw = meta.width ?? W;
  const ih = meta.height ?? H;
  const left = Math.max(0, Math.min(iw - 1, Math.round(box[0] * iw)));
  const top = Math.max(0, Math.min(ih - 1, Math.round(box[1] * ih)));
  const width = Math.max(1, Math.min(iw - left, Math.round((box[2] - box[0]) * iw)));
  const height = Math.max(1, Math.min(ih - top, Math.round((box[3] - box[1]) * ih)));
  const crop = await sharp(img).extract({ left, top, width, height }).removeAlpha().toBuffer();
  const st = await sharp(crop).stats();
  const [r, g, b] = st.channels.map((c) => c.mean);
  return { r, g, b, lum: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 };
}

export type BadgePlan = {
  x: number; y: number; w: number; h: number; fs: number; padX: number; radius: number;
  bg: string; color: string; border: string | null; style: 'plaque' | 'seal' | 'strip'; place: BadgePlace; minGlyph: number;
};
const mix = (c: number, to: number, k: number) => Math.round(c + (to - c) * k);

/**
 * 排「AI生成」标识：定位置（边 / 角 / 条子右端）、按底图取色，并把信息位 / 落款位 box（0–1，原地改）让开。
 * - 角：box 和标识横向重叠时，上角把 box 顶边往下挪、下角把 box 底边往上收。
 * - strip：标识贴画面底边、右边和条子右边对齐（像条子下面挂的一枚小签），条子底边往上收让出位置；没有条子退回右下角。
 * - img 是底图（按画布同比例取色；imgH 给了表示底图只占画布上面 imgH 高，如「自己的海报」）。
 */
export async function planBadge(o: {
  cfg: AiBadgeCfg; img: Buffer; cw: number; ch: number; imgH?: number; place: BadgePlace;
  box: number[] | null; bar: 'plate' | 'painted' | null; plateBg?: string;
}): Promise<BadgePlan | null> {
  const { cfg, cw, ch } = o;
  if (!cfg.on) return null;
  const g = badgeGeom(cfg, cw, ch);
  let place = o.place;
  if (place === 'strip' && (!o.box || !o.bar)) place = 'br';
  let x: number;
  let y: number;
  if (place === 'strip') {
    const box = o.box!;
    x = Math.min(cw - g.m - g.bw, Math.round(box[2] * cw) - g.bw);
    y = ch - g.m - g.bh;
    const need = (y - Math.round(g.m * 0.6)) / ch;
    if (box[3] > need) box[3] = Math.max(box[1] + 0.04, need);
  } else {
    x = place === 'tr' || place === 'br' ? cw - g.m - g.bw : g.m;
    y = place === 'tr' || place === 'tl' ? g.m : ch - g.m - g.bh;
    if (o.box) {
      const z = [(x - 6) / cw, (y - 6) / ch, (x + g.bw + 6) / cw, (y + g.bh + 6) / ch];
      const box = o.box;
      if (box[0] < z[2] && box[2] > z[0] && box[1] < z[3] && box[3] > z[1]) {
        if (place === 'tr' || place === 'tl') box[1] = Math.min(z[3], box[3] - 0.04);
        else box[3] = Math.max(z[1], box[1] + 0.04);
      }
    }
  }
  // 取色：标识所在那块底图（画布坐标 → 底图坐标）
  const ih = o.imgH ?? ch;
  const ry0 = y / ih;
  const ry1 = (y + g.bh) / ih;
  const st = ry0 >= 1 ? { r: 255, g: 255, b: 255, lum: 1 } : await regionStats(o.img, [x / cw, ry0, (x + g.bw) / cw, Math.min(1, ry1)]).catch(() => ({ r: 40, g: 40, b: 40, lum: 0.16 }));
  const dark = st.lum < 0.55;
  const style = place === 'strip' ? 'strip' : cfg.style === 'strip' ? 'plaque' : cfg.style;
  const a = Math.min(0.95, Math.max(0.45, cfg.opacity + 0.2)).toFixed(2);
  let bg: string;
  let color: string;
  let border: string | null = null;
  let radius = Math.round(g.bh * 0.28);
  if (style === 'seal') {
    // 细金边小章：透明偏深底 + 金色细边框；深底金字、浅底白字
    bg = `rgba(0,0,0,${dark ? 0.3 : 0.5})`;
    color = dark ? '#EBC873' : '#FFFFFF';
    border = `${Math.max(2, Math.round(g.fs * 0.045))}px solid rgba(222,186,104,0.95)`;
    radius = Math.round(g.bh * 0.12);
  } else if (style === 'strip' && o.bar === 'plate') {
    // 和底板同色，像底板下面挂的一枚小签
    bg = o.plateBg ?? 'rgba(12,14,20,0.6)';
    color = '#FFFFFF';
    radius = Math.round(g.bh * 0.24);
  } else {
    // 圆角小牌 / 画在图里的条子：底色从这块图里取，往深 / 浅压一半保证对比
    const to = dark ? 0 : 255;
    bg = `rgba(${mix(st.r, to, 0.5)},${mix(st.g, to, 0.5)},${mix(st.b, to, 0.5)},${a})`;
    color = dark ? 'rgba(255,255,255,0.96)' : 'rgba(28,28,28,0.92)';
  }
  return { x, y, w: g.bw, h: g.bh, fs: g.fs, padX: g.padX, radius, bg, color, border, style, place, minGlyph: g.minGlyph };
}

export function AiBadge({ p }: { p: BadgePlan | null }) {
  if (!p) return null;
  return (
    <div
      style={{
        position: 'absolute', left: p.x, top: p.y, width: p.w, height: p.h, borderRadius: p.radius, background: p.bg, color: p.color,
        ...(p.border ? { border: p.border } : {}),
        fontSize: p.fs, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', lineHeight: 1
      }}
    >
      AI生成
    </div>
  );
}

export type PosterInfo = { title: string; when: string; locationName: string; address: string; organizer: string };

/** 出图（不查库）：底图、信息、报名码 → PNG。scripts 里的样张也走这里 */
export async function renderPoster(o: { image: Buffer; box: number[] | null; ink: string | null; info: PosterInfo; qr: Buffer; badge?: AiBadgeCfg; badgePos?: string | null }): Promise<Buffer> {
  const badge = o.badge ?? AI_BADGE_DEFAULT;
  const plate = !o.box;
  const box = [...(o.box ?? DEFAULT_BOX)];
  // 「AI生成」标识：定位置、取色，信息位碰到就让开（box 原地改）
  const bp = await planBadge({ cfg: badge, img: o.image, cw: W, ch: H, place: placeFor(badge, o.badgePos), box, bar: plate ? 'plate' : 'painted', plateBg: 'rgba(12,14,20,0.62)' });
  const ink = plate ? '#FFFFFF' : o.ink && /^#[0-9a-f]{6}$/i.test(o.ink) ? o.ink : (await boxLuminance(o.image, box)) > 0.55 ? '#1E1E1E' : '#FFFFFF';
  const sub = ink;

  const bx = box[0] * W;
  const by = box[1] * H;
  const bw = (box[2] - box[0]) * W;
  const bh = (box[3] - box[1]) * H;
  const pad = plate ? Math.round(Math.min(bw, bh) * 0.07) : 0;
  const innerW = bw - pad * 2;
  const innerH = bh - pad * 2;

  // 右侧报名码：信息位高度留出码下一行字；码最大占宽度 30%
  const capSize = Math.max(18, Math.min(26, Math.round(innerH * 0.07)));
  const qr = Math.round(Math.min(innerW * 0.3, innerH - capSize * 1.6 - 16, 300));
  const gap = Math.round(innerW * 0.04);
  const textW = innerW - qr - gap - 20;

  // 字号：标题按长度缩字（最多两行），其余按信息位高度；放不下整体按比例缩
  const t = o.info;
  const titleLen = textWidth(t.title, 1);
  const titleMax = Math.min(84, innerH * 0.22);
  const oneLine = Math.floor((textW * 0.97) / Math.max(titleLen, 1)) - 1;
  // 短标题一行放得下（字号不小于 56 或已到最大字号）就一行，不硬拆成两行；否则两行按长度缩字
  let title = Math.round(oneLine >= Math.min(56, titleMax) ? Math.min(titleMax, oneLine) : Math.min(titleMax, Math.max(40, (textW * 0.97 * 2) / Math.max(titleLen, 1) - 2)));
  let body = Math.round(Math.max(22, Math.min(36, innerH * 0.095)));
  let small = Math.round(body * 0.82);
  // 断行按 92% 宽度估（估算和真实字宽有出入，留余量；每行再加 nowrap，绝不在框里再折一次）
  const fitW = textW * 0.97;
  const measure = () => {
    const tl = wrap(t.title, title, fitW, 2);
    const loc = wrap(t.locationName, body, fitW, 1);
    const addr = t.address ? wrap(t.address, small, fitW, 2) : [];
    const org = t.organizer ? wrap(`主办：${t.organizer}`, small, fitW, 1) : [];
    const h = tl.length * title * 1.18 + 14 + body * 1.35 + loc.length * body * 1.35 + addr.length * small * 1.3 + (org.length ? 10 + small * 1.3 : 0);
    return { tl, loc, addr, org, h };
  };
  // 标题两行放不下（被加了省略号）先缩标题字，最小 32
  while (title > 32 && wrap(t.title, title, fitW, 2).join('').endsWith('…')) title -= 2;
  let m = measure();
  for (let i = 0; i < 6 && m.h > innerH; i++) {
    const k = Math.max(0.75, innerH / m.h);
    title = Math.max(32, Math.floor(title * k));
    body = Math.max(18, Math.floor(body * k));
    small = Math.max(16, Math.floor(small * k));
    m = measure();
  }
  // 极端情况还放不下：先去掉第二行地址，再去掉地址
  if (m.h > innerH && m.addr.length > 1) m = { ...m, addr: m.addr.slice(0, 1), h: m.h - small * 1.3 };
  if (m.h > innerH && m.addr.length) m = { ...m, addr: [], h: m.h - small * 1.3 };

  const bg = `data:image/jpeg;base64,${o.image.toString('base64')}`;
  const qrUri = `data:image/png;base64,${o.qr.toString('base64')}`;
  const shadow = ink === '#FFFFFF' && !plate ? '0 2px 6px rgba(0,0,0,0.45)' : undefined;

  const res = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', fontFamily: 'NotoSansSC' }}>
        <img src={bg} width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} />
        {plate && (
          <div style={{ position: 'absolute', left: bx, top: by, width: bw, height: bh, borderRadius: 28, background: 'rgba(12,14,20,0.62)', display: 'flex' }} />
        )}
        <div style={{ position: 'absolute', left: bx + pad, top: by + pad, width: innerW, height: innerH, display: 'flex', flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: textW, overflow: 'hidden', color: ink, ...(shadow ? { textShadow: shadow } : {}) }}>
            {m.tl.map((l, i) => (
              <div key={'t' + i} style={{ fontSize: title, ...ln(title, 1.18), whiteSpace: 'nowrap' }}>{l}</div>
            ))}
            <div style={{ fontSize: body, ...ln(body, 1.35), marginTop: 14, color: sub, whiteSpace: 'nowrap' }}>{t.when}</div>
            {m.loc.map((l, i) => (
              <div key={'l' + i} style={{ fontSize: body, ...ln(body, 1.35), color: sub, whiteSpace: 'nowrap' }}>{l}</div>
            ))}
            {m.addr.map((l, i) => (
              <div key={'a' + i} style={{ fontSize: small, ...ln(small, 1.3), color: sub, opacity: 0.88, whiteSpace: 'nowrap' }}>{l}</div>
            ))}
            {m.org.map((l, i) => (
              <div key={'o' + i} style={{ fontSize: small, ...ln(small, 1.3), marginTop: 10, color: sub, opacity: 0.88, whiteSpace: 'nowrap' }}>{l}</div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: gap + 20 }}>
            <div style={{ display: 'flex', background: '#FFFFFF', borderRadius: 16, padding: 10 }}>
              <img src={qrUri} width={qr - 20} height={qr - 20} />
            </div>
            <div style={{ fontSize: capSize, marginTop: 10, color: ink, ...(shadow ? { textShadow: shadow } : {}) }}>长按识别报名</div>
          </div>
        </div>
        <AiBadge p={bp} />
      </div>
    ),
    { width: W, height: H, fonts: [{ name: 'NotoSansSC', data: await font(), weight: 700, style: 'normal' }] }
  );
  // 整张图在这里出完：出错就抛给调用方（返回 500，小程序退回老海报），不会给出一张半截的图
  return Buffer.from(await res.arrayBuffer());
}

/** 自己传的海报：原图铺满宽度（高度限制在 600–1620，超出居中裁），底部接白色报名条 */
export async function renderOwnPoster(o: { image: Buffer; aiGenerated: boolean; info: PosterInfo; qr: Buffer; badge?: AiBadgeCfg }): Promise<Buffer> {
  const badge = o.badge ?? AI_BADGE_DEFAULT;
  const meta = await sharp(o.image).metadata();
  const ih = Math.round(Math.min(1620, Math.max(600, (W * (meta.height ?? W)) / (meta.width ?? W))));
  const img = await sharp(o.image).resize(W, ih, { fit: 'cover', position: 'centre' }).jpeg({ quality: 88 }).toBuffer();
  const SH = 380;
  const pad = 48;
  const qr = 250;
  const textW = W - pad * 2 - qr - 40;
  const t = o.info;
  const fitW = textW * 0.97;
  const one = Math.floor(fitW / Math.max(textWidth(t.title, 1), 1)) - 1;
  let title = Math.round(one >= 48 ? Math.min(60, one) : Math.min(60, Math.max(36, (fitW * 2) / Math.max(textWidth(t.title, 1), 1) - 2)));
  while (title > 32 && wrap(t.title, title, fitW, 2).join('').endsWith('…')) title -= 2;
  const tl = wrap(t.title, title, fitW, 2);
  const loc = wrap([t.locationName, t.address].filter(Boolean).join(' · '), 28, fitW, 2);
  const org = t.organizer ? wrap(`主办：${t.organizer}`, 24, fitW, 1) : [];
  const H2 = ih + SH;
  // 自己的海报：底部是白色报名条（右边是报名码），标识只放上面两个角（全局 pos 是 tl 就左上，其余右上）
  const bp = o.aiGenerated ? await planBadge({ cfg: badge, img, cw: W, ch: H2, imgH: ih, place: badge.pos === 'tl' ? 'tl' : 'tr', box: null, bar: null }) : null;
  const res = new ImageResponse(
    (
      <div style={{ width: W, height: H2, display: 'flex', flexDirection: 'column', position: 'relative', fontFamily: 'NotoSansSC', background: '#FFFFFF' }}>
        <img src={`data:image/jpeg;base64,${img.toString('base64')}`} width={W} height={ih} style={{ width: W, height: ih }} />
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: W, height: SH, padding: `0 ${pad}px`, background: '#FFFFFF' }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: textW, overflow: 'hidden', color: '#1E1E1E' }}>
            {tl.map((l, i) => <div key={'t' + i} style={{ fontSize: title, ...ln(title, 1.18), whiteSpace: 'nowrap' }}>{l}</div>)}
            <div style={{ fontSize: 30, ...ln(30, 1.35), marginTop: 12, color: '#333333' }}>{t.when}</div>
            {loc.map((l, i) => <div key={'l' + i} style={{ fontSize: 28, ...ln(28, 1.35), color: '#333333', whiteSpace: 'nowrap' }}>{l}</div>)}
            {org.map((l, i) => <div key={'o' + i} style={{ fontSize: 24, ...ln(24, 1.3), marginTop: 8, color: '#666666' }}>{l}</div>)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: 40 }}>
            <img src={`data:image/png;base64,${o.qr.toString('base64')}`} width={qr - 20} height={qr - 20} />
            <div style={{ fontSize: 24, marginTop: 8, color: '#1E1E1E' }}>长按识别报名</div>
          </div>
        </div>
        <AiBadge p={bp} />
      </div>
    ),
    { width: W, height: H2, fonts: [{ name: 'NotoSansSC', data: await font(), weight: 700, style: 'normal' }] }
  );
  return Buffer.from(await res.arrayBuffer());
}

/** 接口用：权限和 posterData 一样（负责人 / 帮手，活动没下架 / 取消） */
export async function eventPosterPng(contactId: string, eventId: string): Promise<Buffer> {
  const pool = getPool();
  const { ev } = await eventAccess(pool, contactId, eventId, 'helper');
  if (ev.status !== 'published' && ev.status !== 'review') throw new CrmError('event_closed', '这场活动已下架或取消，不能出海报');
  const { rows: o } = await pool.query<{ name: string }>(`SELECT name FROM organizers WHERE id = $1`, [ev.organizer_id]);
  const info = { title: clean(ev.title), when: whenText(ev), locationName: clean(ev.location_name), address: clean(ev.address), organizer: clean(o[0]?.name) };
  if (ev.poster_own) {
    const own = await getOwnPoster(ev.poster_own, pool);
    if (!own) throw new CrmError('not_found', '这场活动用的海报图找不到了');
    if (await ownPosterBlocked(own)) throw new CrmError('bad_request', '这张海报图没通过微信的图片检测，请换一张');
    const res = await fetch(own.url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`海报图取不到（${res.status}）`);
    const [image, qr] = [Buffer.from(await res.arrayBuffer()), await codePng(ev.code, 'register', contactId)];
    return renderOwnPoster({ image, aiGenerated: own.ai_generated, info, qr, badge: await aiBadgeConfig(pool) });
  }
  if (!ev.poster_tpl) throw new CrmError('not_found', '这场活动没有选海报模板');
  const tpl = await getTemplate(ev.poster_tpl, pool);
  if (!tpl) throw new CrmError('not_found', '这场活动选的海报模板找不到了');
  const [image, qr] = await Promise.all([fetchTemplateImage(tpl, 'l'), codePng(ev.code, 'register', contactId)]);
  return renderPoster({
    image, box: tpl.box, ink: tpl.ink, qr, info, badge: await aiBadgeConfig(pool), badgePos: tpl.badge_pos
  });
}
