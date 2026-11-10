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

/** 主视觉裁成目标比例（主体在上中部；方版、横版从偏上的位置取） */
async function crop(bg: Buffer, W: number, H: number, size: PosterSize): Promise<string> {
  const img = sharp(bg, { failOn: 'none' });
  const m = await img.metadata();
  const sw = m.width ?? 1024;
  const sh = m.height ?? 1536;
  let out: Buffer;
  if (size === 'tall') out = await img.resize(W, H, { fit: 'cover', position: 'centre' }).jpeg({ quality: 88 }).toBuffer();
  else {
    const scale = W / sw;
    const rh = Math.round(sh * scale);
    const top = Math.max(0, Math.min(rh - H, Math.round(rh * (size === 'oa' ? 0.2 : 0.12))));
    out = await sharp(bg, { failOn: 'none' }).resize(W, rh).extract({ left: 0, top, width: W, height: H }).jpeg({ quality: 88 }).toBuffer();
  }
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
}): Promise<Buffer> {
  const { size, style: st, text: t } = opts;
  const [W, H] = POSTER_SIZES[size];
  const u = W / 100; // 设计稿用 cqw，这里 1u = 宽度的 1%
  const light = !!st.light;
  const ink = light ? '#1B1440' : '#FFFFFF';
  const sub = light ? 'rgba(27,20,64,0.78)' : 'rgba(255,255,255,0.86)';
  const gold = light ? '#8A6A2F' : '#E3C57A';
  const bg = await crop(opts.bg, W, H, size);
  const qr = `data:image/png;base64,${(await sharp(opts.qr).flatten({ background: '#ffffff' }).resize(480, 480, { fit: 'contain', background: '#ffffff' }).png().toBuffer()).toString('base64')}`;
  const photo = opts.speakerPhoto ? `data:image/jpeg;base64,${(await sharp(opts.speakerPhoto, { failOn: 'none' }).rotate().resize(320, 320, { fit: 'cover' }).jpeg({ quality: 88 }).toBuffer()).toString('base64')}` : null;
  const credits = ([['主办', t.credits.host], ['主讲', t.credits.speaker], ['协办', t.credits.coHost]] as const).filter(([, v]) => v && String(v).trim());
  const fonts = await posterFonts([t.tagline, t.filmTitle, t.subtitle, t.dateLine, t.timeLine, t.place, st.en, ...credits.flat()].join(''), !!st.brush);
  const vignette = light
    ? 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 25%, rgba(255,255,255,0) 52%, rgba(255,255,255,0.9) 82%, #ffffff 100%)'
    : 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.88) 80%, #000000 100%)';

  let body: JSX.Element;
  if (size === 'oa') {
    // 公众号头图：左边字、右边二维码，左侧压暗
    const ts = fitSize(t.filmTitle, W * 0.5, H * 0.3);
    body = (
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex', alignItems: 'center', padding: `0 ${4 * u}px`, background: light ? 'linear-gradient(90deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.6) 55%, rgba(255,255,255,0) 100%)' : 'linear-gradient(90deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.6) 55%, rgba(0,0,0,0) 100%)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {t.tagline ? <div style={{ display: 'flex', fontFamily: 'Sans', fontSize: 2.2 * u, letterSpacing: 0.3 * 2.2 * u, color: sub }}>{t.tagline}</div> : null}
          <div style={{ display: 'flex', marginTop: 1.2 * u }}><Title text={t.filmTitle} size={ts} st={st} fx={st.fx} /></div>
          <div style={{ display: 'flex', fontFamily: 'Sans', fontWeight: 700, fontSize: fitSize(t.subtitle, W * 0.55, 2.8 * u, 0.15), letterSpacing: 2, color: ink, marginTop: 1.2 * u }}>{t.subtitle}</div>
          <div style={{ display: 'flex', fontFamily: 'Num', fontWeight: 700, fontSize: 2.6 * u, letterSpacing: 3, color: gold, marginTop: 1.6 * u }}>{t.dateLine}</div>
          <div style={{ display: 'flex', fontFamily: 'Sans', fontSize: 1.9 * u, color: sub, marginTop: 0.6 * u }}>{t.timeLine}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={qr} width={17 * u} height={17 * u} style={{ background: '#fff', padding: 0.8 * u, borderRadius: 1.2 * u }} />
          <div style={{ display: 'flex', fontFamily: 'Sans', fontSize: 1.8 * u, color: ink, marginTop: 0.8 * u }}>微信扫码报名</div>
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
