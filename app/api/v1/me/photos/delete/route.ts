/** 指令 56（11/23）：一次删好几张自己的照片（小程序照苹果相册：选择 → 打勾 → 垃圾桶 → 确认一次）。只能删自己传的；最多 100 张。 */
import { deleteMyPhoto } from '@/lib/crm/customerPhotos';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = handler(async (req: Request) => {
  const me = await requireContact(req);
  const b = await body<{ ids?: unknown }>(req);
  const ids = Array.isArray(b.ids) ? Array.from(new Set(b.ids.filter((x): x is string => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x)))).slice(0, 100) : [];
  let deleted = 0;
  const failed: string[] = [];
  for (const id of ids) {
    try {
      await deleteMyPhoto(me, id);
      deleted++;
    } catch {
      failed.push(id);
    }
  }
  return ok({ deleted, failed });
});
