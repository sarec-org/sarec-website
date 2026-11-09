/**
 * 1.3.1 F：团队与权限。
 * - 角色：管理员（全权）、运营（活动、客户、内容、通讯，不能改权限和价格）、签到员（只能签到和补登记）、
 *   地区管理员（= 运营 + 只管指定地区：只能建 / 管自己地区的活动、看自己地区的报名）。
 * - 加人：管理员填姓名、手机号 → 选角色和地区 → 生成绑定码（24 小时有效）→ 对方在小程序“我的 → 工作台”里输入，手机工作台即开。
 *   每个微信账号一行，分别显示、可单独停用（东哥三个微信号各一行，都是管理员）。
 * - 停用 / 改角色：一键，立即生效（下一次请求就按新权限）。
 * - 操作记录：改人数、补登记、合并档案、发通知、改权限等关键操作，记录谁、用哪个账号、什么时候，管理员可查。
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { CrmError, normalizePhone } from '@/lib/crm/events';
import type { Staff, StaffRole } from '@/lib/crm/auth';
import { audit } from '@/lib/crm/staff';
import { isRegion } from '@/lib/crm/regions';

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROLES: StaffRole[] = ['admin', 'ops', 'checkin', 'finance'];
export const ROLE_LABEL: Record<string, string> = { admin: '管理员', ops: '运营', checkin: '签到员', finance: '财务' };

export async function teamList() {
  const { rows } = await getPool().query(
    `SELECT s.email AS id, s.name, s.roles, s.regions, s.phone, s.is_active, s.mp_bound_at, s.created_at,
            c.id AS contact_id, NULLIF(c.name, '微信用户') AS wechat_name, c.member_no::int AS member_no,
            (SELECT max(x.last_seen_at) FROM sessions x WHERE x.contact_id = s.mp_contact_id) AS last_seen_at,
            (s.email NOT LIKE 'mp:%') AS has_email
       FROM staff_roles s LEFT JOIN contacts c ON c.id = s.mp_contact_id
      ORDER BY s.is_active DESC, ('admin' = ANY(s.roles)) DESC, s.name`
  );
  return rows.map((r) => ({ ...r, id: r.id, email: r.has_email ? r.id : null }));
}

async function bindCode(staffKey: string, hours = 24) {
  const code = Array.from(randomBytes(8)).map((b) => ALPHA[b % ALPHA.length]).join('');
  const expiresAt = new Date(Date.now() + hours * 3600_000);
  await getPool().query(`INSERT INTO staff_bind_codes (code, staff_email, expires_at) VALUES ($1, $2, $3)`, [code, staffKey, expiresAt]);
  return { code, expiresAt };
}

function cleanRoles(v: unknown): StaffRole[] {
  const r = (Array.isArray(v) ? v : []).map(String).filter((x): x is StaffRole => ROLES.includes(x as StaffRole));
  if (!r.length) throw new CrmError('bad_request', '请选择角色');
  return Array.from(new Set(r));
}
function cleanRegions(v: unknown): string[] {
  return (Array.isArray(v) ? v : []).filter(isRegion);
}

/** 加人：填手机号 → 选角色和地区 → 绑定码（24 小时） */
export async function addMember(s: Staff, b: { name?: string; phone?: string; cc?: string; roles?: unknown; regions?: unknown }) {
  const name = String(b.name ?? '').trim().slice(0, 40);
  if (!name) throw new CrmError('bad_request', '请填写姓名（例如“东哥 · 微信 2”）');
  const phone = b.phone ? normalizePhone(String(b.phone), b.cc === '+86' ? '+86' : '+1') : null;
  if (!phone) throw new CrmError('bad_phone', '请填写对方的手机号（美国 10 位，中国加 +86）');
  const roles = cleanRoles(b.roles);
  const regions = cleanRegions(b.regions);
  const key = `mp:${randomUUID()}`;
  await getPool().query(`INSERT INTO staff_roles (email, name, roles, regions, phone) VALUES ($1, $2, $3, $4, $5)`, [key, name, roles, regions, phone]);
  await audit(getPool() as never, s, 'team_add', 'staff', key, { after: { name, roles, regions, phone } });
  return { id: key, ...(await bindCode(key)) };
}

