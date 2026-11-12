/**
 * AI 海报叠字（东哥 11/10）：AI 只出主视觉大图，系统按设计稿「大片款 56–63」「AI 未来款 64–71」的文字版式把字和二维码叠上去。
 * 版式（自上而下，居中）：宣传语（宽字距）→ 留白 → 英文小字 → 片名（金属 / 辉光字效，过长自动缩）→ 副标题（活动名）
 *   → 演职员表一行（主办 / 主讲 / 协办）→ 日期 + 时间（“下午 1:30 签到 · 2:00 开始”）+ 地点 → 报名二维码。
 * 尺寸：竖版 1080×1620、方版 1080×1080、公众号头图 900×383。主讲人照片只用后台上传的真实照片。
 * 海报上不写价格、“免费”、已报名人数。
 */
import React from 'react'; // 脚本（tsx）里用经典 JSX 运行时，需要显式引入
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { crc32 } from 'node:zlib';
import { posterFonts } from './fonts';
import type { PosterStyle, TitleFx } from './styles';

export const POSTER_SIZES = { tall: [1080, 1620], square: [1080, 1080], oa: [900, 383] } as const;
export type PosterSize = keyof typeof POSTER_SIZES;

export type PosterText = {
  tagline: string;
  filmTitle: string;
  subtitle: string; // 活动名
  credits: { host?: string | null; speaker?: string | null; coHost?: string | null };
  dateLine: string; // 11 月 13 日 周五
  timeLine: string; // 下午 1:30 签到 · 2:00 开始（洛杉矶时间）
  place: string;
  /** 电影海报排法用（不给就从上面几项推出来） */
  titleEn?: string | null; // 片名下的英文小字
  bigDate?: string | null; // 11.13
  dateNote?: string | null; // 周五 下午 2:00 · 1:30 签到 · 洛杉矶
  billing?: string | null; // 底部演职员表那一行（只用真实信息）
  filmSubtitle?: string | null; // 副片名（如《无人之境：车位觉醒》里的“车位觉醒”）
  /** 自由加字（东哥在后台自己写，最多 2 行）：位置 片名上方 / 副标题下方 / 底部；大小 大 / 中 / 小 */
  extras?: PosterExtra[] | null;
};
export type PosterExtra = { text: string; pos: 'aboveTitle' | 'belowSubtitle' | 'bottom'; size: 'L' | 'M' | 'S' };

const FX: Record<TitleFx, { grad?: string; color?: string; glow?: string }> = {
  gold: { grad: 'linear-gradient(180deg, #FFF3C4 0%, #F4CF6B 38%, #B9822A 68%, #F8E08A 100%)' },
  steel: { grad: 'linear-gradient(180deg, #FFFFFF 0%, #C9D2E0 40%, #6B7A90 60%, #E6ECF5 100%)' },
  fire: { grad: 'linear-gradient(180deg, #FFF1C4 0%, #FFB347 45%, #E4572E 100%)' },
  holo: { grad: 'linear-gradient(100deg, #7DF9FF, #B38CFF 45%, #FF7AC6 75%, #FFD27A)' },
  cyan: { color: '#EFFFFF', glow: '#35E0FF' },
  green: { color: '#EFFFF5', glow: '#39FF88' },
  pink: { color: '#FFFFFF', glow: '#FF4FD8' },
  ink: { color: '#1B1440' }
};

/** 按字数估宽度自动缩字：中文 1em，英文/数字约 0.6em，加上字距 */
export function fitSize(text: string, maxW: number, maxSize: number, spacingEm = 0.06): number {
  const w = Array.from(text).reduce((s, ch) => s + (/[\u0000-ɏ]/.test(ch) ? 0.62 : 1) + spacingEm, 0);
  return Math.max(12, Math.min(maxSize, Math.floor(maxW / Math.max(w, 1))));
}

