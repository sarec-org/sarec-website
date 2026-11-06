/**
 * AI 助手 —— 预算兜底（月预算默认 30 美元，后台可改；每日预算 = 月预算 / 30）。
 *   ≥ 70%：邮件提醒东哥（每天一次 / 每月一次，去重）
 *   ≥ 90%：只给会员和线索对话调模型，其余走常见问题库
 *   ≥ 100%：全部走常见问题库；答不了的显示“留下联系方式”，线索照收
 * 测试开关 agent_budget_test_pct：非空时按这个百分比运行（仅工作人员可设）。
 */
import { getPool } from '@/lib/db/client';
import { getSetting } from '@/lib/crm/orders';
import { getFromAddress, getResend, isEmailConfigured } from '@/lib/email/resend-client';
import { alertEmail, fmtUsd } from './config';
import { laDay } from './text';

export type BudgetLevel = 'ok' | 'warn' | 'restrict' | 'stop';

export type BudgetState = {
  monthlyUsd: number;
  dailyUsd: number;
  monthMicros: number;
  todayMicros: number;
  monthPct: number;
  dayPct: number;
  pct: number;
  testPct: number | null;
  level: BudgetLevel;
};

/** 纯函数：用量 → 档位。 */
export function computeBudget(monthlyUsd: number, monthMicros: number, todayMicros: number, testPct: number | null): BudgetState {
  const monthly = Number.isFinite(monthlyUsd) && monthlyUsd >= 0 ? monthlyUsd : 30;
  const daily = monthly / 30;
  const monthPct = monthly > 0 ? (monthMicros / (monthly * 1e6)) * 100 : 100;
  const dayPct = daily > 0 ? (todayMicros / (daily * 1e6)) * 100 : 100;
  const real = Math.max(monthPct, dayPct);
  const pct = testPct !== null && Number.isFinite(testPct) ? testPct : real;
  const level: BudgetLevel = pct >= 100 ? 'stop' : pct >= 90 ? 'restrict' : pct >= 70 ? 'warn' : 'ok';
  return { monthlyUsd: monthly, dailyUsd: daily, monthMicros, todayMicros, monthPct, dayPct, pct, testPct, level };
}

export function parseTestPct(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 1000 ? n : null;
}

export async function budgetState(now = new Date()): Promise<BudgetState> {
  const pool = getPool();
  const monthly = Number(await getSetting<number | string>(pool, 'agent_budget_monthly_usd', 30));
  const testPct = parseTestPct(await getSetting<unknown>(pool, 'agent_budget_test_pct', null));
  const today = laDay(now);
  const monthStart = today.slice(0, 8) + '01';
  const { rows } = await pool.query<{ month: string; today: string }>(
    `SELECT COALESCE(SUM(cost_micros), 0)::text AS month,
            COALESCE(SUM(cost_micros) FILTER (WHERE day = $2::date), 0)::text AS today
       FROM agent_daily WHERE day >= $1::date AND day <= $2::date`,
    [monthStart, today]
  );
  return computeBudget(Number.isFinite(monthly) ? monthly : 30, Number(rows[0]?.month ?? 0), Number(rows[0]?.today ?? 0), testPct);
}

/** 70% 提醒：发生在访客消息处理时（不是定时任务），每天 / 每月各最多一封。失败不影响回答。 */
export async function maybeSendBudgetAlert(b: BudgetState, now = new Date()): Promise<void> {
  if (b.pct < 70) return;
  const to = alertEmail();
  if (!to || !isEmailConfigured()) return;
  const day = laDay(now);
  const keys: string[] = [];
  if (b.testPct !== null) keys.push(`budget70:test:${day}`);
  else {
    if (b.monthPct >= 70) keys.push(`budget70:month:${day.slice(0, 7)}`);
    if (b.dayPct >= 70) keys.push(`budget70:day:${day}`);
  }
  const pool = getPool();
  for (const key of keys) {
    const { rows } = await pool.query<{ key: string }>(
      `INSERT INTO agent_notices (key, kind) VALUES ($1, 'budget70')
       ON CONFLICT (key) DO UPDATE SET status = 'sending', created_at = now() WHERE agent_notices.status = 'failed'
       RETURNING key`,
      [key]
    );
    if (!rows[0]) continue; // 已发过 / 正在发
    try {
      const scope = key.includes(':month:') ? '本月' : key.includes(':test:') ? '（测试开关）' : '今天';
      const res = await getResend().emails.send({
        from: getFromAddress(),
        to,
        subject: `【SAREC AI 助手】${scope}预算已用到 ${Math.floor(b.pct)}%`,
        text: [
          `SAREC 网站 AI 助手的花费已用到预算的 ${Math.floor(b.pct)}%${b.testPct !== null ? '（这是后台测试开关模拟的百分比）' : ''}。`,
          '',
          `本月：${fmtUsd(b.monthMicros)} / $${b.monthlyUsd.toFixed(2)}（${b.monthPct.toFixed(0)}%）`,
          `今天：${fmtUsd(b.todayMicros)} / $${b.dailyUsd.toFixed(2)}（${b.dayPct.toFixed(0)}%）`,
          '',
          '到 90%：只给会员和线索对话调用模型，其余走常见问题库。',
          '到 100%：全部走常见问题库，答不了的请访客留下联系方式（线索照收）。',
          '',
          '可以在后台“AI 助手”页面调整月预算。'
        ].join('\n')
      });
      if (res.error) throw new Error(res.error.message);
      await pool.query(`UPDATE agent_notices SET status = 'sent', sent_at = now() WHERE key = $1`, [key]);
    } catch (e) {
      await pool.query(`UPDATE agent_notices SET status = 'failed', error = $2 WHERE key = $1`, [key, (e instanceof Error ? e.message : 'send failed').slice(0, 300)]);
    }
  }
}
