/**
 * AI 海报叠字用字体（Google Fonts 动态子集，只取用到的字）。
 * 片名：Noto Serif SC 900（宋体款）/ Noto Sans SC 900（黑体款）/ Ma Shan Zheng（毛笔款）；日期：Oswald；其余 Noto Sans SC。
 */
type Weight = 400 | 500 | 700 | 900;
type Font = { name: string; data: ArrayBuffer; weight: Weight; style: 'normal' };

async function one(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight}&text=${encodeURIComponent(Array.from(new Set(text)).join(''))}`;
    const css = await (await fetch(url, { headers: { 'User-Agent': 'Wget/1.21' } })).text();
    const m = css.match(/src:\s*url\(([^)]+)\)/);
    if (!m) return null;
    return await (await fetch(m[1])).arrayBuffer();
  } catch {
    return null;
  }
}

export async function posterFonts(text: string, brush: boolean): Promise<Font[]> {
  const t = text + '0123456789·:-()ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ./月日周签到开始扫码报名';
  const jobs: [string, string, Weight][] = [
    ['Serif', 'Noto Serif SC', 900],
    ['Sans', 'Noto Sans SC', 400],
    ['Sans', 'Noto Sans SC', 700],
    ['Sans', 'Noto Sans SC', 900],
    ['Num', 'Oswald', 500],
    ['Num', 'Oswald', 700]
  ];
  if (brush) jobs.push(['Brush', 'Ma Shan Zheng', 400]);
  const got = await Promise.all(jobs.map(([, fam, w]) => one(fam, w, t)));
  return jobs.flatMap(([name, , weight], i) => (got[i] ? [{ name, data: got[i]!, weight, style: 'normal' as const }] : []));
}