/** 主体在原图里的位置（0–1，左上 x0,y0 到右下 x1,y1）。不给时按“主体在上中部”的默认范围取，宁大勿小 */
export type FocusBox = { x0: number; y0: number; x1: number; y1: number };
const DEFAULT_FOCUS: FocusBox = { x0: 0.05, y0: 0.15, x1: 0.95, y1: 0.6 };
/** 方版 / 横版里留给主体的区域（其余放字）：方版是字下面、上部 40%；横版是右半边 */
const SUBJECT_AREA: Record<'square' | 'oa', FocusBox> = {
  square: { x0: 0.05, y0: 0.06, x1: 0.95, y1: 0.46 },
  oa: { x0: 0.5, y0: 0.06, x1: 0.97, y1: 0.94 }
};

/**
 * 主视觉排成目标比例。竖版：铺满。方版 / 横版：重新构图而不是硬裁——
 * 把整张图按比例缩放，让主体（加一圈留白）整个落在留给它的区域里；图盖不到的地方
 * 用同一张图放大、模糊、压暗后的底色补上，原图边缘羽化过渡。主体不会被切掉。
 */
async function frame(bg: Buffer, W: number, H: number, size: PosterSize, focus?: FocusBox | null, lift = 0): Promise<string> {
  const img = sharp(bg, { failOn: 'none' });
  const m = await img.metadata();
  const sw = m.width ?? 1024;
  const sh = m.height ?? 1536;
  if (size === 'tall') {
    const full = await img.resize(W, H, { fit: 'cover', position: 'centre' }).jpeg({ quality: 90 }).toBuffer();
    const dy = Math.round(Math.max(0, Math.min(0.25, lift)) * H);
    if (!dy) return `data:image/jpeg;base64,${full.toString('base64')}`;
    // 画面上移：整张图往上挪 dy（顶部天空裁掉一点），底下空出来的用同一张图模糊压暗补上（反正压在深色渐变下），交界处羽化
    const base = await sharp(full).blur(W / 30).modulate({ brightness: 0.45 }).toBuffer();
    const keep = H - dy;
    const fe = Math.round(H * 0.05);
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${keep}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="${((keep - fe) / keep).toFixed(4)}" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect width="${W}" height="${keep}" fill="url(#g)"/></svg>`);
    const top = await sharp(full).extract({ left: 0, top: dy, width: W, height: keep }).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
    const out = await sharp(base).composite([{ input: top, left: 0, top: 0 }]).jpeg({ quality: 90 }).toBuffer();
    return `data:image/jpeg;base64,${out.toString('base64')}`;
  }
  const f = focus ?? DEFAULT_FOCUS;
  const pad = 0.12; // 主体四周留白（按主体尺寸）
  const bw = (f.x1 - f.x0) * sw * (1 + 2 * pad);
  const bh = (f.y1 - f.y0) * sh * (1 + 2 * pad);
  const A = SUBJECT_AREA[size];
  const aw = (A.x1 - A.x0) * W;
  const ah = (A.y1 - A.y0) * H;
  const s = Math.min(aw / bw, ah / bh, 1.6); // 放大不超过 1.6 倍，免得发虚
  const iw = Math.round(sw * s);
  const ih = Math.round(sh * s);
  // 主体中心对准区域中心；图比画布大时不留空边
  let left = Math.round(((A.x0 + A.x1) / 2) * W - ((f.x0 + f.x1) / 2) * sw * s);
  let top = Math.round(((A.y0 + A.y1) / 2) * H - ((f.y0 + f.y1) / 2) * sh * s);
  if (iw >= W) left = Math.min(0, Math.max(W - iw, left));
  if (ih >= H) top = Math.min(0, Math.max(H - ih, top));
  const base = await sharp(bg, { failOn: 'none' }).resize(W, H, { fit: 'cover' }).blur(Math.max(W, H) / 40).modulate({ brightness: 0.5 }).toBuffer();
  const fe = Math.round(Math.min(iw, ih) * 0.06);
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${iw}" height="${ih}"><defs><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${fe / 2}"/></filter></defs>` +
      `<rect x="${fe}" y="${fe}" width="${Math.max(1, iw - 2 * fe)}" height="${Math.max(1, ih - 2 * fe)}" fill="#fff" filter="url(#b)"/></svg>`
  );
  const layer = await sharp(bg, { failOn: 'none' }).resize(iw, ih).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  // 只取画布里看得见的那部分再叠上去
  const ox = Math.max(0, -left);
  const oy = Math.max(0, -top);
  const vw = Math.min(iw - ox, W - Math.max(0, left));
  const vh = Math.min(ih - oy, H - Math.max(0, top));
  const visible = await sharp(layer).extract({ left: ox, top: oy, width: vw, height: vh }).toBuffer();
  const out = await sharp(base).composite([{ input: visible, left: Math.max(0, left), top: Math.max(0, top) }]).jpeg({ quality: 90 }).toBuffer();
  return `data:image/jpeg;base64,${out.toString('base64')}`;
}