export async function updateMember(s: Staff, id: string, b: { roles?: unknown; regions?: unknown; isActive?: boolean; name?: string }) {
  const pool = getPool();
  const { rows } = await pool.query<{ name: string; roles: string[]; regions: string[]; is_active: boolean }>(`SELECT name, roles, regions, is_active FROM staff_roles WHERE email = $1`, [id]);
  const before = rows[0];
  if (!before) throw new CrmError('not_found', '找不到这位工作人员');
  const roles = b.roles !== undefined ? cleanRoles(b.roles) : before.roles;
  const active = b.isActive !== undefined ? !!b.isActive : before.is_active;
  // 不能把最后一个能登录的管理员停掉 / 降级（避免没人能管权限）
  if ((!roles.includes('admin') || !active) && before.roles.includes('admin') && before.is_active) await assertOtherAdmin(id);
  await pool.query(
    `UPDATE staff_roles SET roles = $2, regions = $3, is_active = $4, name = coalesce($5, name), updated_at = now() WHERE email = $1`,
    [id, roles, b.regions !== undefined ? cleanRegions(b.regions) : before.regions, active, b.name ? String(b.name).trim().slice(0, 40) : null]
  );
  await audit(pool as never, s, active ? 'team_update' : 'team_disable', 'staff', id, { before, after: { roles, active, regions: b.regions } });
  return { ok: true };
}

/**
 * 还有别的“能登录的”在用管理员吗：绑过小程序微信，或有网站登录邮箱（不是 mp: 内部编号）。
 * 刚加完还没输绑定码的那一行不算（测试 P2）。加锁，防止两个请求同时把最后两个都停掉。
 */
export async function assertOtherAdmin(exceptKey: string) {
  const { withTransaction } = await import('@/lib/db/client');
  await withTransaction(async (db) => {
    await db.query(`SELECT email FROM staff_roles WHERE is_active AND 'admin' = ANY(roles) FOR UPDATE`);
    const { rows } = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM staff_roles WHERE is_active AND 'admin' = ANY(roles) AND email <> $1 AND (mp_contact_id IS NOT NULL OR email NOT LIKE 'mp:%')`,
      [exceptKey]
    );
    if (!rows[0].n) throw new CrmError('conflict', '这是最后一个能登录的管理员，不能停用或降级');
  });
}

export async function newBindCode(s: Staff, id: string) {
  const { rows } = await getPool().query(`SELECT 1 FROM staff_roles WHERE email = $1 AND is_active`, [id]);
  if (!rows[0]) throw new CrmError('not_found', '找不到这位工作人员或已停用');
  await audit(getPool() as never, s, 'team_bind_code', 'staff', id, {});
  return bindCode(id);
}

const KEY_ACTIONS = [
  'capacity_change', 'staff_admit', 'noshow_exempt', 'confirm_timeline', 'backfill_attendance', 'merge_contacts', 'undo_merge_contacts',
  'team_add', 'team_update', 'team_disable', 'team_bind_code', 'join_link_sent', 'home_slide', 'home_slide_remove', 'contact_region',
  'checkin_questions_update', 'staff_checkin', 'onsite_register', 'newsletter_confirm', 'create_event', 'update_event', 'regenerate_checkin_code', 'upsert_staff'
];

/** 操作记录（管理员）：谁、用哪个账号、什么时候、做了什么 */
export async function teamLog(limit = 200) {
  const { rows } = await getPool().query(
    `SELECT a.created_at, a.actor, a.action, a.target_type, a.target_id, a.reason,
            CASE WHEN a.target_type = 'contact' THEN (SELECT NULLIF(name, '微信用户') FROM contacts WHERE id::text = a.target_id)
                 WHEN a.target_type = 'staff' THEN (SELECT name FROM staff_roles WHERE email = a.target_id)
                 WHEN a.target_type = 'event' THEN (SELECT title FROM events WHERE id::text = a.target_id)
                 WHEN a.target_type = 'newsletter' THEN (SELECT subject FROM newsletter_issues WHERE id::text = a.target_id) END AS target_name,
            a.before_value, a.after_value
       FROM crm_audit_log a
      WHERE a.action = ANY($1::text[]) OR a.actor LIKE 'staff:%'
      ORDER BY a.created_at DESC LIMIT $2`,
    [KEY_ACTIONS, limit]
  );
  return rows;
}
