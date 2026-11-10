/**
 * 名片卡面出图：设计稿是 HTML/CSS（渐变、遮罩、毛玻璃、描边字等），为了一比一还原，用服务器上的无头 Chrome 截图。
 * 本地开发用本机 Chrome（CHROME_PATH 可改），Vercel 上用 @sparticuz/chromium。
 * 出图前自检：文字超出卡面、互相压住或压住二维码时，把那一块的字号逐步缩小重排（最多缩到 55%），仍不行就在结果里报出来。
 */
import type { Browser } from 'puppeteer-core';
import { BASE_CSS } from './base.css';
import { renderTpl } from './engine';
import { FIT_JS } from './fit';
import type { CardTemplate } from './types';
import type { CardView } from './view';

export const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Oswald:wght@500;700&family=Ma+Shan+Zheng&family=IBM+Plex+Mono:wght@400;600&family=Pinyon+Script&family=Special+Elite&family=Noto+Serif+SC:wght@600;900&family=Noto+Sans+SC:wght@400;500;700;900&display=block';

const ROOT_VARS = `:root{--serif:"Noto Serif SC","Songti SC",serif;--en:"Playfair Display",Georgia,serif;--num:"Oswald","Noto Sans SC",sans-serif;--sans:"Noto Sans SC","PingFang SC",sans-serif;--mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;--brush:"Ma Shan Zheng","Kaiti SC","STKaiti",serif}`;

export type RenderOpts = { fmt?: 'card' | 'share'; own?: boolean; width?: number; scale?: number; type?: 'png' | 'jpeg' };
export type FitReport = { ok: boolean; shrunk: string[]; overflow: string[] };

const OWN_GUIDE = '点右上角「编辑资料」填写公司、职务和联系方式';

export function cardHtml(t: CardTemplate, v: CardView, o: RenderOpts = {}): string {
  const W = o.width ?? 1020;
  const share = o.fmt === 'share';
  const guide = o.own && !v.company && !v.title && !v.ct.length;
  const page = share
    ? `#stage{width:1000px;height:800px;display:flex;align-items:center;justify-content:center;background:radial-gradient(at 50% 35%,#1C3554,#0A1624)}
       #stage .card{width:880px;border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.45)}`
    : `#stage{width:${W}px}#stage .card{width:${W}px;border-radius:0;box-shadow:none}`;
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS_URL}"><style>
${ROOT_VARS}
html,body{margin:0;padding:0;background:transparent;-webkit-font-smoothing:antialiased}
${BASE_CSS}
${t.css}
.card{max-width:none}
.lgimg{color:transparent!important}
.own-guide{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:5;background:rgba(8,18,32,.78);color:#fff;font:500 2.5cqw/1.5 var(--sans);padding:1.4cqw 3cqw;border-radius:99px;white-space:nowrap}
${page}
</style></head><body><div id="stage"><div class="card ${t.cls}">${renderTpl(t.html, v as unknown as Record<string, unknown>)}${guide ? `<div class="own-guide">${OWN_GUIDE}</div>` : ''}</div></div></body></html>`;
}

let browserP: Promise<Browser> | null = null;

async function launch(): Promise<Browser> {
  const puppeteer = (await import('puppeteer-core')).default;
  if (process.env.VERCEL) {
    const chromium = (await import('@sparticuz/chromium')).default;
    return puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true, defaultViewport: null });
  }
  return puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--font-render-hinting=none'],
    defaultViewport: null
  });
}

export async function getBrowser(): Promise<Browser> {
  if (browserP) {
    const b = await browserP.catch(() => null);
    if (b && b.connected) return b;
  }
  browserP = launch();
  return browserP;
}

export async function closeBrowser() {
  if (browserP) (await browserP.catch(() => null))?.close().catch(() => undefined);
  browserP = null;
}

export async function renderCard(t: CardTemplate, v: CardView, o: RenderOpts = {}): Promise<{ buf: Buffer; fit: FitReport; ms: number }> {
  const t0 = Date.now();
  const b = await getBrowser();
  const page = await b.newPage();
  try {
    await page.setViewport({ width: o.fmt === 'share' ? 1000 : o.width ?? 1020, height: 800, deviceScaleFactor: o.scale ?? (o.fmt === 'share' ? 1 : 1.25) });
    await page.setContent(cardHtml(t, v, o), { waitUntil: 'load', timeout: 20000 });
    // 版面排好后字体才开始下载：等字体和图片都到齐
    await page.evaluate(async () => {
      void document.body.offsetHeight;
      await document.fonts.ready;
      await Promise.all(Array.from(document.images).map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
      await document.fonts.ready;
    });
    const fit = (await page.evaluate(FIT_JS)) as FitReport;
    const el = await page.$('#stage');
    const buf = Buffer.from(await el!.screenshot({ type: o.type ?? 'png', ...(o.type === 'jpeg' ? { quality: 90 } : {}) }));
    return { buf, fit, ms: Date.now() - t0 };
  } finally {
    await page.close().catch(() => undefined);
  }
}
