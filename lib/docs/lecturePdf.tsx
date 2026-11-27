/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text -- 这里的 <img> 是给 next/og 出图用的，不是网页 */
/**
 * 指令 103 / 104：讲座课件 PDF 的两步加工（纯 JS：MuPDF WebAssembly + sharp + next/og，不装系统软件、不用付费服务）。
 * 1. 手机版压缩（104-7）：把 PDF 里大图重新压成 JPEG（长边最多 2000 / 1400 像素），目标单份 10MB 以内；文字、矢量不动。
 *    原稿另外保留给电脑下载。图片本来就小的、压了反而更大的不换。
 * 2. 最后加一页「扫码下载本场课件 · 中美房地产商会」＋这份课件的小程序码（104-5）。每页不加水印。
 *    这一页是一整张图（字用 NotoSansSC-Bold，和模板海报同一个字体），页面大小和原 PDF 最后一页一样。
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';

export const MOBILE_TARGET = 10 * 1024 * 1024;
/** 小于这个大小的 PDF 不压（4G 下几秒就开） */
const SKIP_BELOW = 3 * 1024 * 1024;

type Mupdf = typeof import('mupdf');
type PDFDocument = InstanceType<Mupdf['PDFDocument']>;

let fontCache: Promise<Buffer> | null = null;
function font(): Promise<Buffer> {
  if (!fontCache) {
    fontCache = readFile(path.join(process.cwd(), 'lib/org/fonts/NotoSansSC-Bold.otf')).catch((e) => {
      fontCache = null;
      throw e;
    });
  }
  return fontCache;
}

/** 一遍压图：长边 maxSide、JPEG 质量 q。返回换了几张 */
async function recompressImages(mupdf: Mupdf, doc: PDFDocument, maxSide: number, q: number): Promise<number> {
  const n = doc.countObjects();
  // 当别的图的透明蒙版（SMask）用的那些图不动
  const masks = new Set<number>();
  for (let i = 1; i < n; i++) {
    try {
      const ref = doc.newIndirect(i);
      if (!ref.isStream()) continue; // isStream 要在间接引用上问（resolve 之后是字典）
      const sm = ref.resolve().get('SMask');
      if (sm.isIndirect()) masks.add(sm.asIndirect());
    } catch { /* 坏对象跳过 */ }
  }
  let changed = 0;
  for (let i = 1; i < n; i++) {
    if (masks.has(i)) continue;
    try {
      const ref = doc.newIndirect(i);
      if (!ref.isStream()) continue;
      const o = ref.resolve();
      if (o.get('Subtype').toString() !== '/Image') continue;
      if (o.get('ImageMask').isBoolean() && o.get('ImageMask').asBoolean()) continue;
      if (o.get('Mask').isArray()) continue; // 色键蒙版：有损压缩后会对不上，不动
      const raw = ref.readRawStream();
      if (raw.length < 120 * 1024) continue;
      const img = doc.loadImage(ref);
      let pix = img.toPixmap();
      const cs = pix.getColorSpace();
      const gray = !!cs && cs.isGray();
      if (!gray && (!cs || !cs.isRGB())) pix = pix.convertToColorSpace(mupdf.ColorSpace.DeviceRGB, false);
      else if (pix.getAlpha()) pix = pix.convertToColorSpace(gray ? mupdf.ColorSpace.DeviceGray : mupdf.ColorSpace.DeviceRGB, false);
      const w = pix.getWidth();
      const h = pix.getHeight();
      const ch = pix.getNumberOfComponents() + pix.getAlpha();
      if (ch !== 1 && ch !== 3) continue;
      const px = pix.getPixels();
      let s = sharp(Buffer.from(px.buffer, px.byteOffset, px.byteLength), { raw: { width: w, height: h, channels: ch as 1 | 3 } });
      if (Math.max(w, h) > maxSide) s = s.resize({ width: maxSide, height: maxSide, fit: 'inside' });
      const { data, info } = await s.jpeg({ quality: q, mozjpeg: true }).toBuffer({ resolveWithObject: true });
      if (data.length >= raw.length * 0.85) continue;
      ref.writeRawStream(data);
      o.put('Filter', doc.newName('DCTDecode'));
      o.put('Width', info.width);
      o.put('Height', info.height);
      o.put('BitsPerComponent', 8);
      o.put('ColorSpace', doc.newName(info.channels === 1 ? 'DeviceGray' : 'DeviceRGB'));
      o.delete('DecodeParms');
      o.delete('Decode');
      changed++;
    } catch { /* 这张图处理不了就保持原样 */ }
  }
  return changed;
}

