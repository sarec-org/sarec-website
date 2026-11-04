'use client';
/**
 * 活动物料（浏览器端用 canvas 画，服务器上没有中文字体）：
 * - 报名海报：竖版 2160×3840，深蓝金色，适合朋友圈 / 微信群
 * - A4 签到码：2480×3508（300dpi），白底深蓝，打印贴门口
 */
import QRCode from 'qrcode';

export type MaterialEvent = {
  slug: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  timezone?: string | null;
  location_name?: string | null;
  address?: string | null;
  fee_cents?: number | null;
  capacity?: number | null;
};

const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",sans-serif';
const C = { ink: '#041421', navy: '#071B2C', navyTop: '#123150', gold: '#C8A15A', goldSoft: '#D6B56B', goldPale: '#F5DCA0', goldMid: '#ECD292', goldMuted: '#B89656', ivory: '#F7F3EB', carbon: '#24384A' };
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function parts(iso: string, tz: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value])
  );
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { md: `${p.month} 月 ${p.day} 日`, wd: WEEK[wd] ?? '', hm: `${p.hour === '24' ? '00' : p.hour}:${p.minute}` };
}

/** “11 月 6 日 周五”、“14:00–17:00” */
export function eventWhen(e: MaterialEvent): { date: string; time: string } {
  const tz = e.timezone || 'America/Los_Angeles';
  const s = parts(e.starts_at, tz);
  const t = e.ends_at ? `${s.hm}–${parts(e.ends_at, tz).hm}` : s.hm;
  return { date: `${s.md} ${s.wd}`, time: t };
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('图片加载失败'));
    i.src = src;
  });
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** 字距（canvas letterSpacing 不是所有浏览器都支持，逐字画） */
function spaced(g: CanvasRenderingContext2D, text: string, cx: number, y: number, gap: number) {
  const chars = Array.from(text);
  const widths = chars.map((c) => g.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
  let x = cx - total / 2;
  const align = g.textAlign;
  g.textAlign = 'left';
  chars.forEach((c, i) => {
    g.fillText(c, x, y);
    x += widths[i] + gap;
  });
  g.textAlign = align;
}

/** 按宽度折行（地址等） */
function wrap(g: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  // 英文地址优先在逗号后断行
  const chunks = text.split(/(?<=,)\s*/);
  let line = '';
  for (const ch of chunks) {
    const next = line ? `${line} ${ch}` : ch;
    if (g.measureText(next).width <= maxW) line = next;
    else {
      if (line) out.push(line);
      line = ch;
    }
  }
  if (line) out.push(line);
  return out;
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d') as CanvasRenderingContext2D };
}

function toBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('生成图片失败'))), 'image/png'));
}

/** 报名海报：codeSrc 为小程序码图片（blob/data URL） */
export async function registerPoster(e: MaterialEvent, codeSrc: string): Promise<Blob> {
  await document.fonts?.ready;
  const W = 2160, H = 3840;
  const { c, g } = canvas(W, H);
  const bg = g.createRadialGradient(W / 2, -380, 100, W / 2, -380, 3000);
  bg.addColorStop(0, C.navyTop);
  bg.addColorStop(0.45, C.navy);
  bg.addColorStop(1, C.ink);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(200,161,90,.55)';
  g.lineWidth = 4;
  roundRect(g, 80, 80, W - 160, H - 160, 56);
  g.stroke();

  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillStyle = C.goldSoft;
  g.font = `400 60px ${FONT}`;
  spaced(g, '中美房地产商会 · SAREC', W / 2, 380, 24);

  // 标题（过长自动缩小）
  let size = 336;
  g.font = `700 ${size}px ${FONT}`;
  while (g.measureText(e.title).width > W - 360 && size > 140) {
    size -= 8;
    g.font = `700 ${size}px ${FONT}`;
  }
  const tg = g.createLinearGradient(0, 600, 0, 900);
  tg.addColorStop(0, C.goldPale);
  tg.addColorStop(1, C.gold);
  g.fillStyle = tg;
  g.fillText(e.title, W / 2, 880);

  g.fillStyle = C.ivory;
  g.font = `500 100px ${FONT}`;
  spaced(g, '中美房地产商会讲座', W / 2, 1110, 6);

  g.fillStyle = C.gold;
  g.fillRect(W / 2 - 180, 1260, 360, 6);

  const when = eventWhen(e);
  g.font = `600 88px ${FONT}`;
  const dW = g.measureText(when.date).width;
  g.font = `400 88px ${FONT}`;
  const tW = g.measureText(when.time).width;
  const gap = 56;
  let x = W / 2 - (dW + gap + tW) / 2;
  g.textAlign = 'left';
  g.font = `600 88px ${FONT}`;
  g.fillStyle = C.goldSoft;
  g.fillText(when.date, x, 1500);
  x += dW + gap;
  g.font = `400 88px ${FONT}`;
  g.fillStyle = C.ivory;
  g.fillText(when.time, x, 1500);
  g.textAlign = 'center';

  const place = e.address || e.location_name || '';
  g.font = `400 68px ${FONT}`;
  g.fillStyle = 'rgba(247,243,235,.82)';
  wrap(g, place, W - 440).slice(0, 3).forEach((l, i) => g.fillText(l, W / 2, 1660 + i * 100));

  // 胶囊标签：免费 / 费用、限 N 人
  const tags = [e.fee_cents ? `费用 $${(e.fee_cents / 100).toFixed(e.fee_cents % 100 ? 2 : 0)}` : '免费参加'];
  if (e.capacity) tags.push(`限 ${e.capacity} 人`);
  g.font = `600 80px ${FONT}`;
  const padX = 92, tagH = 172, tagGap = 56;
  const tws = tags.map((t) => g.measureText(t).width + padX * 2);
  let tx = W / 2 - (tws.reduce((a, b) => a + b, 0) + tagGap * (tags.length - 1)) / 2;
  const tagY = 1900;
  tags.forEach((t, i) => {
    const pg = g.createLinearGradient(0, tagY, 0, tagY + tagH);
    pg.addColorStop(0, C.goldMid);
    pg.addColorStop(1, C.gold);
    g.fillStyle = pg;
    roundRect(g, tx, tagY, tws[i], tagH, tagH / 2);
    g.fill();
    g.fillStyle = C.ink;
    g.fillText(t, tx + tws[i] / 2, tagY + 114);
    tx += tws[i] + tagGap;
  });

  // 小程序码白卡
  const card = 1040, cy = 2190;
  g.save();
  g.shadowColor = 'rgba(0,0,0,.35)';
  g.shadowBlur = 120;
  g.shadowOffsetY = 40;
  g.fillStyle = '#fff';
  roundRect(g, W / 2 - card / 2, cy, card, card, 72);
  g.fill();
  g.restore();
  const code = await loadImg(codeSrc);
  const pad = 68;
  g.drawImage(code, W / 2 - card / 2 + pad, cy + pad, card - pad * 2, card - pad * 2);

  g.fillStyle = C.goldPale;
  g.font = `700 112px ${FONT}`;
  spaced(g, '微信扫码报名', W / 2, cy + card + 200, 20);

  g.fillStyle = 'rgba(214,181,107,.8)';
  g.font = `400 56px ${FONT}`;
  spaced(g, 'SINO-AMERICAN REAL ESTATE CHAMBER', W / 2, H - 200, 8);
  return toBlob(c);
}

