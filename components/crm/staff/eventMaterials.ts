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
/**
 * 1.3 门口 A4 签到码（零指导）：码要大；旁边三步“① 打开微信 ② 点右上角 ＋ 扫一扫 ③ 对准这个码”，配一张示意图；
 * 底部一句话告诉对方扫完会怎样（已报名直接签到；没报名填姓名、手机两项）。
 * src.url 只在工作人员明确选择“网页版签到码”时使用（小程序码生成不了的应急情况）。
 */
export async function checkinA4(e: MaterialEvent, src: { codeSrc?: string; url?: string }): Promise<Blob> {
  await document.fonts?.ready;
  const W = 2480, H = 3508;
  const mm = W / 210;
  const { c, g } = canvas(W, H);
  g.fillStyle = '#fff';
  g.fillRect(0, 0, W, H);

  // 顶部：活动名 + 时间（窄条，留出最大空间给码）
  const bandH = 44 * mm;
  g.fillStyle = C.navy;
  g.fillRect(0, 0, W, bandH);
  g.fillStyle = C.gold;
  g.fillRect(0, bandH, W, 1.6 * mm);
  g.textAlign = 'center';
  const when = eventWhen(e);
  const head = e.title;
  let size = 15 * mm;
  g.font = `700 ${size}px ${FONT}`;
  while (g.measureText(head).width > W - 24 * mm && size > 8 * mm) {
    size -= mm / 2;
    g.font = `700 ${size}px ${FONT}`;
  }
  g.fillStyle = C.goldPale;
  g.fillText(head, W / 2, 22 * mm);
  g.fillStyle = C.goldSoft;
  g.font = `400 ${6 * mm}px ${FONT}`;
  g.fillText(`${when.date} ${when.time} · 中美房地产商会`, W / 2, 35 * mm);

  // 大标题
  g.fillStyle = C.navy;
  g.font = `800 ${21 * mm}px ${FONT}`;
  g.fillText('扫码签到', W / 2, bandH + 30 * mm);

  // 大码（约 150mm）
  const box = 152 * mm, bx = (W - box) / 2, by = bandH + 40 * mm;
  g.strokeStyle = C.gold;
  g.lineWidth = 1.6 * mm;
  roundRect(g, bx, by, box, box, 6 * mm);
  g.stroke();
  const qrSize = Math.round(box - 12 * mm);
  const img = src.codeSrc
    ? src.codeSrc
    : await QRCode.toDataURL(src.url || '', { width: qrSize, margin: 0, errorCorrectionLevel: 'M', color: { dark: C.ink, light: '#FFFFFF' } });
  g.drawImage(await loadImg(img), bx + 6 * mm, by + 6 * mm, qrSize, qrSize);

  // 三步 + 示意图
  const top = by + box + 14 * mm;
  const illoW = 52 * mm, illoH = 82 * mm, illoX = 18 * mm;
  drawScanIllustration(g, illoX, top, illoW, illoH, mm);
  const tx = illoX + illoW + 12 * mm;
  g.textAlign = 'left';
  const steps: [string, string][] = [
    ['①', '打开微信'],
    ['②', '点右上角 ＋，再点「扫一扫」'],
    ['③', '对准上面这个码']
  ];
  steps.forEach(([n, t], i) => {
    const y = top + 14 * mm + i * 25 * mm;
    g.fillStyle = C.gold;
    g.font = `800 ${13 * mm}px ${FONT}`;
    g.fillText(n, tx, y);
    g.fillStyle = C.navy;
    let fs = 11 * mm;
    g.font = `700 ${fs}px ${FONT}`;
    while (g.measureText(t).width > W - tx - 30 * mm && fs > 7 * mm) {
      fs -= mm / 2;
      g.font = `700 ${fs}px ${FONT}`;
    }
    g.fillText(t, tx + 16 * mm, y);
  });

  // 扫完会怎样
  g.textAlign = 'center';
  const noteY = top + illoH + 14 * mm;
  g.fillStyle = '#EAF6EE';
  roundRect(g, 14 * mm, noteY - 11 * mm, W - 28 * mm, 30 * mm, 4 * mm);
  g.fill();
  g.fillStyle = '#1F6B3A';
  g.font = `700 ${8.2 * mm}px ${FONT}`;
  g.fillText('已报名：扫完自动签到，不用再点', W / 2, noteY);
  g.font = `400 ${7 * mm}px ${FONT}`;
  g.fillText('没报名：填姓名、手机两项，马上签到', W / 2, noteY + 12 * mm);

  g.fillStyle = C.goldMuted;
  g.font = `400 ${5 * mm}px ${FONT}`;
  g.fillText(src.codeSrc ? '扫不了？请找门口工作人员' : '网页版签到码 · 扫不了请找门口工作人员', W / 2, H - 12 * mm);
  return toBlob(c);
}

