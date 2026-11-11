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
};

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
async function frame(bg: Buffer, W: number, H: number, size: PosterSize, focus?: FocusBox | null): Promise<string> {
  const img = sharp(bg, { failOn: 'none' });
  const m = await img.metadata();
  const sw = m.width ?? 1024;
  const sh = m.height ?? 1536;
  if (size === 'tall') {
    const out = await img.resize(W, H, { fit: 'cover', position: 'centre' }).jpeg({ quality: 88 }).toBuffer();
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

function Title({ text, size, st, fx }: { text: string; size: number; st: PosterStyle; fx: TitleFx }) {
  const f = FX[fx];
  const family = st.brush ? 'Brush' : st.serif ? 'Serif' : 'Sans';
  const weight = st.brush ? 400 : 900;
  const base = { fontFamily: family, fontWeight: weight, fontSize: size, lineHeight: 1.1, letterSpacing: size * 0.06, whiteSpace: 'nowrap' as const };
  if (f.grad) {
    // 金属字：底层一份深色投影 + 上层渐变字（satori 的 background-clip:text 不带投影，所以叠两层）
    return (
      <div style={{ display: 'flex', position: 'relative' }}>
        <div style={{ ...base, display: 'flex', position: 'absolute', left: 0, top: size * 0.06, color: 'rgba(0,0,0,0.75)', textShadow: `0 ${size * 0.05}px ${size * 0.1}px rgba(0,0,0,0.9)` }}>{text}</div>
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
}): Promise<Buffer> {
  const { size, style: st, text: t } = opts;
  const [W, H] = POSTER_SIZES[size];
  const u = W / 100; // 设计稿用 cqw，这里 1u = 宽度的 1%
  const light = !!st.light;
  const ink = light ? '#1B1440' : '#FFFFFF';
  const sub = light ? 'rgba(27,20,64,0.78)' : 'rgba(255,255,255,0.86)';
  const gold = light ? '#8A6A2F' : '#E3C57A';
  const bg = await frame(opts.bg, W, H, size, opts.focus);
  const qr = `data:image/png;base64,${(await sharp(opts.qr).flatten({ background: '#ffffff' }).resize(480, 480, { fit: 'contain', background: '#ffffff' }).png().toBuffer()).toString('base64')}`;
  const photo = opts.speakerPhoto ? `data:image/jpeg;base64,${(await sharp(opts.speakerPhoto, { failOn: 'none' }).rotate().resize(320, 320, { fit: 'cover' }).jpeg({ quality: 88 }).toBuffer()).toString('base64')}` : null;
  const credits = ([['主办', t.credits.host], ['主讲', t.credits.speaker], ['协办', t.credits.coHost]] as const).filter(([, v]) => v && String(v).trim());
  const fonts = await posterFonts([t.tagline, t.filmTitle, t.subtitle, t.dateLine, t.timeLine, t.place, st.en, ...credits.flat()].join(''), !!st.brush);
  const vignette = light
    ? 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 25%, rgba(255,255,255,0) 52%, rgba(255,255,255,0.9) 82%, #ffffff 100%)'
    : 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.88) 80%, #000000 100%)';

  let body: JSX.Element;
  if (size === 'oa') {
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
      </div>
    ),
    { width: W, height: H, fonts }
  );
  return Buffer.from(await res.arrayBuffer());
}
