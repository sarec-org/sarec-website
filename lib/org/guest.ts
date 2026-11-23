/**
 * 1.6.0「主办方的客人」标记（方案 11/23 修正 第 5 条：数据隔离做实）。
 * - 一个人只通过别的主办方的活动来过：contacts.org_guest_since 有值 → realContact() 把他排除在客户列表、今天、数据页、群发、
 *   邮件通讯、推荐排行、跟进提醒、补资料提醒之外（lib/crm/accountKind.ts）。
 * - 只有本人自己主动和商会发生关系（报名商会活动、申请入会、加俱乐部、登记接活、验证联系方式……）才去掉标记，记下哪天、因为什么。
 *   工作人员不能手动把人"转成商会客户"。去掉标记不会把他在主办方活动里的报名表答案、备注带给商会（那些只在 org_regs 里，商会这边任何页面都不读）。
 * - 迁移 0050 没跑时（没有这几列）什么都不做，不影响老功能。
 */
import { getPool } from '@/lib/db/client';
import type { Db } from '@/lib/crm/profile';

let hasCols: Promise<boolean> | null = null;
export function guestColumnsReady(): Promise<boolean> {
  if (!hasCols) {
    hasCols = getPool()
      .query(`SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'org_guest_since'`)
      .then((r) => !!r.rows[0])
      .catch(() => false);
    // 没跑迁移时一分钟后再看一次（迁移跑完不用重新部署）
    hasCols.then((ok) => { if (!ok) setTimeout(() => { hasCols = null; }, 60_000); });
  }
  return hasCols;
}

/** 本人主动和商会发生关系：去掉"主办方的客人"标记（只对有标记的人写一次） */
export async function linkToChamber(db: Db, contactId: string | null | undefined, reason: string): Promise<void> {
  if (!contactId || !(await guestColumnsReady())) return;
  await db.query(
    `UPDATE contacts SET org_guest_since = NULL, chamber_linked_at = now(), chamber_linked_reason = $2
      WHERE id = $1 AND org_guest_since IS NOT NULL`,
    [contactId, reason.slice(0, 60)]
  );
}

/**
 * 报名主办方活动时：如果这个人是刚因为这场活动来的（档案 24 小时内新建），而且和商会没有任何关系，就标成"主办方的客人"。
 * 早就在用商会小程序 / 网站的人（老用户）不标——他们本来就是商会的人。
 */
export async function markGuestIfNew(db: Db, contactId: string): Promise<boolean> {
  if (!(await guestColumnsReady())) return false;
  const r = await db.query(
    `UPDATE contacts c SET org_guest_since = now()
      WHERE c.id = $1 AND c.org_guest_since IS NULL AND c.chamber_linked_at IS NULL AND c.account_kind IS NULL
        AND c.created_at > now() - interval '24 hours'
        AND c.email_verified_at IS NULL AND c.phone_verified_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM registrations r WHERE r.contact_id = c.id)
        AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.contact_id = c.id)
        AND NOT EXISTS (SELECT 1 FROM join_requests j WHERE j.contact_id = c.id)
        AND NOT EXISTS (SELECT 1 FROM organizer_members m WHERE m.contact_id = c.id)
        AND NOT EXISTS (SELECT 1 FROM staff_roles s WHERE s.mp_contact_id = c.id)`,
    [contactId]
  );
  return (r.rowCount ?? 0) > 0;
}
