/**
 * 开通 / 修改工作人员后台权限。
 * 用法：DATABASE_URL=... pnpm dlx tsx scripts/seed-staff.ts <email> <姓名> <角色...>
 * 角色：checkin（现场签到）finance（财务核款）ops（运营）admin（管理员）
 */
import { getPool } from '@/lib/db/client';
import { guardNotProduction } from './_guard';

guardNotProduction();
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const [email, name, ...roles] = args;
const valid = ['checkin', 'finance', 'ops', 'admin'];
if (!email || !name || !roles.length || roles.some((r) => !valid.includes(r))) {
  console.error('用法：seed-staff.ts <email> <姓名> <checkin|finance|ops|admin ...>');
  process.exit(1);
}
(async () => {
  const pool = getPool();
  await pool.query(
    `INSERT INTO staff_roles (email, name, roles) VALUES (lower($1), $2, $3)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, roles = EXCLUDED.roles, is_active = true, updated_at = now()`,
    [email.trim(), name, roles]
  );
  await pool.query(
    `INSERT INTO crm_audit_log (actor, action, target_type, target_id, after_value) VALUES ('script:seed-staff', 'upsert_staff', 'staff', lower($1), $2)`,
    [email.trim(), JSON.stringify({ roles })]
  );
  console.log(`已开通：${email} ${name} [${roles.join(', ')}]`);
  await pool.end();
})().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
