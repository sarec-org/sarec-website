/**
 * 咨询记录：网站表单（不需要微信、不需要登录）/ AI 助手 / 小程序“联系商会”。
 * 每条咨询都生成一条“新咨询”待跟进任务，并邮件通知 info@（只发一次，失败进待处理）。
 */
import { getPool, withTransaction } from '@/lib/db/client';
import { CrmError, normalizeEmail, normalizePhone } from './events';
import { notifyFollowup, upsertFollowup } from './followups';

export type InquiryInput = {
  source: 'web_form' | 'agent' | 'mp';
  intent?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  message?: string | null;
  fields?: Record<string, unknown> | null;
  contactId?: string | null;
  ref?: string | null;
  /** AI 助手：对话 id，用于去重（同一对话只生成一条咨询任务） */
  conversationId?: string | null;
  draft?: string | null;
};

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '') || null;

export async function createInquiry(input: InquiryInput, base?: string): Promise<{ inquiryId: string; followupId: string; created: boolean }> {
  const name = clip(input.name, 100);
  const phoneRaw = clip(input.phone, 40);
  const emailRaw = clip(input.email, 200);
  const wechat = clip(input.wechat, 60);
  const message = clip(input.message, 4000);
  const phone = phoneRaw ? normalizePhone(phoneRaw) ?? normalizePhone(phoneRaw, '+86') ?? phoneRaw : null;
  const email = emailRaw ? normalizeEmail(emailRaw) : null;
  if (emailRaw && !email) throw new CrmError('bad_email', '邮箱格式不对，请检查');
  if (!phone && !email && !wechat && !input.contactId) throw new CrmError('bad_request', '请至少留一种联系方式（手机、邮箱或微信），方便我们联系您');
  let refId: string | null = null;
  if (input.ref && /^\d+$/.test(input.ref)) {
    const { rows } = await getPool().query<{ id: string }>(`SELECT id FROM contacts WHERE member_no = $1`, [Number(input.ref)]);
    refId = rows[0]?.id ?? null;
  }
  const out = await withTransaction(async (db) => {
    if (input.conversationId) {
      const { rows } = await db.query<{ id: string; inquiry_id: string | null }>(
        `SELECT id, inquiry_id FROM followups WHERE dedupe_key = $1`,
        [`inquiry:agent:${input.conversationId}`]
      );
      if (rows[0]?.inquiry_id) return { inquiryId: rows[0].inquiry_id, followupId: rows[0].id, created: false };
    }
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO inquiries (contact_id, source, intent, name, phone, email, wechat, message, fields, ref_contact_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [input.contactId ?? null, input.source, clip(input.intent, 60), name, phone, email, wechat, message, input.fields ? JSON.stringify(input.fields) : null, refId]
    );
    const inquiryId = rows[0].id;
    const f = await upsertFollowup(db, {
      source: input.source === 'agent' ? 'agent_lead' : 'inquiry',
      dedupeKey: input.conversationId ? `inquiry:agent:${input.conversationId}` : `inquiry:${inquiryId}`,
      contactId: input.contactId ?? null,
      name,
      contactText: [phone, email, wechat ? `微信 ${wechat}` : null].filter(Boolean).join(' / '),
      need: [clip(input.intent, 60), message].filter(Boolean).join('：').slice(0, 2000) || null,
      draft: input.draft ?? (name ? `${name}您好，我是 SAREC 中美房地产商会的工作人员，收到您在${input.source === 'mp' ? '小程序' : '网站'}上的咨询，想跟您确认一下具体需求，方便的时候我们通个电话？` : null),
      draftBy: input.draft ? 'ai' : 'template',
      inquiryId,
      nextDate: new Date().toISOString().slice(0, 10)
    });
    return { inquiryId, followupId: f.id, created: f.created };
  });
  if (out.created) await notifyFollowup(out.followupId, base);
  return out;
}