/** 示意图：一只手机，右上角“＋”菜单里的「扫一扫」，屏幕上对准一个码 */
function drawScanIllustration(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, mm: number) {
  g.save();
  // 机身
  g.fillStyle = C.navy;
  roundRect(g, x, y, w, h, 7 * mm);
  g.fill();
  g.fillStyle = '#FFFFFF';
  roundRect(g, x + 3 * mm, y + 7 * mm, w - 6 * mm, h - 14 * mm, 3 * mm);
  g.fill();
  // 顶栏：右上角的 ＋
  const sx = x + 3 * mm, sy = y + 7 * mm, sw = w - 6 * mm;
  g.fillStyle = '#EDEDED';
  g.fillRect(sx, sy, sw, 10 * mm);
  g.strokeStyle = C.navy;
  g.lineWidth = 1.1 * mm;
  const px = sx + sw - 6 * mm, py = sy + 5 * mm;
  g.beginPath();
  g.arc(px, py, 3.4 * mm, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.moveTo(px - 2 * mm, py); g.lineTo(px + 2 * mm, py);
  g.moveTo(px, py - 2 * mm); g.lineTo(px, py + 2 * mm);
  g.stroke();
  // 下拉菜单：「扫一扫」
  const mx = sx + sw - 30 * mm, my = sy + 11 * mm;
  g.fillStyle = '#4C4C4C';
  roundRect(g, mx, my, 28 * mm, 11 * mm, 1.5 * mm);
  g.fill();
  g.fillStyle = '#FFFFFF';
  g.font = `600 ${4.6 * mm}px ${FONT}`;
  g.textAlign = 'center';
  g.fillText('扫一扫', mx + 14 * mm, my + 7.6 * mm);
  // 屏幕中间：取景框 + 小码
  const fx = sx + sw / 2 - 15 * mm, fy = sy + 30 * mm, fs = 30 * mm;
  g.strokeStyle = '#19B35A';
  g.lineWidth = 1.2 * mm;
  const k = 7 * mm;
  [[fx, fy, 1, 1], [fx + fs, fy, -1, 1], [fx, fy + fs, 1, -1], [fx + fs, fy + fs, -1, -1]].forEach(([cx, cy, dx, dy]) => {
    g.beginPath();
    g.moveTo(cx, cy + dy * k); g.lineTo(cx, cy); g.lineTo(cx + dx * k, cy);
    g.stroke();
  });
  g.fillStyle = C.navy;
  const cell = 3 * mm;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if ((i * 7 + j * 3 + i * j) % 3 !== 0) g.fillRect(fx + 6 * mm + i * cell, fy + 6 * mm + j * cell, cell * 0.9, cell * 0.9);
  // 扫描线
  g.strokeStyle = 'rgba(25,179,90,0.8)';
  g.lineWidth = 0.8 * mm;
  g.beginPath();
  g.moveTo(fx + 2 * mm, fy + fs / 2); g.lineTo(fx + fs - 2 * mm, fy + fs / 2);
  g.stroke();
  g.restore();
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
