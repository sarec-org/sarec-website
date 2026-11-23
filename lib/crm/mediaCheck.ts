/**
 * 1.5.0 图片自动检测的登记和回调处理：提交检测时记一行（ugc_actions kind=media_check，target=“项目:<id>” 或 “照片:<id>”，note=trace_id）；
 * 微信推回结果：不通过（risky）的自动撤下，记一行“机器撤下”，本人在自己的页面上看到原因。
 */
import { getPool } from '@/lib/db/client';
import { mediaCheckAsync } from './contentSec';

export async function openidOf(contactId: string): Promise<string | null> {
  const { rows } = await getPool().query<{ o: string | null }>(`SELECT wechat_openid AS o FROM contacts WHERE id = $1`, [contactId]);
  const o = rows[0]?.o ?? null;
  return o && !o.startsWith('dev-openid-') ? o : null;
}

export async function submitImageChecks(target: string, contactId: string, urls: string[]) {
  const openid = await openidOf(contactId);
  if (!openid) return;
  for (const u of urls) {
    const trace = await mediaCheckAsync(u, openid, 1);
    if (trace) await getPool().query(`INSERT INTO ugc_actions (kind, target_id, action, actor, note) VALUES ('media_check', $1, 'submitted', 'machine', $2)`, [target, trace]);
  }
}

export const MACHINE_REASON = '有图片没通过微信内容检测，已自动撤下。换一张图再保存就行。';

/** 微信推回的检测结果 */
export async function handleMediaCheckResult(traceId: string, suggest: string, label?: number | string | null) {
  const pool = getPool();
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