/** A4 打印版签到码（300dpi）：优先放签到小程序码（codeSrc，微信扫一扫直接进小程序）；没有时用签到链接画普通二维码 */
export async function checkinA4(e: MaterialEvent, src: { codeSrc?: string; url?: string }): Promise<Blob> {
  await document.fonts?.ready;
  const W = 2480, H = 3508;
  const mm = W / 210;
  const { c, g } = canvas(W, H);
  g.fillStyle = '#fff';
  g.fillRect(0, 0, W, H);

  const bandH = 62 * mm;
  const band = g.createLinearGradient(0, 0, 0, bandH);
  band.addColorStop(0, C.navy);
  band.addColorStop(1, C.ink);
  g.fillStyle = band;
  g.fillRect(0, 0, W, bandH);
  const gl = g.createLinearGradient(0, 0, W, 0);
  gl.addColorStop(0, C.goldMuted);
  gl.addColorStop(0.5, C.goldMid);
  gl.addColorStop(1, C.goldMuted);
  g.fillStyle = gl;
  g.fillRect(0, bandH, W, 2.2 * mm);

  g.textAlign = 'center';
  g.fillStyle = C.goldSoft;
  g.font = `400 ${5 * mm}px ${FONT}`;
  spaced(g, '中美房地产商会 · SAREC', W / 2, 21 * mm, 2.4 * mm);

  const head = `${e.title} · 现场签到`;
  let size = 19 * mm;
  g.font = `700 ${size}px ${FONT}`;
  while (g.measureText(head).width > W - 24 * mm && size > 9 * mm) {
    size -= mm / 2;
    g.font = `700 ${size}px ${FONT}`;
  }
  g.fillStyle = C.goldPale;
  g.fillText(head, W / 2, 48 * mm);

  // 二维码 + 金框
  const box = 140 * mm, bx = (W - box) / 2, by = bandH + 2.2 * mm + 20 * mm;
  g.strokeStyle = C.gold;
  g.lineWidth = 1.2 * mm;
  roundRect(g, bx, by, box, box, 6 * mm);
  g.stroke();
  const qrSize = Math.round(box - 12 * mm);
  const img = src.codeSrc
    ? src.codeSrc
    : await QRCode.toDataURL(src.url || '', { width: qrSize, margin: 0, errorCorrectionLevel: 'M', color: { dark: C.ink, light: '#FFFFFF' } });
  g.drawImage(await loadImg(img), bx + 6 * mm, by + 6 * mm, qrSize, qrSize);

  g.fillStyle = C.navy;
  g.font = `700 ${15 * mm}px ${FONT}`;
  spaced(g, '微信扫码签到', W / 2, by + box + 26 * mm, 2 * mm);

  const when = eventWhen(e);
  g.fillStyle = C.carbon;
  g.font = `400 ${5.2 * mm}px ${FONT}`;
  g.fillText(`${when.date} ${when.time} · 未报名可现场扫码报名并签到`, W / 2, by + box + 40 * mm);

  g.fillStyle = C.goldMuted;
  g.font = `400 ${4 * mm}px ${FONT}`;
  spaced(g, 'SINO-AMERICAN REAL ESTATE CHAMBER', W / 2, H - 12 * mm, 1.2 * mm);
  return toBlob(c);
}

export function saveBlob(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}
