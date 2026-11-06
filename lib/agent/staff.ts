/**
 * AI 助手 —— 工作人员后台：看板（每天调用次数、各级占比、花费、拦截、每条线索成本）、常见问题库编辑、预算与测试开关、最近对话。
 */
import { getPool } from '@/lib/db/client';
import { setSetting } from '@/lib/crm/orders';
import { CrmError } from '@/lib/crm/events';
import { budgetState, parseTestPct } from './budget';
import { claudeModel, geminiModel, hasAnthropicKey, hasGeminiKey, isMockMode, turnstileConfigured } from './config';
import { clearFaqCache } from './store';

export async function agentDashboard(days = 14) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT day::text, calls, tier0, tier1, tier2, cache_hits, model_calls, blocked, slowed, limited, leads, input_tokens::text, output_tokens::text, cost_micros::text
       FROM agent_daily ORDER BY day DESC LIMIT $1`,
    [Math.min(90, Math.max(1, days))]
  );
  const budget = await budgetState();
  return {
    days: rows,
    budget,
    status: {
      mock: isMockMode(),
      gemini: hasGeminiKey(),
      anthropic: hasAnthropicKey(),
      geminiModel: geminiModel(),
      claudeModel: claudeModel(),
      turnstile: turnstileConfigured()
    }
  };
}

export async function recentConversations(f: { leadsOnly?: boolean; limit?: number } = {}) {
  const { rows } = await getPool().query(
    `SELECT c.id, c.created_at, c.last_message_at, c.audience, c.page, c.page_title, c.lang, c.turns, c.is_lead, c.lead_at,
            c.cost_micros::text AS cost_micros, c.followup_id, c.registered_slugs, ct.name AS contact_name,
            (SELECT content FROM agent_messages m WHERE m.conversation_id = c.id AND m.role = 'user' ORDER BY m.id LIMIT 1) AS first_question
       FROM agent_conversations c LEFT JOIN contacts ct ON ct.id = c.contact_id
      WHERE ($1::boolean IS NOT TRUE OR c.is_lead)
      ORDER BY c.last_message_at DESC LIMIT $2`,
    [f.leadsOnly ?? false, Math.min(200, f.limit ?? 50)]
  );
  return rows;
}

export async function conversationDetail(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new CrmError('bad_request', '对话编号不对');
  const pool = getPool();
  const { rows: c } = await pool.query(
    `SELECT id, created_at, audience, page, page_slug, page_title, lang, turns, summary, is_lead, lead_info, lead_at, followup_id, cost_micros::text AS cost_micros
       FROM agent_conversations WHERE id = $1`,
    [id]
  );
  if (!c[0]) throw new CrmError('not_found', '找不到这段对话');
  const { rows: m } = await pool.query(
    `SELECT id::text, role, content, tier, route, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_micros::text AS cost_micros,
            cached, intent, action, flags, created_at
       FROM agent_messages WHERE conversation_id = $1 ORDER BY id LIMIT 500`,
    [id]
  );
  return { conversation: c[0], messages: m };
}

export async function listFaqAll() {
  const { rows } = await getPool().query(
    `SELECT id, intent, title, keywords, answer_zh, answer_en, priority, is_active, hits, updated_by, updated_at FROM agent_faq ORDER BY is_active DESC, priority DESC, id`
  );
  return rows;
}

export async function upsertFaq(
  by: string,
  b: { id?: number; intent?: string; title?: string; keywords?: string[] | string; answerZh?: string; answerEn?: string; priority?: number; isActive?: boolean; delete?: boolean }
) {
  const pool = getPool();
  clearFaqCache();
  if (b.delete && b.id) {
    await pool.query(`DELETE FROM agent_faq WHERE id = $1`, [b.id]);
    return { ok: true };
  }
  const kw = (Array.isArray(b.keywords) ? b.keywords : String(b.keywords ?? '').split(/[,，\n]/))
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 60);
  const title = (b.title ?? '').trim().slice(0, 100);
  const answerZh = (b.answerZh ?? '').trim().slice(0, 2000);
  if (!title || !answerZh) throw new CrmError('bad_request', '请填写标题和中文回答');
  if (!kw.length) throw new CrmError('bad_request', '请至少填一个关键词（用逗号分隔；“活动+时间”表示两个词同时出现）');
  const intent = (b.intent ?? '').trim().replace(/[^a-z0-9_]/gi, '_').slice(0, 40) || `faq_${Date.now()}`;
  const priority = Number.isFinite(Number(b.priority)) ? Math.round(Number(b.priority)) : 0;
  if (b.id) {
    await pool.query(
      `UPDATE agent_faq SET title = $2, keywords = $3, answer_zh = $4, answer_en = $5, priority = $6, is_active = $7, updated_by = $8, updated_at = now() WHERE id = $1`,
      [b.id, title, kw, answerZh, b.answerEn?.trim().slice(0, 2000) || null, priority, b.isActive !== false, by]
    );
  } else {
    await pool.query(
      `INSERT INTO agent_faq (intent, title, keywords, answer_zh, answer_en, priority, is_active, updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (intent) DO UPDATE SET title = EXCLUDED.title, keywords = EXCLUDED.keywords, answer_zh = EXCLUDED.answer_zh,
         answer_en = EXCLUDED.answer_en, priority = EXCLUDED.priority, is_active = EXCLUDED.is_active, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [intent, title, kw, answerZh, b.answerEn?.trim().slice(0, 2000) || null, priority, b.isActive !== false, by]
    );
  }
  return { ok: true };
}

export async function updateAgentSettings(by: string, b: { monthlyUsd?: unknown; testPct?: unknown }) {
  const pool = getPool();
  if (b.monthlyUsd !== undefined) {
    const n = Number(b.monthlyUsd);
    if (!Number.isFinite(n) || n < 0 || n > 10000) throw new CrmError('bad_request', '月预算应为 0–10000 美元');
    await setSetting(pool, 'agent_budget_monthly_usd', Math.round(n * 100) / 100, by);
  }
  if (b.testPct !== undefined) {
    const v = b.testPct === null || b.testPct === '' ? null : parseTestPct(b.testPct);
    if (b.testPct !== null && b.testPct !== '' && v === null) throw new CrmError('bad_request', '测试百分比应为 0–1000，或留空关闭');
    await setSetting(pool, 'agent_budget_test_pct', v, by);
  }
  return { ok: true };
}
