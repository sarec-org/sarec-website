/** GET /api/v1/events/:slug —— 活动详情 + 本人报名状态 + 本次需回答的必答题（预览，不写数据） */
import { previewRegistration } from '@/lib/crm/flow';
import { handler, isMp12, ok, optionalContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 小程序 1.2 不显示任何价格或金额：工作人员写的活动简介里带金额的句子，给小程序时去掉（网站照常显示）
const MONEY_RE = /[$＄￥¥]\s*\d|\d[\d,.]*\s*(美元|美金|元|块|刀|usd|rmb)|(usd|rmb)\s*\d|会费|票价|收费标准/i;
function noMoney(text: string | null | undefined): string | null {
  if (!text) return text ?? null;
  const kept = text
    .split(/(?<=[。！？；;!?\n])/)
    .filter((s) => !MONEY_RE.test(s))
    .join('')
    .trim();
  return kept || null;
}

export const GET = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const data = await previewRegistration(params.slug, await optionalContact(req));
  if (await isMp12(req)) {
    const d = data as { event?: { summary?: string | null } };
    if (d.event && 'summary' in d.event) d.event.summary = noMoney(d.event.summary);
  }
  return ok(data);
});
