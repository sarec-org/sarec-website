/**
 * 文章分享卡 / Open Graph 自动封面（M5）—— Vercel OG(next/og)。
 * ------------------------------------------------------------------
 * SAREC 品牌模板合成:栏目 + 标题 + 日期。同图既作分享卡也作 OG 封面。
 * 手传封面优先:文章若有 heroMedia 图片,则以其为整幅背景。
 * runtime=nodejs:需读文件系统(accessor)取文章;CJK 字体走 Google Fonts 动态子集(仅取用到的字)。
 */
import { ImageResponse } from 'next/og';
import { getArticle } from '@/lib/geo/content';
import { columnLabel } from '@/lib/geo/labels';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'SAREC 研究';

// 取 Google Fonts 的 truetype 子集(satori 不支持 woff2,用老 UA 强制 ttf)。
async function loadFont(text: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (
      await fetch(url, { headers: { 'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0)' } })
    ).text();
    const m = css.match(/src:\s*url\(([^)]+)\)\s*format\(['"]?truetype/);
    if (!m) return null;
    return await (await fetch(m[1])).arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OgImage({ params }: { params: { slug: string } }) {
  const article = getArticle(params.slug);
  const title = article?.title ?? 'SAREC 中美房地产商会';
  const column = article ? columnLabel(article) : 'SAREC 研究';
  const date = article?.publishedAt ?? '';

  // 手传封面优先:有 image heroMedia 则整幅背景 + 底部品牌条。
  const cover = article?.heroMedia?.kind === 'image' ? article.heroMedia.src : undefined;

  const brand = 'SAREC · 中美房地产商会';
  const allText = `${title}${column}${date}${brand}·中美房地产商会研究SAREC`;
  const [bold, regular] = await Promise.all([loadFont(allText, 700), loadFont(allText, 400)]);
  const fonts = [
    ...(bold ? [{ name: 'Noto', data: bold, weight: 700 as const, style: 'normal' as const }] : []),
    ...(regular ? [{ name: 'Noto', data: regular, weight: 400 as const, style: 'normal' as const }] : []),
  ];

  const GOLD = '#c6a865';
  const INK = '#14100c';
  const IVORY = '#ece6d8';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: INK,
          fontFamily: 'Noto, sans-serif',
          position: 'relative',
        }}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            width={1200}
            height={630}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.32 }}
          />
        ) : null}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '72px 80px', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 40, height: 4, background: GOLD }} />
            <div style={{ color: GOLD, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>{column}</div>
          </div>
          <div
            style={{
              color: IVORY,
              fontSize: title.length > 34 ? 58 : 68,
              fontWeight: 700,
              lineHeight: 1.25,
              display: 'flex',
              maxWidth: 1040,
            }}
          >
            {title}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ color: GOLD, fontSize: 30, fontWeight: 700 }}>{brand}</div>
            {date ? <div style={{ color: '#b7ad97', fontSize: 26 }}>{date}</div> : null}
          </div>
        </div>
        <div style={{ height: 10, background: GOLD }} />
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) }
  );
}
