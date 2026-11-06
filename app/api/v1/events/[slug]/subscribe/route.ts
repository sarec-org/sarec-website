/** POST /api/v1/events/:slug/subscribe { accepted: [模板ID 或 'day_before' / 'two_hours'] } —— 小程序：用户允许的活动提醒 */
import { savePhotoSubscription, saveSubscriptions, subscribeTemplates } from '@/lib/crm/reminders';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const me = await requireContact(req);
  const b = await body<{ accepted?: unknown }>(req);
  const accepted = Array.isArray(b.accepted) ? b.accepted.filter((x): x is string => typeof x === 'string').slice(0, 5) : [];
  // 日志只记模板 ID、结果和错误码，不记个人信息
  // 1.2：签到后“照片上传时通知我”（photos 模板）
  const ph = subscribeTemplates().photos;
  if (accepted.includes('photos') || (ph && accepted.includes(ph.id))) {
    const r = await savePhotoSubscription(me, params.slug, accepted);
    console.log(`[subscribe] photos saved=${r.saved}`);
    if (accepted.every((a) => a === 'photos' || a === ph?.id)) return ok({ saved: r.saved ? ['photos'] : [], confirmSent: false });
  }
  try {
    const r = await saveSubscriptions(me, params.slug, accepted);
    console.log(`[subscribe] accepted=${JSON.stringify(accepted)} saved=${JSON.stringify(r.saved)} confirmSent=${r.confirmSent}${r.confirmError ? ` confirmError=${r.confirmError}` : ''}`);
    return ok({ saved: r.saved, confirmSent: r.confirmSent });
  } catch (e) {
    console.log(`[subscribe] accepted=${JSON.stringify(accepted)} error=${(e as { code?: string }).code ?? (e instanceof Error ? e.message.slice(0, 80) : 'error')}`);
    throw e;
  }
});
