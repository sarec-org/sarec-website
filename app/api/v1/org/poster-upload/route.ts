/**
 * POST /api/v1/org/poster-upload（multipart: file, aiGenerated=true|false 必填, org? 主办方 id）—— 1.7.0「传自己的海报」。
 * 主办方登录；开关 poster_upload_on 关着 → 403「暂未开放」。返回 { ok, ownId, url }；发布 / 改活动时把 ownId 作为 posterOwn 带上。
 * 图过微信图片检测（imageGate）。⚠ 二维码拦截还没做，开开关前要补（见 lib/org/posterOwn.ts）。
 */
import { CrmError } from '@/lib/crm/events';
import { handler, ok, requireContact, siteUrl } from '@/lib/crm/http';
import { uploadOwnPoster } from '@/lib/org/posterOwn';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const POST = handler(async (req: Request) => {
  const me = await requireContact(req);
  const form = await req.formData().catch(() => null);
  const f = form?.get('file');
  if (!f || typeof f === 'string') throw new CrmError('bad_request', '请选一张图片');
  const org = form?.get('org');
  return ok(await uploadOwnPoster(me, { file: Buffer.from(await f.arrayBuffer()), aiGenerated: form?.get('aiGenerated') ?? null, org: typeof org === 'string' && org ? org : null }, siteUrl(req)));
});
