/** POST /api/v1/track { client: 'mp'|'web', visitor?, items: [{ name, target?, channel?, ref?, meta? }] } —— 点击 / 分享 / 海报 / 名片打开 / 带来源访问 */
import { track } from '@/lib/crm/growth';
import { body, handler, ok, optionalContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const me = await optionalContact(req);
  const b = await body<{ client?: string; visitor?: string; items?: unknown[] }>(req);
  const items = (Array.isArray(b.items) ? b.items : []).filter((x): x is { name: string } => !!x && typeof (x as { name?: unknown }).name === 'string');
  const client = b.client === 'web' ? 'web' : 'mp';
  const visitor = typeof b.visitor === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(b.visitor) ? b.visitor : null;
  return ok(await track(client, me, visitor, items as never));
});