/** 用 8 个方向的硬投影拼出描边（satori 不支持 text-stroke） */
/** 电影海报排法要的几项：没单独给就从日期行 / 时间行 / 主办 / 地点推出来（只用真实信息，不编造）。后台“自动”占位也用它 */
export function fillText(t: PosterText): { bigDate: string; dateNote: string; billing: string } {
  const md = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/.exec(t.dateLine);
  const week = /周[一二三四五六日天]/.exec(t.dateLine)?.[0] ?? '';
  return {
    bigDate: t.bigDate || (md ? `${md[1]}.${md[2]}` : t.dateLine),
    dateNote: t.dateNote || [week, t.timeLine].filter(Boolean).join(' '),
    billing: t.billing || [t.credits.host ? `${t.credits.host} 出品` : '', t.credits.speaker ? `主讲 ${t.credits.speaker}` : '', t.credits.coHost ? `协办 ${t.credits.coHost}` : '', t.place ? `地点 ${t.place}` : '', '扫码报名 入场'].filter(Boolean).join(' ｜ ')
  };
}

function outlineShadow(o: number, c: string): string {
  const d = o * 0.7071;
  return [[o, 0], [-o, 0], [0, o], [0, -o], [d, d], [-d, d], [d, -d], [-d, -d]].map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px 0 ${c}`).join(', ');
}

function Title({ text, size, st, fx, outline }: { text: string; size: number; st: PosterStyle; fx: TitleFx; outline?: boolean }) {
  const f = FX[fx];
  const family = st.brush ? 'Brush' : st.serif ? 'Serif' : 'Sans';
  const weight = st.brush ? 400 : 900;
  const base = { fontFamily: family, fontWeight: weight, fontSize: size, lineHeight: 1.1, letterSpacing: size * 0.06, whiteSpace: 'nowrap' as const };
  if (f.grad) {
    // 金属字：底层一份深色投影 + 上层渐变字（satori 的 background-clip:text 不带投影，所以叠两层）
    return (
      <div style={{ display: 'flex', position: 'relative' }}>
        {outline ? (
          // 明亮画面：深色描边 + 柔和投影，金字在亮背景上也看得清
          <div style={{ ...base, display: 'flex', position: 'absolute', left: 0, top: 0, color: 'rgba(10,24,50,0.92)', textShadow: outlineShadow(size * 0.045, 'rgba(10,24,50,0.92)') + `, 0 ${size * 0.05}px ${size * 0.16}px rgba(6,16,36,0.85)` }}>{text}</div>
        ) : (
          <div style={{ ...base, display: 'flex', position: 'absolute', left: 0, top: size * 0.06, color: 'rgba(0,0,0,0.75)', textShadow: `0 ${size * 0.05}px ${size * 0.1}px rgba(0,0,0,0.9)` }}>{text}</div>
        )}
        <div style={{ ...base, display: 'flex', backgroundImage: f.grad, backgroundClip: 'text', color: 'transparent' }}>{text}</div>
      </div>
    );
  }
  return <div style={{ ...base, display: 'flex', color: f.color, textShadow: f.glow ? `0 0 ${size * 0.12}px ${f.glow}` : undefined }}>{text}</div>;
}

export async function composePoster(opts: {
  bg: Buffer;
  size: PosterSize;
  style: PosterStyle;
  text: PosterText;
  qr: Buffer;
  speakerPhoto?: Buffer | null;
  /** 主体位置（方版 / 横版按它重新构图；不给用默认范围） */
  focus?: FocusBox | null;
  /** 竖版“画面上移”（0–0.25，占画面高度的比例）：车被片名压住时往上挪 */
  lift?: number | null;
  /** AI 画的主视觉：右上角加“AI 生成”小字（《人工智能生成合成内容标识办法》显式标识） */
  aiLabel?: boolean;
  /** 小程序邀请海报：片名和日期之间加一行“某某 邀请您”（头像 + 姓名 + 身份） */
  inviter?: { name: string; label?: string | null; avatar?: Buffer | null } | null;
}): Promise<Buffer> {
  const { size, style: st, text: t } = opts;
  const [W, H] = POSTER_SIZES[size];
  const u = W / 100; // 设计稿用 cqw，这里 1u = 宽度的 1%
  const light = !!st.light;
  const ink = light ? '#1B1440' : '#FFFFFF';
  const sub = light ? 'rgba(27,20,64,0.78)' : 'rgba(255,255,255,0.86)';
  const gold = light ? '#8A6A2F' : '#E3C57A';
  const bg = await frame(opts.bg, W, H, size, opts.focus, opts.lift ?? 0);
  const qr = `data:image/png;base64,${(await sharp(opts.qr).flatten({ background: '#ffffff' }).resize(480, 480, { fit: 'contain', background: '#ffffff' }).png().toBuffer()).toString('base64')}`;
  const photo = opts.speakerPhoto ? `data:image/jpeg;base64,${(await sharp(opts.speakerPhoto, { failOn: 'none' }).rotate().resize(320, 320, { fit: 'cover' }).jpeg({ quality: 88 }).toBuffer()).toString('base64')}` : null;
  const credits = ([['主办', t.credits.host], ['主讲', t.credits.speaker], ['协办', t.credits.coHost]] as const).filter(([, v]) => v && String(v).trim());
  const { bigDate, dateNote, billing } = fillText(t);
  const onesheet = st.layout === 'onesheet' && size === 'tall';
  const extras = (t.extras ?? []).filter((x) => x && x.text && x.text.trim()).slice(0, 2);
  const inv = opts.inviter && opts.inviter.name ? opts.inviter : null;
  const invAvatar = inv?.avatar ? `data:image/jpeg;base64,${(await sharp(inv.avatar, { failOn: 'none' }).rotate().resize(160, 160, { fit: 'cover' }).jpeg({ quality: 86 }).toBuffer()).toString('base64')}` : null;
  const invText = inv ? `${inv.name} 邀请您` : '';
  const fonts = await posterFonts([t.tagline, t.filmTitle, t.filmSubtitle ?? '', t.subtitle, t.dateLine, t.timeLine, t.place, st.en, ...credits.flat(), t.titleEn ?? '', bigDate, dateNote, billing, ...extras.map((x) => x.text), invText, inv?.label ?? '', 'AI 生成'].join(''), !!st.brush);
  const bright = !!st.bright;
  const vignette = bright
    ? 'linear-gradient(180deg, rgba(8,22,48,0.45) 0%, rgba(8,22,48,0) 12%, rgba(8,22,48,0) 70%, rgba(8,22,48,0.78) 85%, rgba(6,16,36,0.94) 100%)'
    : light
    ? 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 25%, rgba(255,255,255,0) 52%, rgba(255,255,255,0.9) 82%, #ffffff 100%)'
    : 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.88) 80%, #000000 100%)';

  let body: JSX.Element;
  if (onesheet) {
    // 电影海报排法：最顶上一行很小的 A SAREC PRESENTATION + 悬念语；中下部超大片名（横向镜头光晕划过）+ 英文小字 + 副标题；
    // 醒目“上映日期”；最底一行窄而密的演职员表小字；二维码缩小放右下角，细金边。信息量只留画面、片名、日期。
    // 明亮款片名收一点、整块字压在画面 55% 以下（车在上面）；加了自由字再收一点
    // 邀请海报多一行邀请人，片名再收一点
    const ts = fitSize(t.filmTitle, 88 * u, (st.brush ? 24 : bright ? [16.5, 13.5, 12][Math.min(2, extras.length + (inv ? 1 : 0))] : inv ? 17 : 21) * u);
    const tight = (bright && extras.length > 0) || !!inv; // 有自由字 / 邀请人时日期和间距也收一点
    const sub2 = t.filmSubtitle?.trim() || '';
    const ss = sub2 ? fitSize(sub2, 60 * u, (bright ? 6 : 7.5) * u, 0.3) : 0;
    const shadow = bright ? '0 2px 8px rgba(6,16,36,0.9), 0 0 2px rgba(6,16,36,0.9)' : '0 2px 10px rgba(0,0,0,0.8)';
    const EX = { L: 4.2, M: 3.2, S: 2.3 } as const;
    const extra = (pos: PosterExtra['pos']) =>
      extras.filter((x) => x.pos === pos).map((x, i) => (
        <div key={pos + i} style={{ display: 'flex', fontFamily: 'Sans', fontWeight: x.size === 'S' ? 500 : 700, fontSize: fitSize(x.text, 84 * u, EX[x.size] * u, 0.1), letterSpacing: 0.1 * EX[x.size] * u, color: x.size === 'L' ? gold : ink, marginTop: 1.4 * u, textShadow: shadow }}>{x.text}</div>
      ));
    const flare = 'linear-gradient(90deg, rgba(255,214,150,0) 0%, rgba(255,214,150,0.15) 18%, rgba(255,244,220,0.95) 50%, rgba(255,214,150,0.15) 82%, rgba(255,214,150,0) 100%)';
    body = (
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: `${2.6 * u}px ${5 * u}px ${2.6 * u}px` }}>
        <div style={{ display: 'flex', fontFamily: 'Num', fontWeight: 500, fontSize: 1.45 * u, letterSpacing: 0.7 * 1.45 * u, color: sub, opacity: 0.85 }}>{st.en}</div>
        {t.tagline ? <div style={{ display: 'flex', fontFamily: 'Sans', fontSize: fitSize(t.tagline, 80 * u, 2.5 * u, 0.45), letterSpacing: 0.45 * 2.5 * u, color: ink, marginTop: 1.6 * u, textShadow: bright ? outlineShadow(2, 'rgba(10,24,50,0.8)') + ', ' + shadow : shadow }}>{t.tagline}</div> : null}
        <div style={{ display: 'flex', flex: 1 }} />
        {extra('aboveTitle')}
        <div style={{ display: 'flex', position: 'relative', justifyContent: 'center', alignItems: 'center', width: W }}>
          <Title text={t.filmTitle} size={ts} st={st} fx={st.fx} outline={bright} />
          <div style={{ display: 'flex', position: 'absolute', left: 0, top: ts * 0.6, width: W, height: 0.45 * u, background: flare, boxShadow: `0 0 ${3 * u}px ${0.9 * u}px rgba(255,205,130,0.5)` }} />
        </div>
        {sub2 ? (
          // 副片名：紧贴主片名下一行，两侧细金线，像电影续集的写法
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 0.4 * u }}>
            <div style={{ display: 'flex', width: 8 * u, height: 0.25 * u, background: gold, opacity: 0.85, marginRight: 2 * u }} />
            <Title text={sub2} size={ss} st={st} fx={st.fx} outline={bright} />
            <div style={{ display: 'flex', width: 8 * u, height: 0.25 * u, background: gold, opacity: 0.85, marginLeft: 2 * u }} />
          </div>
        ) : null}
        {t.titleEn ? <div style={{ display: 'flex', fontFamily: 'Num', fontWeight: 500, fontSize: 1.9 * u, letterSpacing: 0.75 * 1.9 * u, color: gold, marginTop: 1.2 * u, textShadow: bright ? outlineShadow(2, 'rgba(10,24,50,0.85)') + ', ' + shadow : undefined }}>{t.titleEn}</div> : null}
        <div style={{ display: 'flex', fontFamily: 'Sans', fontWeight: 700, fontSize: fitSize(t.subtitle, 80 * u, 2.9 * u, 0.12), letterSpacing: 0.12 * 2.9 * u, color: ink, marginTop: 2 * u, textShadow: bright ? outlineShadow(2, 'rgba(10,24,50,0.85)') + ', ' + shadow : undefined }}>{t.subtitle}</div>
        {extra('belowSubtitle')}
        {inv ? (
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 * u, padding: `${0.8 * u}px ${2.2 * u}px ${0.8 * u}px ${0.8 * u}px`, borderRadius: 6 * u, background: 'rgba(6,16,36,0.55)', border: `1px solid rgba(227,197,122,0.45)` }}>
            {invAvatar ? <img src={invAvatar} width={6.4 * u} height={6.4 * u} style={{ borderRadius: 3.2 * u, border: `${0.25 * u}px solid ${gold}` }} /> : (
              <div style={{ display: 'flex', width: 6.4 * u, height: 6.4 * u, borderRadius: 3.2 * u, background: '#15293D', border: `${0.25 * u}px solid ${gold}`, alignItems: 'center', justifyContent: 'center', fontFamily: 'Serif', fontWeight: 900, fontSize: 3 * u, color: gold }}>{inv.name.slice(0, 1)}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 1.6 * u, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', fontFamily: 'Sans', fontWeight: 700, fontSize: fitSize(invText, 56 * u, 3 * u, 0.06), color: ink }}>{invText}</div>
              {inv.label ? <div style={{ display: 'flex', fontFamily: 'Sans', fontSize: fitSize(inv.label, 56 * u, 1.9 * u, 0.02), color: sub, marginTop: 0.3 * u }}>{inv.label}</div> : null}
            </div>
          </div>
        ) : null}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: (tight ? 2 : 3.2) * u }}>
          <div style={{ display: 'flex', fontFamily: 'Num', fontWeight: 700, fontSize: (tight ? 7.5 : 9) * u, lineHeight: 1, letterSpacing: 0.04 * 9 * u, backgroundImage: FX.gold.grad, backgroundClip: 'text', color: 'transparent' }}>{bigDate}</div>
          <div style={{ display: 'flex', width: 0.2 * u, height: 6 * u, background: gold, opacity: 0.7, margin: `0 ${2.2 * u}px` }} />
          <div style={{ display: 'flex', fontFamily: 'Sans', fontSize: fitSize(dateNote, 46 * u, 2.3 * u, 0.04), letterSpacing: 0.04 * 2.3 * u, color: ink, maxWidth: 46 * u }}>{dateNote}</div>
        </div>
        {extra('bottom')}
        <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%', marginTop: (tight ? 2 : 3.4) * u }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, paddingRight: 2 * u }}>
            <div style={{ display: 'flex', fontFamily: 'Sans', fontSize: fitSize(billing, 74 * u, 1.55 * u, 0), letterSpacing: 0.01 * u, color: sub, opacity: 0.9, whiteSpace: 'nowrap' }}>{billing}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img src={qr} width={9.5 * u} height={9.5 * u} style={{ background: '#fff', padding: 0.45 * u, border: `${0.22 * u}px solid ${gold}`, borderRadius: 0.6 * u }} />
          </div>
        </div>
      </div>
    );
  } else if (size === 'oa') {
    // 公众号头图：字和二维码全在左半边（压暗），右半边整张留给主体（见 SUBJECT_AREA.oa）
    const colW = W * 0.44;
    const ts = fitSize(t.filmTitle, colW, H * 0.26);
    body = (
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex', alignItems: 'center', padding: `0 ${4 * u}px`, background: light ? 'linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 38%, rgba(255,255,255,0) 58%)' : 'linear-gradient(90deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.8) 38%, rgba(0,0,0,0) 58%)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: colW }}>
          {t.tagline ? <div style={{ display: 'flex', fontFamily: 'Sans', fontSize: fitSize(t.tagline, colW, 2.2 * u, 0.3), letterSpacing: 0.3 * 2.2 * u, color: sub }}>{t.tagline}</div> : null}
          <div style={{ display: 'flex', marginTop: 1 * u }}><Title text={t.filmTitle} size={ts} st={st} fx={st.fx} /></div>
          <div style={{ display: 'flex', fontFamily: 'Sans', fontWeight: 700, fontSize: fitSize(t.subtitle, colW, 2.6 * u, 0.15), letterSpacing: 1, color: ink, marginTop: 1 * u }}>{t.subtitle}</div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 1.8 * u }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', fontFamily: 'Num', fontWeight: 700, fontSize: 2.8 * u, letterSpacing: 3, color: gold }}>{t.dateLine}</div>
              <div style={{ display: 'flex', fontFamily: 'Sans', fontSize: fitSize(t.timeLine, colW - 14 * u, 1.9 * u, 0.02), color: sub, marginTop: 0.6 * u }}>{t.timeLine}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: 1.5 * u }}>
              <img src={qr} width={11 * u} height={11 * u} style={{ background: '#fff', padding: 0.6 * u, borderRadius: 0.8 * u }} />
              <div style={{ display: 'flex', fontFamily: 'Sans', fontSize: 1.5 * u, color: sub, marginTop: 0.5 * u }}>扫码报名</div>
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    const square = size === 'square';
    const k = square ? 0.8 : 1; // 方版整体收一点
    const ts = fitSize(t.filmTitle, 84 * u, (st.brush ? 21 : 17) * u * k);
    const subSize = fitSize(t.subtitle, 84 * u, 3.6 * u * k, 0.12);
    body = (
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: `${6 * u * k}px ${7 * u}px ${5 * u * k}px` }}>
        {t.tagline ? <div style={{ display: 'flex', fontFamily: 'Sans', fontSize: fitSize(t.tagline, 84 * u, 3.1 * u * k, 0.5), letterSpacing: 0.5 * 3 * u * k, color: sub }}>{t.tagline}</div> : null}
        <div style={{ display: 'flex', flex: 1 }} />
        {photo && !square ? (
          <img src={photo} width={18 * u} height={18 * u} style={{ borderRadius: 9 * u, border: `${0.4 * u}px solid ${gold}`, marginBottom: 2 * u, objectFit: 'cover' }} />
        ) : null}
        <div style={{ display: 'flex', fontFamily: 'Num', fontWeight: 500, fontSize: 3.3 * u * k, letterSpacing: 0.6 * 3.3 * u * k, color: sub }}>{st.en}</div>
        <div style={{ display: 'flex', marginTop: 1 * u }}><Title text={t.filmTitle} size={ts} st={st} fx={st.fx} /></div>
        <div style={{ display: 'flex', fontFamily: 'Sans', fontWeight: 700, fontSize: subSize, letterSpacing: 0.12 * subSize, color: ink, marginTop: 2 * u * k }}>{t.subtitle}</div>
        {credits.length ? (
          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 3 * u * k, color: sub, fontFamily: 'Sans' }}>
            {credits.map(([label, v]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'baseline', margin: `0 ${1.4 * u}px` }}>
                <span style={{ fontSize: 2.3 * u * k, letterSpacing: 2, opacity: 0.85 }}>{label}</span>
                <span style={{ fontSize: fitSize(String(v), 26 * u, 3.2 * u * k, 0.05), fontWeight: 700, marginLeft: 0.8 * u, color: ink }}>{String(v)}</span>
              </div>
            ))}
          </div>
        ) : null}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 3.4 * u * k, width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', maxWidth: 62 * u }}>
            <div style={{ display: 'flex', fontFamily: 'Num', fontWeight: 700, fontSize: 5 * u * k, letterSpacing: 0.18 * 5 * u * k, color: gold }}>{t.dateLine}</div>
            <div style={{ display: 'flex', fontFamily: 'Sans', fontSize: 2.6 * u * k, color: ink, marginTop: 0.8 * u }}>{t.timeLine}</div>
            {t.place ? <div style={{ display: 'flex', fontFamily: 'Sans', fontSize: fitSize(t.place, 62 * u, 2.3 * u * k, 0.02), color: sub, marginTop: 0.6 * u }}>{t.place}</div> : null}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: 4 * u }}>
            <img src={qr} width={15 * u * k} height={15 * u * k} style={{ background: '#fff', padding: 0.8 * u, borderRadius: 1.2 * u }} />
            <div style={{ display: 'flex', fontFamily: 'Sans', fontSize: 2 * u * k, color: sub, marginTop: 0.6 * u }}>扫码报名</div>
          </div>
        </div>
      </div>
    );
  }

  const res = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', background: '#000' }}>
        <img src={bg} width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }} />
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex', background: size === 'oa' ? 'transparent' : vignette }} />
        {body}
        {opts.aiLabel ? <AiBadge W={W} H={H} /> : null}
      </div>
    ),
    { width: W, height: H, fonts }
  );
  return Buffer.from(await res.arrayBuffer());
}

/** 右上角“AI 生成”小字：半透明底，不抢画面 */
function AiBadge({ W, H }: { W: number; H: number }) {
  const k = Math.min(W, H * 1.6) / 100;
  return (
    <div style={{ position: 'absolute', right: 1.6 * k, top: 1.6 * k, display: 'flex', alignItems: 'center', padding: `${0.35 * k}px ${0.9 * k}px`, borderRadius: 0.6 * k, background: 'rgba(0,0,0,0.38)', color: 'rgba(255,255,255,0.88)', fontFamily: 'Sans', fontSize: Math.max(12, 1.45 * k), letterSpacing: 1 }}>AI 生成</div>
  );
}

/**
 * 隐式标识（《人工智能生成合成内容标识办法》/ GB 45438-2025 元数据）：
 * PNG 写一个 tEXt 块 AIGC={JSON}；JPEG 写 EXIF ImageDescription / UserComment。能做到的程度。
 */
export function aigcMeta(id: string): string {
  return JSON.stringify({ Label: '1', ContentProducer: 'SAREC 中美房地产商会', ProduceID: id, ReservedCode1: '', ContentPropagator: 'SAREC 中美房地产商会', PropagateID: id, ReservedCode2: '' });
}
export function markPng(png: Buffer, id: string): Buffer {
  const sig = 8;
  if (png.length < sig + 12 || png.readUInt32BE(0) !== 0x89504e47) return png;
  const body = Buffer.concat([Buffer.from('AIGC\0', 'latin1'), Buffer.from(aigcMeta(id), 'utf8')]);
  const type = Buffer.from('tEXt', 'latin1');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([type, body])) >>> 0);
  // 插在 IHDR 后面（第一个块：8 字节签名 + 4 长度 + 4 类型 + 13 数据 + 4 CRC）
  const ihdrEnd = sig + 4 + 4 + png.readUInt32BE(sig) + 4;
  return Buffer.concat([png.subarray(0, ihdrEnd), len, type, body, crc, png.subarray(ihdrEnd)]);
}
export async function toJpegMarked(img: Buffer, id: string | null, quality = 88): Promise<Buffer> {
  const s = sharp(img).flatten({ background: '#000' }).jpeg({ quality, mozjpeg: true });
  if (!id) return s.toBuffer();
  const meta = aigcMeta(id);
  return s.withMetadata({ exif: { IFD0: { ImageDescription: `AIGC ${meta}`, Software: 'SAREC AI poster' } } }).toBuffer();
}

/** 活动封面（横版 1600×860）：从主视觉里取一条横带，位置 pos（0 = 最上，1 = 最下；不给按主体在上中部取），AI 图右上角加“AI 生成” */
export const COVER_SIZE = [1600, 860] as const;
export function defaultCoverPos(): number {
  const [W, H] = COVER_SIZE;
  const full = W * 1.5; // 主视觉是 2:3
  return Math.max(0, Math.min(1, (0.42 * full - H / 2) / (full - H)));
}
export async function composeCover(bg: Buffer, o: { pos?: number | null; ai: boolean; id: string }): Promise<Buffer> {
  const [W, H] = COVER_SIZE;
  const m = await sharp(bg, { failOn: 'none' }).metadata();
  const rh = Math.round(((m.height ?? 1536) / (m.width ?? 1024)) * W);
  const pos = typeof o.pos === 'number' && Number.isFinite(o.pos) ? Math.max(0, Math.min(1, o.pos)) : defaultCoverPos();
  const top = Math.round(Math.max(0, rh - H) * pos);
  const band = await sharp(bg, { failOn: 'none' }).resize(W, rh).extract({ left: 0, top: Math.min(top, Math.max(0, rh - H)), width: W, height: Math.min(H, rh) }).resize(W, H, { fit: 'cover' }).jpeg({ quality: 90 }).toBuffer();
  if (!o.ai) return toJpegMarked(band, null);
  const fonts = await posterFonts('AI 生成', false);
  const res = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative' }}>
        <img src={`data:image/jpeg;base64,${band.toString('base64')}`} width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }} />
        <AiBadge W={W} H={H} />
      </div>
    ),
    { width: W, height: H, fonts }
  );
  return toJpegMarked(Buffer.from(await res.arrayBuffer()), o.id);
}
