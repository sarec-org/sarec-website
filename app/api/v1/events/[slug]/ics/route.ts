/** GET /api/v1/events/:slug/ics —— 一键加入手机日历 */
import { getPool } from '@/lib/db/client';
import { requireEvent } from '@/lib/crm/flow';
import { handler } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/[\\,;]/g, (m) => '\\' + m).replace(/\n/g, '\\n');
export const GET = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const e = (await requireEvent(getPool(), params.slug)) as unknown as Record<string, unknown> & { starts_at: Date; ends_at: Date | null; title: string; slug: string };
  const end = e.ends_at ?? new Date(e.starts_at.getTime() + 2 * 3600e3);
  const where = [e.location_name, e.address].filter(Boolean).join(' ');
  const url = new URL(req.url);
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SAREC//Events//ZH', 'BEGIN:VEVENT',
    `UID:${e.slug}@sinoamericanrec.org`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(e.starts_at)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(e.title)}`, `LOCATION:${esc(where)}`, `URL:${url.origin}/zh/e/${e.slug}`,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:SAREC 活动提醒', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  return new Response(ics, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="${e.slug}.ics"` } });
});
