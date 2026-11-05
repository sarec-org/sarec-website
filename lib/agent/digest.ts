/**
 * AI 助手 —— 每日汇总邮件（昨天谁问了什么、哪些是线索、花了多少）。
 * ------------------------------------------------------------------
 * 只查数据库，绝不调用 AI。同一天只发一封（agent_notices 去重；发送失败下次可重试）。
 * 本模块不注册任何定时任务：由主开发者在每日 cron 路由里调用 runAgentDigest(new Date())。
 */
import { getPool } from '@/lib/db/client';
import { getFromAddress, getResend, isEmailConfigured } from '@/lib/email/resend-client';
import { digestEmail, fmtUsd } from './config';
import { addDays, clip, laDay, normalizeTight, TZ } from './text';

export type DigestResult = { day: string; status: 'sent' | 'skipped_already_sent' | 'skipped_no_recipient' | 'failed'; conversations: number; leads: number; error?: string };

const AUD: Record<string, string> = { visitor: '访客', logged_in: '已登录', registered: '已报名用户', member: '会员' };
const PAGE: Record<string, string> = { home: '首页', article: '文章页', event: '活动页' };

export async function buildAgentDigest(day: string): Promise<{ subject: string; text: string; conversations: number; leads: number }> {
  const pool = getPool();
  const { rows: d } = await pool.query<Record<string, string>>(`SELECT * FROM agent_daily WHERE day = $1::date`, [day]);
  const daily = d[0];
  const { rows: convs } = await pool.query<{
    id: string; audience: string; page: string | null; page_title: string | null; is_lead: boolean; lead_at: Date | null;
    lead_info: Record<string, unknown>; name: string | null; member_no: number | null; contact_text: string | null; need: string | null;
    questions: string[]; cost: string;
  }>(
    `SELECT c.id, c.audience, c.page, c.page_title, c.is_lead, c.lead_at, c.lead_info,
            COALESCE(f.name, ct.name) AS name, ct.member_no::int AS member_no, f.contact_text, f.need,
            ARRAY(SELECT m2.content FROM agent_messages m2 WHERE m2.conversation_id = c.id AND m2.role = 'user'
                    AND (m2.created_at AT TIME ZONE '${TZ}')::date = $1::date ORDER BY m2.id LIMIT 4) AS questions,
            COALESCE((SELECT SUM(m3.cost_micros) FROM agent_messages m3 WHERE m3.conversation_id = c.id
                    AND (m3.created_at AT TIME ZONE '${TZ}')::date = $1::date), 0)::text AS cost
       FROM agent_conversations c
       LEFT JOIN followups f ON f.id = c.followup_id
       LEFT JOIN contacts ct ON ct.id = c.contact_id
      WHERE EXISTS (SELECT 1 FROM agent_messages m WHERE m.conversation_id = c.id AND m.role = 'user'
                      AND (m.created_at AT TIME ZONE '${TZ}')::date = $1::date)
      ORDER BY c.is_lead DESC, c.lead_at NULLS LAST, c.created_at
      LIMIT 200`,
    [day]
  );
  const { rows: qs } = await pool.query<{ content: string }>(
    `SELECT content FROM agent_messages WHERE role = 'user' AND (created_at AT TIME ZONE '${TZ}')::date = $1::date LIMIT 2000`,
    [day]
  );
  // 高频问题（规范化后计数）
  const counts: Record<string, { text: string; n: number }> = {};
  for (const q of qs) {
    const k = normalizeTight(q.content).slice(0, 80);
    if (!k) continue;
    counts[k] = counts[k] ? { text: counts[k].text, n: counts[k].n + 1 } : { text: clip(q.content, 60), n: 1 };
  }
  const top = Object.keys(counts)
    .map((k) => counts[k])
    .sort((a, b) => b.n - a.n)
    .slice(0, 10);

  const submitted = convs.filter((c) => c.lead_at && laDay(new Date(c.lead_at)) === day);
  const unsubmitted = convs.filter((c) => c.is_lead && !c.lead_at);
  const lines: string[] = [];
  lines.push(`SAREC 网站 AI 助手 · ${day}（洛杉矶时间）汇总`);
  lines.push('');
  lines.push('【总览】');
  if (daily) {
    const calls = Number(daily.calls) || 0;
    const pct = (n: string) => (calls ? `${Math.round((Number(n) / calls) * 100)}%` : '0%');
    lines.push(`对话 ${convs.length} 段，访客消息 ${calls} 条（常见问题库 ${daily.tier0} / ${pct(daily.tier0)}，便宜模型 ${daily.tier1} / ${pct(daily.tier1)}，好模型 ${daily.tier2} / ${pct(daily.tier2)}，缓存 ${daily.cache_hits}）`);
    lines.push(`花费 ${fmtUsd(Number(daily.cost_micros))}；拦截机器人 ${daily.blocked} 次，降速 / 人机验证 ${daily.slowed} 次，超出每日条数 ${daily.limited} 次`);
    const leadsN = Number(daily.leads) || 0;
    lines.push(`提交线索 ${leadsN} 条${leadsN ? `，每条线索成本 ${fmtUsd(Math.round(Number(daily.cost_micros) / leadsN))}` : ''}`);
  } else lines.push(`对话 ${convs.length} 段，没有用量记录。`);
  lines.push('');
  lines.push(`【线索（访客已确认提交，已生成待跟进任务）】${submitted.length ? '' : '无'}`);
  submitted.forEach((c, i) => {
    lines.push(`${i + 1}. ${c.name || '未留称呼'}${c.member_no ? `（会员号 ${c.member_no}）` : ''} · ${c.contact_text || '—'}`);
    lines.push(`   ${clip((c.need || '').replace(/\s+/g, ' '), 160)}`);
  });
  if (unsubmitted.length) {
    lines.push('');
    lines.push(`【聊到项目 / 资金 / 合作，但还没留联系方式】${unsubmitted.length} 段`);
    unsubmitted.slice(0, 15).forEach((c, i) => {
      const li = c.lead_info as { need?: string; region?: string; timeline?: string };
      lines.push(`${i + 1}. ${AUD[c.audience] ?? c.audience}${c.name ? ' ' + c.name : ''}：${clip(li.need || c.questions[0] || '', 80)}${li.region ? ' · ' + li.region : ''}${li.timeline ? ' · ' + li.timeline : ''}`);
    });
  }
  lines.push('');
  lines.push('【谁问了什么】');
  if (!convs.length) lines.push('昨天没有访客对话。');
  convs.slice(0, 40).forEach((c, i) => {
    const who = `${AUD[c.audience] ?? c.audience}${c.name ? ' ' + c.name : ''}`;
    const where = c.page ? `（${PAGE[c.page] ?? c.page}${c.page_title ? '：' + clip(c.page_title, 20) : ''}）` : '';
    lines.push(`${i + 1}. ${who}${where}${c.is_lead ? ' 【线索】' : ''}：${c.questions.map((q) => clip(q.replace(/\s+/g, ' '), 50)).join(' / ')}`);
  });
  if (convs.length > 40) lines.push(`……另有 ${convs.length - 40} 段，见后台。`);
  if (top.length) {
    lines.push('');
    lines.push('【高频问题】');
    top.forEach((t, i) => lines.push(`${i + 1}. ${t.text}（${t.n} 次）`));
  }
  lines.push('');
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://sinoamericanrec.org').replace(/\/$/, '');
  lines.push(`后台：${base}/zh/staff/agent　待跟进：${base}/zh/staff/followups`);
  lines.push('（本邮件由数据库直接生成，未调用 AI。）');
  return {
    subject: `【SAREC AI 助手日报】${day} · ${convs.length} 段对话 · ${submitted.length} 条线索`,
    text: lines.join('\n'),
    conversations: convs.length,
    leads: submitted.length
  };
}

