/**
 * 电子名片审核（后台“名片审核”）：先发后审。
 * - 待审核：名片文字或头像改过、且还没被工作人员看过（或看过之后又改了）。
 * - 操作：审核通过 / 下架（必须写原因）/ 恢复 / 清除头像。每一步记审计日志。
 */
import { getPool, withTransaction } from '@/lib/db/client';
import { CrmError } from './events';
import { audit } from './staff';
import type { Staff } from './auth';

export type CardRow = {
  contact_id: string; token: string; name: string; member_no: number; avatar_url: string | null;
  company: string | null; title: string | null; intro: string | null; wechat_id: string | null;
  content_updated_at: string | null; reviewed_at: string | null; reviewed_by: string | null; sec_check: string | null;
  hidden_at: string | null; hidden_reason: string | null; hidden_by: string | null; pending: boolean;
};

const PENDING_SQL = `m.hidden_at IS NULL AND m.content_updated_at IS NOT NULL AND (m.reviewed_at IS NULL OR m.reviewed_at < m.content_updated_at)`;

export async function listCardsForReview(filter: string | null, q: string | null) {
  const where: string[] = ['(m.content_updated_at IS NOT NULL OR m.hidden_at IS NOT NULL)'];
  const args: unknown[] = [];
  if (filter === 'pending') where.push(PENDING_SQL);
  else if (filter === 'hidden') where.push('m.hidden_at IS NOT NULL');
  const kw = typeof q === 'string' ? q.trim().slice(0, 60) : '';
  if (kw) {
    args.push(`%${kw}%`);
    const i = args.length;
    where.push(`(c.name ILIKE $${i} OR m.company ILIKE $${i} OR m.intro ILIKE $${i} OR m.title ILIKE $${i})`);
  }
  const pool = getPool();
  const { rows } = await pool.query<CardRow>(
    `SELECT m.contact_id, m.token, c.name, c.member_no::int AS member_no, c.avatar_url, m.company, m.title, m.intro, m.wechat_id,
            m.content_updated_at, m.reviewed_at, m.reviewed_by, m.sec_check, m.hidden_at, m.hidden_reason, m.hidden_by,
            (${PENDING_SQL}) AS pending
       FROM member_cards m JOIN contacts c ON c.id = m.contact_id
      WHERE ${where.join(' AND ')}
      ORDER BY pending DESC, COALESCE(m.content_updated_at, m.hidden_at) DESC
      LIMIT 300`,
    args
  );
  const { rows: cnt } = await pool.query<{ pending: number; hidden: number }>(
    `SELECT count(*) FILTER (WHERE ${PENDING_SQL})::int AS pending, count(*) FILTER (WHERE m.hidden_at IS NOT NULL)::int AS hidden
       FROM member_cards m`
  );
  return { cards: rows, counts: cnt[0] ?? { pending: 0, hidden: 0 } };
}

export async function reviewCard(s: Staff, contactId: string, action: string, reason?: unknown) {
  if (!/^[0-9a-f-]{36}$/.test(contactId)) throw new CrmError('bad_request', '名片不存在');
  const why = typeof reason === 'string' ? reason.trim().slice(0, 200) : '';
  return withTransaction(async (db) => {
    const { rows } = await db.query<{ contact_id: string }>(`SELECT contact_id FROM member_cards WHERE contact_id = $1 FOR UPDATE`, [contactId]);
    if (!rows[0]) throw new CrmError('not_found', '名片不存在');
    if (action === 'approve') {
      await db.query(`UPDATE member_cards SET reviewed_at = now(), reviewed_by = $2 WHERE contact_id = $1`, [contactId, s.name]);
    } else if (action === 'hide') {
      if (!why) throw new CrmError('bad_request', '请写下架原因（会记录在案）');
      await db.query(
        `UPDATE member_cards SET hidden_at = now(), hidden_reason = $2, hidden_by = $3, reviewed_at = now(), reviewed_by = $3 WHERE contact_id = $1`,
        [contactId, why, s.name]
      );
    } else if (action === 'restore') {
      await db.query(
        `UPDATE member_cards SET hidden_at = NULL, hidden_reason = NULL, hidden_by = NULL, reviewed_at = now(), reviewed_by = $2 WHERE contact_id = $1`,
        [contactId, s.name]
      );
    } else if (action === 'clear_avatar') {
      await db.query(`UPDATE contacts SET avatar_url = NULL, updated_at = now() WHERE id = $1`, [contactId]);
    } else {
      throw new CrmError('bad_request', '不支持的操作');
    }
    await audit(db, s, `card_${action}`, 'contact', contactId, { reason: why || null });
    return { done: action };
  });
}
