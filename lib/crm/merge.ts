/**
 * 1.2：小程序微信档案 → 已有网站档案 自动合并（验证邮箱 / 手机后才会调用）。
 * 只有微信档案没有任何付款相关记录（订单、会费申请、会议室、月卡、广告）时自动合并；
 * 否则仍交给工作人员（“待处理”里生成一条合并任务）。
 * 合并规则：所有指向 contacts.id 的外键改指向目标档案；遇到唯一约束冲突（如同一场活动两份报名）保留目标档案那一份。
 */
import type { Db } from './profile';

const MONEY_TABLES = ['orders', 'applications', 'room_bookings', 'room_passes', 'screen_ads'];
// 这些列合并时不从微信档案复制
const SKIP_COLS = new Set([
  'id', 'member_no', 'email', 'phone_e164', 'email_verified_at', 'phone_verified_at', 'wechat_openid', 'wechat_unionid',
  'created_at', 'updated_at', 'referred_by', 'referred_channel', 'referred_at'
]);

type Fk = { table_name: string; column_name: string };
let fkCache: Fk[] | null = null;

async function contactFks(db: Db): Promise<Fk[]> {
  if (fkCache) return fkCache;
  const { rows } = await db.query<Fk>(
    `SELECT tc.table_name, kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'contacts' AND ccu.column_name = 'id' AND tc.table_schema = 'public'`
  );
  fkCache = rows;
  return rows;
}

const q = (s: string) => `"${s.replace(/"/g, '""')}"`;

export async function hasMoneyRecords(db: Db, contactId: string): Promise<boolean> {
  const fks = await contactFks(db);
  const parts = fks
    .filter((f) => MONEY_TABLES.includes(f.table_name) && f.column_name === 'contact_id')
    .map((f) => `SELECT 1 FROM ${q(f.table_name)} WHERE contact_id = $1`);
  if (!parts.length) return false;
  const { rows } = await db.query(`${parts.join(' UNION ALL ')} LIMIT 1`, [contactId]);
  return !!rows[0];
}

/** 把 src 的业务数据并到 dst，删掉 src。必须在事务里调用。 */
export async function mergeContactInto(db: Db, src: string, dst: string): Promise<{ moved: number; dropped: number }> {
  let moved = 0;
  let dropped = 0;
  // 1) 资料字段：目标档案为空的，用微信档案补上
  const { rows: cols } = await db.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contacts'`
  );
  const fill = cols.map((c) => c.column_name).filter((c) => !SKIP_COLS.has(c));
  if (fill.length) {
    await db.query(
      `UPDATE contacts d SET ${fill.map((c) => `${q(c)} = COALESCE(d.${q(c)}, s.${q(c)})`).join(', ')}
         FROM contacts s WHERE d.id = $1 AND s.id = $2`,
      [dst, src]
    );
  }
  // 首次推荐人：目标没有时沿用微信档案的（不能是自己）
  await db.query(
    `UPDATE contacts d SET referred_by = s.referred_by, referred_channel = s.referred_channel, referred_at = s.referred_at
       FROM contacts s WHERE d.id = $1 AND s.id = $2 AND d.referred_by IS NULL AND s.referred_by IS NOT NULL AND s.referred_by <> $1`,
    [dst, src]
  );
  // 2) 外键逐表迁移；冲突的行逐行处理
  for (const f of await contactFks(db)) {
    const t = q(f.table_name);
    const c = q(f.column_name);
    if (f.table_name === 'contacts' && f.column_name === 'referred_by') {
      await db.query(`UPDATE contacts SET referred_by = $2 WHERE referred_by = $1 AND id <> $2`, [src, dst]);
      await db.query(`UPDATE contacts SET referred_by = NULL WHERE referred_by = $1`, [src]);
      continue;
    }
    await db.query('SAVEPOINT merge_tbl');
    try {
      const r = await db.query(`UPDATE ${t} SET ${c} = $2 WHERE ${c} = $1`, [src, dst]);
      moved += r.rowCount ?? 0;
      await db.query('RELEASE SAVEPOINT merge_tbl');
    } catch (e) {
      await db.query('ROLLBACK TO SAVEPOINT merge_tbl');
      if ((e as { code?: string }).code !== '23505') throw e;
      const { rows } = await db.query<{ ctid: string }>(`SELECT ctid::text AS ctid FROM ${t} WHERE ${c} = $1`, [src]);
      for (const row of rows) {
        await db.query('SAVEPOINT merge_row');
        try {
          await db.query(`UPDATE ${t} SET ${c} = $2 WHERE ctid = $1::tid`, [row.ctid, dst]);
          await db.query('RELEASE SAVEPOINT merge_row');
          moved++;
        } catch (e2) {
          await db.query('ROLLBACK TO SAVEPOINT merge_row');
          if ((e2 as { code?: string }).code !== '23505') throw e2;
          // 目标档案已有同样一条（例如同一场活动的报名）：保留目标的
          await db.query(`DELETE FROM ${t} WHERE ctid = $1::tid`, [row.ctid]);
          dropped++;
        }
      }
    }
  }
  // 3) 合并后不能出现“自己推荐自己”
  await db.query(`UPDATE contacts SET referred_by = NULL, referred_channel = NULL WHERE id = $1 AND referred_by = $1`, [dst]);
  await db.query(`UPDATE registrations SET ref_contact_id = NULL WHERE contact_id = $1 AND ref_contact_id = $1`, [dst]);
  // 4) 微信身份（以及目标档案缺的手机 / 邮箱）移到目标档案，删除微信档案
  const { rows: w } = await db.query<{
    wechat_openid: string | null; wechat_unionid: string | null; phone_e164: string | null; phone_verified_at: Date | null; email: string | null; email_verified_at: Date | null;
  }>(`SELECT wechat_openid, wechat_unionid, phone_e164, phone_verified_at, email, email_verified_at FROM contacts WHERE id = $1`, [src]);
  const s = w[0];
  await db.query(`UPDATE contacts SET wechat_openid = NULL, wechat_unionid = NULL, phone_e164 = NULL, email = NULL WHERE id = $1`, [src]);
  await db.query(
    `UPDATE contacts SET wechat_openid = COALESCE(wechat_openid, $2), wechat_unionid = COALESCE(wechat_unionid, $3),
            phone_verified_at = CASE WHEN phone_e164 IS NULL AND $4::text IS NOT NULL THEN $5 ELSE phone_verified_at END,
            phone_e164 = COALESCE(phone_e164, $4),
            email_verified_at = CASE WHEN email IS NULL AND $6::text IS NOT NULL THEN $7 ELSE email_verified_at END,
            email = COALESCE(email, $6),
            updated_at = now() WHERE id = $1`,
    [dst, s?.wechat_openid ?? null, s?.wechat_unionid ?? null, s?.phone_e164 ?? null, s?.phone_verified_at ?? null, s?.email ?? null, s?.email_verified_at ?? null]
  );
  await db.query(
    `INSERT INTO crm_audit_log (actor, action, target_type, target_id, after_value, reason)
     VALUES ('system', 'contact_merged', 'contact', $1, $2, '验证联系方式后，小程序档案自动并入网站档案')`,
    [dst, JSON.stringify({ from: src, moved, dropped })]
  );
  await db.query(`DELETE FROM contacts WHERE id = $1`, [src]);
  return { moved, dropped };
}