/** 生成并发送“昨天”的汇总（洛杉矶日期）。幂等：同一天只发一封。 */
export async function runAgentDigest(now: Date = new Date()): Promise<DigestResult> {
  const day = addDays(laDay(now), -1);
  const to = digestEmail();
  if (!to || !isEmailConfigured()) return { day, status: 'skipped_no_recipient', conversations: 0, leads: 0 };
  const pool = getPool();
  const key = `digest:${day}`;
  const { rows } = await pool.query<{ key: string }>(
    `INSERT INTO agent_notices (key, kind) VALUES ($1, 'digest')
     ON CONFLICT (key) DO UPDATE SET status = 'sending', created_at = now()
       WHERE agent_notices.status = 'failed' OR (agent_notices.status = 'sending' AND agent_notices.created_at < now() - interval '15 minutes')
     RETURNING key`,
    [key]
  );
  if (!rows[0]) return { day, status: 'skipped_already_sent', conversations: 0, leads: 0 };
  try {
    const d = await buildAgentDigest(day);
    const res = await getResend().emails.send({ from: getFromAddress(), to, subject: d.subject, text: d.text });
    if (res.error) throw new Error(res.error.message);
    await pool.query(`UPDATE agent_notices SET status = 'sent', sent_at = now(), error = NULL WHERE key = $1`, [key]);
    return { day, status: 'sent', conversations: d.conversations, leads: d.leads };
  } catch (e) {
    const msg = (e instanceof Error ? e.message : 'send failed').slice(0, 300);
    await pool.query(`UPDATE agent_notices SET status = 'failed', error = $2 WHERE key = $1`, [key, msg]).catch(() => undefined);
    return { day, status: 'failed', conversations: 0, leads: 0, error: msg };
  }
}
