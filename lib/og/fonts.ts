/**
 * 生成图片（名片、活动海报）用的中文字体：Google Fonts 动态子集（只取用到的字），satori 只认 truetype / woff；Google 对 Wget 的 UA 返回 ttf（老 IE 的 UA 现在拿到的是 eot）。
 * 宋体标题用 Noto Serif SC，正文用 Noto Sans SC。取不到字体时返回空数组（图片照样生成，用默认字体）。
 */
type Font = { name: string; data: ArrayBuffer; weight: 400 | 600 | 700; style: 'normal' };

async function one(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight}&text=${encodeURIComponent(Array.from(new Set(text)).join(''))}`;
    const css = await (await fetch(url, { headers: { 'User-Agent': 'Wget/1.21' } })).text();
    const m = css.match(/src:\s*url\(([^)]+)\)/); // 只取第一个字体文件地址
    if (!m) return null;
    return await (await fetch(m[1])).arrayBuffer();
  } catch {
    return null;
  }
}

export async function ogFonts(text: string): Promise<Font[]> {
  const t = text + '0123456789·:-()ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz SAREC…';
  const [serif, sans, sansBold] = await Promise.all([one('Noto Serif SC', 700, t), one('Noto Sans SC', 400, t), one('Noto Sans SC', 700, t)]);
  return [
    ...(serif ? [{ name: 'Serif', data: serif, weight: 700 as const, style: 'normal' as const }] : []),
    ...(sans ? [{ name: 'Sans', data: sans, weight: 400 as const, style: 'normal' as const }] : []),
    ...(sansBold ? [{ name: 'Sans', data: sansBold, weight: 700 as const, style: 'normal' as const }] : [])
  ];
}

/** 远程图片转 data URI（satori 里用；失败返回 null） */
export async function dataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const r = await fetch(url, { headers: { Accept: 'image/jpeg,image/png;q=0.9' } }); // 生成器不认 webp / avif
    if (!r.ok) return null;
    const type = r.headers.get('content-type') || 'image/png';
    return `data:${type};base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`;
  } catch {
    return null;
  }
}
