/** 1.3 F 渠道码（ops）
 *  GET  /api/v1/staff/channels?days=30|7|0&eventId= —— 渠道列表 + 每个渠道带来的访问 / 报名 / 到场 / 入会 / 有效咨询
 *  POST /api/v1/staff/channels { name, kind, note } —— 新建渠道（自动生成 c-xxxx）
 *  PATCH /api/v1/staff/channels { id, active?, name?, note? } */
import { createChannel, listChannels, updateChannel } from '@/lib/crm/channels';
import { actor } from '@/lib/crm/staff';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const win = (req: Request) => {
  const sp = new URL(req.url).searchParams;
  const ev = sp.get('eventId');
  return { days: ev ? null : Number(sp.get('days') ?? 30) || null, eventId: ev && /^[0-9a-f-]{36}$/.test(ev) ? ev : null };
};
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok({ channels: await listChannels(win(req)) });
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  return ok({ channel: await createChannel(actor(s), await body(req)) });
});
export const PATCH = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const b = await body<{ id?: number; active?: unknown; name?: unknown; note?: unknown }>(req);
  return ok(await updateChannel(Number(b.id), b));
});
