/**
 * 1.5.0 图片自动检测的回调处理（微信「消息推送」推回 mediaCheckAsync 的结果）。
 * 指令 36 起（迁移 0048）：图片登记在 image_checks，"检测完才公开"，见 lib/crm/imageGate.ts。
 * 0048 之前用老办法登记的（ugc_actions kind=media_check，target=“project:<id>” 或 “photo:<id>”，note=trace_id）照旧处理：不通过的自动撤下。
 */
import { getPool } from '@/lib/db/client';
import { handleCheckResult, MACHINE_REASON, wechatOpenidOf } from './imageGate';

export { MACHINE_REASON };

// 指令 51：和图片检测同一个查法
export async function openidOf(contactId: string): Promise<string | null> {
  return wechatOpenidOf(contactId);
}

/** 微信推回的检测结果 */
export async function handleMediaCheckResult(traceId: string, suggest: string, label?: number | string | null) {
  const pool = getPool();
  const g = await handleCheckResult(traceId, suggest, label);
  if (g.found) {
    await pool.query(`INSERT INTO ugc_actions (kind, target_id, action, actor, note) VALUES ('media_check', $1, $2, 'machine', $3)`, ['trace', 'result:' + suggest, `${traceId} ${label ?? ''}`]);
    return { ok: true, takenDown: !!g.takenDown };
  }
  // 老办法登记的
  const { rows } = await pool.query<{ target_id: string }>(`SELECT target_id FROM ugc_actions WHERE kind = 'media_check' AND note = $1 LIMIT 1`, [traceId]);
  const target = rows[0]?.target_id;
  if (!target) return { ok: false };
  await pool.query(`INSERT INTO ugc_actions (kind, target_id, action, actor, note) VALUES ('media_check', $1, $2, 'machine', $3)`, [target, 'result:' + suggest, `${traceId} ${label ?? ''}`]);
  if (suggest !== 'risky') return { ok: true };
  const [kind, id] = target.split(':');
  if (kind === 'project') {
    await pool.query(`UPDATE profile_projects SET status = 'rejected', reviewed_by = 'machine', reviewed_at = now() WHERE id = $1 AND status = 'ok'`, [id]);
  } else if (kind === 'photo') {
    await pool.query(`UPDATE event_photos SET is_hidden = true, review_status = 'rejected' WHERE id = $1`, [id]);
  }
  await pool.query(`INSERT INTO ugc_actions (kind, target_id, action, actor, note) VALUES ($1, $2, 'machine_take_down', 'machine', $3)`, [kind === 'project' ? 'profile_project' : 'photo', id, `微信图片检测不通过（${label ?? ''}）`]);
  return { ok: true, takenDown: true };
}