/** 手机版：PDF 超过 3MB 就压图，目标 10MB 以内。压不下来也返回能压到的最小版本（原稿另存） */
export async function mobilePdf(pdf: Buffer): Promise<{ buf: Buffer; compressed: boolean; images: number }> {
  if (pdf.length <= SKIP_BELOW) return { buf: pdf, compressed: false, images: 0 };
  const mupdf = await import('mupdf');
  let best = pdf;
  let images = 0;
  for (const [side, q] of [[2000, 78], [1400, 68], [1100, 60]] as const) {
    const doc = mupdf.Document.openDocument(pdf, 'application/pdf').asPDF();
    if (!doc) break;
    const n = await recompressImages(mupdf, doc, side, q);
    const out = Buffer.from(doc.saveToBuffer('garbage=compact,compress').asUint8Array());
    if (out.length < best.length) { best = out; images = n; }
    if (best.length <= MOBILE_TARGET) break;
  }
  return { buf: best, compressed: best !== pdf, images };
}

/** 最后一页的图：上面讲座名，中间小程序码，下面「扫码下载本场课件 · 中美房地产商会」 */
export async function qrPagePng(qr: Buffer, eventTitle: string, wPt: number, hPt: number): Promise<{ png: Buffer; W: number; H: number }> {
  const W = 1600;
  const H = Math.max(600, Math.min(3200, Math.round((W * hPt) / Math.max(1, wPt))));
  const side = Math.round(Math.min(W * 0.5, H * 0.52));
  const fs = Math.round(Math.min(W / 22, H / 14));
  const title = Array.from(eventTitle).length > 26 ? Array.from(eventTitle).slice(0, 25).join('') + '…' : eventTitle;
  const qrData = `data:image/png;base64,${(await sharp(qr).resize(side, side, { fit: 'contain', background: '#ffffff' }).png().toBuffer()).toString('base64')}`;
  const res = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#ffffff', fontFamily: 'NotoSansSC', color: '#1F2A2E' }}>
        {title ? <div style={{ fontSize: Math.round(fs * 0.8), color: '#5A6B70', marginBottom: Math.round(fs * 0.8), display: 'flex' }}>{title}</div> : null}
        <img src={qrData} width={side} height={side} />
        <div style={{ fontSize: fs, marginTop: Math.round(fs * 0.9), display: 'flex' }}>扫码下载本场课件 · 中美房地产商会</div>
        <div style={{ fontSize: Math.round(fs * 0.55), marginTop: Math.round(fs * 0.4), color: '#7A8A8F', display: 'flex' }}>微信扫一扫，在小程序里翻看、下载、转发</div>
      </div>
    ),
    { width: W, height: H, fonts: [{ name: 'NotoSansSC', data: await font(), weight: 700, style: 'normal' }] }
  );
  return { png: Buffer.from(await res.arrayBuffer()), W, H };
}

/** 在 PDF 最后加一页整图（页面大小 = 原最后一页） */
export async function appendQrPage(pdf: Buffer, qr: Buffer, eventTitle: string): Promise<Buffer> {
  const mupdf = await import('mupdf');
  const doc = mupdf.Document.openDocument(pdf, 'application/pdf').asPDF();
  if (!doc) throw new Error('not a pdf');
  const last = doc.loadPage(doc.countPages() - 1);
  const [x0, y0, x1, y1] = last.getBounds();
  const wPt = Math.max(100, x1 - x0);
  const hPt = Math.max(100, y1 - y0);
  const { png } = await qrPagePng(qr, eventTitle, wPt, hPt);
  const jpg = await sharp(png).flatten({ background: '#ffffff' }).jpeg({ quality: 88 }).toBuffer();
  const imgRef = doc.addImage(new mupdf.Image(jpg));
  const res = doc.newDictionary();
  const xo = doc.newDictionary();
  xo.put('Im0', imgRef);
  res.put('XObject', xo);
  const page = doc.addPage([0, 0, wPt, hPt], 0, res, `q ${wPt.toFixed(2)} 0 0 ${hPt.toFixed(2)} 0 0 cm /Im0 Do Q`);
  doc.insertPage(-1, page);
  return Buffer.from(doc.saveToBuffer('garbage=compact,compress').asUint8Array());
}
