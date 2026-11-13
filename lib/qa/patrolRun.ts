/**
 * 巡检落库 + 提醒：结果存 qa_patrol_runs；有失败时后台首页红条（读最近一次）。
 * 邮件只发给东哥本人（ALERT_EMAIL），默认关：后台开关 patrol_email_enabled 打开才发；同一组失败一天只发一次；不发给任何会员。
 */
import { createHash } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { getSetting } from '@/lib/crm/orders';
import { runPatrol, type PatrolItem } from './patrol';

export type PatrolRun = { id: number; trigger: string; base: string; total: number; failed: number; results: PatrolItem[]; emailed: boolean; created_at: Date };

export async function patrolAndRecord(base: string, trigger: 'daily' | 'deploy' | 'manual') {
  const r = await runPatrol(base);
  const db = getPool();
  const { rows } = await db.query<PatrolRun>(
    `INSERT INTO qa_patrol_runs (trigger, base, total, failed, results) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [trigger, r.base, r.total, r.failed, JSON.stringify(r.results)]
  );
  const run = rows[0];
  if (run.failed > 0) run.emailed = await maybeEmail(run).catch((e) => { console.log('[patrol] email failed', (e as Error).message); return false; });
  return run;
}

async function maybeEmail(run: PatrolRun): Promise<boolean> {
  const db = getPool();
  const to = (process.env.ALERT_EMAIL || '').trim();
  const on = await getSetting<boolean>(db, 'patrol_email_enabled', false);
  if (!on || !to) return false;
  const bad = run.results.filter((x) => !x.ok);
  // 同一组失败（按失败项名字）一天只发一次
  const sig = createHash('sha256').update(bad.map((x) => x.name).sort().join('|')).digest('hex').slice(0, 16);
  await db.query(`UPDATE qa_patrol_runs SET alert_sig = $2 WHERE id = $1`, [run.id, sig]);
  const { rows } = await db.query(`SELECT 1 FROM qa_patrol_runs WHERE emailed AND alert_sig = $1 AND created_at > now() - interval '1 day' LIMIT 1`, [sig]);
  if (rows[0]) return false;
  const { getFromAddress, getResend, isEmailConfigured } = await import('@/lib/email/resend-client');
  if (!isEmailConfigured()) return false;
  const text = [`线上巡检（${run.trigger === 'deploy' ? '部署后' : run.trigger === 'daily' ? '每日' : '手动'}）发现 ${run.failed} 项不正常，共查 ${run.total} 项：`, '', ...bad.map((x) => `· ${x.name}：${x.detail}`), '', `站点：${run.base}`, '后台首页有红条，修好后下一次巡检会自动消失。'].join('\n');
  const res = await getResend().emails.send({ from: getFromAddress(), to, subject: `【SAREC 巡检】线上 ${run.failed} 项不正常`, text });
  if (res.error) return false;
  await db.query(`UPDATE qa_patrol_runs SET emailed = true WHERE id = $1`, [run.id]);
  return true;
}

export async function latestRun(): Promise<PatrolRun | null> {
  const { rows } = await getPool().query<PatrolRun>(`SELECT * FROM qa_patrol_runs ORDER BY created_at DESC LIMIT 1`).catch(() => ({ rows: [] as PatrolRun[] }));
  return rows[0] ?? null;
}
