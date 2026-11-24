/**
 * 后台综合优化 八：内部账号 / 审核演示账号 / 测试账号（contacts.account_kind）。
 * - internal：东哥本人等工作人员自己的档案（几份合并成一份后标记）。
 * - review_demo：小程序审核演示账号（CRM_REVIEW_EMAIL 那个邮箱）。
 * - test：带标记的测试账号（虚构测试号码 555-01xx、「验收」开头的测试身份）。
 * 这三种都不进待办、不进统计、不进推荐排行、不收跟进提醒。真实客户 account_kind 为空。
 */
import { getPool } from '@/lib/db/client';
import type { Db } from './profile';
import { reviewEmail } from './auth';
import { CrmError } from './events';

export type AccountKind = 'internal' | 'review_demo' | 'test';
export const ACCOUNT_KIND_LABEL: Record<AccountKind, string> = { internal: '内部账号', review_demo: '审核演示账号', test: '测试账号' };

/** SQL 片段：这个档案是真实客户（不是内部 / 审核演示 / 测试）。alias 是 contacts 的别名。 */
export const realContact = (alias = 'c') => `(${alias}.account_kind IS NULL AND ${alias}.org_guest_since IS NULL)`;
/** SQL 片段：按 contact_id 列判断（没有 contacts 连接时用） */
export const realContactId = (col: string) => `NOT EXISTS (SELECT 1 FROM contacts _ak WHERE _ak.id = ${col} AND (_ak.account_kind IS NOT NULL OR _ak.org_guest_since IS NOT NULL))`;

export async function isNotReal(db: Db, contactId: string | null | undefined): Promise<boolean> {
  if (!contactId) return false;
  const { rows } = await db.query<{ k: string | null }>(`SELECT account_kind AS k FROM contacts WHERE id = $1`, [contactId]).catch(() => ({ rows: [] as { k: string | null }[] }));
  return !!rows[0]?.k;
}

/** 每天跑一次：审核演示邮箱、虚构测试号码自动打标记（已有标记的不改） */
export async function syncAccountKinds(): Promise<{ review: number; test: number }> {
  const pool = getPool();
  let review = 0;
  const e = reviewEmail();
  if (e) {
    const r = await pool.query(`UPDATE contacts SET account_kind = 'review_demo' WHERE account_kind IS NULL AND lower(email) = $1`, [e]);
    review = r.rowCount ?? 0;
  }
  const t = await pool.query(
    `UPDATE contacts SET account_kind = 'test' WHERE account_kind IS NULL AND (phone_e164 ~ '^\\+1[0-9]{3}55501[0-9]{2}$' OR name LIKE '验收%')`
  );
  return { review, test: t.rowCount ?? 0 };
}

export async function setAccountKind(by: string, contactId: string, kind: AccountKind | null, note?: string) {
  const pool = getPool();
  const { rows } = await pool.query<{ account_kind: string | null }>(`SELECT account_kind FROM contacts WHERE id = $1`, [contactId]);
  if (!rows[0]) throw new CrmError('not_found', '找不到这份档案');
  await pool.query(`UPDATE contacts SET account_kind = $2, updated_at = now() WHERE id = $1`, [contactId, kind]);
  await pool.query(
    `INSERT INTO crm_audit_log (actor, action, target_type, target_id, before_value, after_value, reason) VALUES ($1, 'account_kind', 'contact', $2, $3, $4, $5)`,
    [by, contactId, JSON.stringify({ kind: rows[0].account_kind }), JSON.stringify({ kind }), note ?? null]
  );
  return { ok: true };
}
