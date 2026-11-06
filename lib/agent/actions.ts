/**
 * AI 助手 —— 访客在确认卡片上点击后的动作（访客确认后才提交）。
 *   lead：调用现有 createInquiry（生成待跟进任务 + 邮件通知 info@，同一对话只生成一次）。
 *   registered：报名由前端直接调用现有报名接口；这里只记录“通过助手报名成功”。
 */
import { createInquiry } from '@/lib/crm/inquiries';
import { CrmError } from '@/lib/crm/events';
import { MAX_OUTPUT_TOKENS, isMockMode } from './config';
import { budgetState } from './budget';
import type { LeadInfo } from './intent';
import { callModel, providerAvailable } from './providers';
import { addMessage, bumpDaily, getConversation, markLead, markRegistered, updateConversation } from './store';
import { clip, extractEmail, extractPhone } from './text';

const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

export function leadMessage(l: LeadInfo): string {
  return [
    `需求：${l.need || '—'}`,
    `地区：${l.region || '—'}`,
    `时间安排：${l.timeline || '—'}`,
    `约创始人电话：${l.wantsCall === true ? '愿意' : l.wantsCall === false ? '暂不' : '未确认'}`
  ].join('\n');
}

function templateDraft(l: LeadInfo): string {
  return `${l.name || ''}您好，我是 SAREC 中美房地产商会的工作人员。看到您在网站上和 AI 助手聊到${l.need ? '「' + clip(l.need, 40) + '」' : '项目合作'}${l.region ? '（' + l.region + '）' : ''}，${l.wantsCall ? '想跟您约个时间，请创始人和您通 15 分钟电话' : '想跟您进一步了解具体情况'}。您看什么时间方便？`;
}

/** 联系草稿：有模型且预算允许时用模型写（访客点击触发，不是后台任务）；否则用模板（标为模板）。 */
async function draftFor(l: LeadInfo): Promise<{ draft: string | null; costMicros: number }> {
  try {
    const b = await budgetState();
    if (b.level === 'stop') return { draft: null, costMicros: 0 };
    const tier = providerAvailable(2) ? 2 : providerAvailable(1) ? 1 : null;
    if (!tier) return { draft: null, costMicros: 0 };
    const r = await callModel({
      tier,
      system:
        '你是 SAREC 中美房地产商会的工作人员。根据访客留下的信息，写一段给访客的首次联系草稿（中文，120 字以内，温和、专业、不推销；不谈投资回报，不承诺任何结果；如果访客愿意，提出约创始人 15 分钟电话）。只输出草稿正文。',
      history: [],
      user: `称呼：${l.name || '未留'}\n${leadMessage(l)}`,
      maxTokens: MAX_OUTPUT_TOKENS.summary,
      json: false,
      mockText: isMockMode() ? `（模拟草稿）${templateDraft(l)}` : undefined
    });
    if (!r.ok) return { draft: null, costMicros: r.costMicros };
    return { draft: clip(r.text, 600), costMicros: r.costMicros };
  } catch {
    return { draft: null, costMicros: 0 };
  }
}

export async function submitLead(
  visitorId: string,
  contactId: string | null,
  b: Record<string, unknown>,
  base: string
): Promise<{ created: boolean; message: string }> {
  const conv = await getConversation(str(b.conversationId, 64), visitorId);
  if (!conv) throw new CrmError('not_found', '找不到这段对话，请刷新页面后再试');
  const phoneRaw = str(b.phone, 40);
  const emailRaw = str(b.email, 200);
  const lead: LeadInfo = {
    need: str(b.need, 1000),
    region: str(b.region, 100),
    timeline: str(b.timeline, 100),
    wantsCall: b.wantsCall === true ? true : b.wantsCall === false ? false : null,
    name: str(b.name, 100),
    phone: phoneRaw ? extractPhone(phoneRaw) ?? phoneRaw : '',
    email: emailRaw ? extractEmail(emailRaw) ?? emailRaw : '',
    wechat: str(b.wechat, 60)
  };
  if (!lead.phone && !lead.email && !lead.wechat && !contactId) throw new CrmError('bad_request', '请至少留一种联系方式（手机、邮箱或微信），方便同事联系您');
  const { draft, costMicros } = conv.lead_at ? { draft: null, costMicros: 0 } : await draftFor(lead);
  const r = await createInquiry(
    {
      source: 'agent',
      conversationId: conv.id,
      contactId,
      name: lead.name || null,
      phone: lead.phone || null,
      email: lead.email || null,
      wechat: lead.wechat || null,
      intent: 'AI 助手线索',
      message: leadMessage(lead),
      fields: { ...lead, page: conv.page, pageSlug: conv.page_slug },
      draft
    },
    base
  );
  const first = await markLead(conv.id, r.followupId, r.inquiryId);
  await updateConversation(conv.id, { isLead: true, leadInfo: { ...lead, _pending: null }, costDelta: costMicros });
  await addMessage({ conversationId: conv.id, role: 'event', content: `访客确认提交线索${r.created ? '' : '（已提交过）'}`, route: 'lead_submit', costMicros, model: null, action: { type: 'lead', followupId: r.followupId } });
  await bumpDaily({ leads: first && r.created ? 1 : 0, cost_micros: costMicros, model_calls: costMicros > 0 ? 1 : 0 });
  return {
    created: r.created,
    message: r.created ? '已提交。商会同事会尽快与您联系，通常 1 个工作日内。' : '您的信息已经提交过了，同事会尽快联系您。'
  };
}

export async function recordRegistered(visitorId: string, b: Record<string, unknown>): Promise<void> {
  const conv = await getConversation(str(b.conversationId, 64), visitorId);
  const slug = str(b.slug, 200);
  if (!conv || !slug) return;
  await markRegistered(conv.id, slug);
  await addMessage({ conversationId: conv.id, role: 'event', content: `访客通过助手报名：${slug}`, route: 'register_done' });
}
