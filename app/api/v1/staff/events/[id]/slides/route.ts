/**
 * 指令 103「传课件」（网站活动页、小程序工作台活动页都用；运营能用）：
 * GET  → 这场的课件列表 { event, docs, uploadPrefix }
 * POST { url, name?, isPublic?, audience? }   网站：浏览器已直传图片存储的 PDF
 *      { up, parts, name, isPublic?, audience? } 小程序：分块传完（/api/v1/staff/docs/chunk）后拼起来
 *      { skip: true }                          「这场没有课件」，工作台不再提醒
 *      { docId, isPublic?, audience? }         改一份：公开 / 先不公开、所有人 / 仅会员
 * 只收 PDF；PPT 给提示"先另存为 PDF"（服务器转 PPT 要付费服务，没做）。
 */
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff, siteUrl } from '@/lib/crm/http';
import { BLOB_PREFIX } from '@/lib/crm/photos';
import { eventSlides, joinChunks, pptHint, skipSlides, updateSlide, uploadSlides } from '@/lib/docs/slides';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
const OURS = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//i;

export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireStaff(req, 'ops');
  return ok({ ...(await eventSlides(params.id, siteUrl(req))), uploadPrefix: BLOB_PREFIX });
});

export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await requireStaff(req, 'ops');
  const b = await body<{ url?: string; up?: string; parts?: number; name?: string; isPublic?: boolean; audience?: string; skip?: boolean; docId?: string }>(req);
  if (b.skip === true) return ok(await skipSlides(s, params.id));
  const opts = { isPublic: b.isPublic !== false, audience: b.audience === 'members' ? 'members' as const : 'all' as const };
  if (b.docId) {
    const d = await updateSlide(params.id, b.docId, { isPublic: b.isPublic, audience: b.audience });
    return ok({ message: `已改好：${d.is_public ? '公开' : '先不公开'} · ${d.audience === 'members' ? '仅会员看完整版' : '所有人能看能下'}`, ...(await eventSlides(params.id, siteUrl(req))) });
  }
  const name = typeof b.name === 'string' ? b.name.slice(0, 120) : '';
  const hint = pptHint(name);
  if (hint) throw new CrmError('bad_request', hint);
  let pdf: Buffer;
  let url: string | null = null;
  if (b.url) {
    if (!OURS.test(b.url)) throw new CrmError('bad_request', 'PDF 地址不对，请重新上传');
    const r = await fetch(b.url, { cache: 'no-store' });
    if (!r.ok) throw new CrmError('bad_request', 'PDF 取不到，请重新上传');
    pdf = Buffer.from(await r.arrayBuffer());
    url = b.url;
  } else if (b.up) {
    pdf = await joinChunks(String(b.up), Number(b.parts));
  } else throw new CrmError('bad_request', '请先选一个 PDF');
  const r = await uploadSlides(s, params.id, pdf, url, name, opts);
  return ok({ doc: { id: r.doc.id, slug: r.doc.slug, title: r.doc.title, pageCount: r.doc.pages.length, isPublic: r.doc.is_public }, message: r.message, ...(await eventSlides(params.id, siteUrl(req))) });
});
