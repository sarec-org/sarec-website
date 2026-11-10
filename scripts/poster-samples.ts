/**
 * AI 海报样张（不连库）：用指定画图服务按正式流程（同一套指令模板 + 叠字）出 11/13 讲座的候选图，存桌面给东哥看画质。
 * 用法：POSTER_IMAGE_PROVIDER=pollinations pnpm dlx tsx scripts/poster-samples.ts <输出目录> <文件名前缀，如 免费-Pollinations-0元>
 * 活动信息取自正式站公开接口（只读）。
 */
import { mkdir, writeFile } from 'node:fs/promises';
import QRCode from 'qrcode';
import { buildPrompt, styleOf } from '@/lib/poster/styles';
import { imageProvider, normalize } from '@/lib/poster/providers';
import { composePoster } from '@/lib/poster/compose';
import { checkinLine } from '@/lib/crm/checkinTime';
import { fullDate } from '@/lib/crm/home131';

const SLUG = '2026-11-13-cybercab-e15c';
const RUNS = [
  { style: 'road', label: '讲座×公路片', subject: 'a sleek futuristic driverless electric robotaxi pod with no steering wheel, generic unbranded concept design, driving alone toward the horizon', film: '无人之境', tagline: '这条路上，没有司机' },
  { style: 'neural', label: '讲座×AI未来感', subject: 'a futuristic driverless robotaxi pod, generic unbranded concept design, parked at a glowing charging hub inside a multi-story parking structure, surrounded by a luminous neural network of light', film: '车位觉醒', tagline: '下一个房客，没有驾照' }
];

async function main() {
  const [out, prefix] = process.argv.slice(2);
  await mkdir(out, { recursive: true });
  const { p, note } = imageProvider();
  if (note) throw new Error(note);
  const j = (await (await fetch('https://sinoamericanrec.org/api/v1/events')).json()) as { events: { slug: string; title: string; startsAt: string; checkinStartsAt: string | null; timezone: string; tzLabel: string; locationName: string | null; address: string | null }[] };
  const e = j.events.find((x) => x.slug === SLUG);
  if (!e) throw new Error('找不到 11/13 活动');
  const tz = e.timezone || 'America/Los_Angeles';
  const qr = await QRCode.toBuffer(`https://sinoamericanrec.org/zh/e/${SLUG}`, { margin: 1, width: 480 });
  const log: string[] = [];
  for (const r of RUNS) {
    const prompt = buildPrompt({ type: 'lecture', style: r.style, subject: r.subject });
    log.push(`## ${r.label}\n服务：${p.label} ${p.model}，约 $${p.costPerImage}/张\n指令：${prompt}\n`);
    for (let i = 1; i <= 4; i++) {
      const seed = 1000 + i * 7919;
      let raw: Buffer | null = null;
      for (let tries = 0; tries < 3 && !raw; tries++) {
        try { raw = await normalize(await p.generate(prompt, seed)); } catch (err) { console.log('retry', r.label, i, (err as Error).message); await new Promise((s) => setTimeout(s, 20_000)); }
      }
      if (!raw) { log.push(`候选${i}：失败`); continue; }
      const base = `${out}/${prefix}-${r.label}-候选${i}`;
      await writeFile(`${base}-主视觉原图.jpg`, raw);
      const text = { tagline: r.tagline, filmTitle: r.film, subtitle: e.title, credits: { host: 'SAREC 中美房地产商会' }, dateLine: fullDate(new Date(e.startsAt), tz), timeLine: `${checkinLine({ starts_at: e.startsAt, checkin_starts_at: e.checkinStartsAt }, tz)}（${e.tzLabel}）`, place: [e.locationName, e.address].filter(Boolean).join(' · ') };
      for (const size of i === 1 ? (['tall', 'square', 'oa'] as const) : (['tall'] as const)) {
        const png = await composePoster({ bg: raw, size, style: styleOf(r.style), text, qr });
        await writeFile(`${base}-${{ tall: '竖版1080x1620', square: '方版1080x1080', oa: '公众号头图900x383' }[size]}.png`, png);
      }
      console.log('ok', r.label, i);
      if (p.key === 'pollinations') await new Promise((s) => setTimeout(s, 16_000)); // 匿名限速
    }
  }
  await writeFile(`${out}/${prefix}-所用指令.md`, log.join('\n'));
}
main().catch((e) => { console.error(e); process.exit(1); });
