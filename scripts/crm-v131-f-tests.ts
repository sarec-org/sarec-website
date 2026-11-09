/**
 * 1.3.1 F 团队与权限 —— 回归测试（测试库）。只建 DEV131- 数据，按 ID 清理。
 * 用法：DATABASE_URL=<测试库> pnpm dlx tsx scripts/crm-v131-f-tests.ts --i-know-this-is-not-production
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { guardNotProduction } from './_guard';
guardNotProduction();
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const made = { c: [] as string[], staff: [] as string[], e: [] as string[] };
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };
async function wx(tag: string) {
  const { rows } = await pool.query<{ id: string }>(`INSERT INTO contacts (name, wechat_openid, acquisition_source) VALUES ($1, $2, 'test') RETURNING id`, [`DEV131-${tag}`, `dev131-openid-${randomBytes(4).toString('hex')}`]);
  made.c.push(rows[0].id);
  return rows[0].id;
}
async function main() {
  const team = await import('@/lib/crm/team');
  const { staffFor } = await import('@/lib/crm/auth');
  const { claimBindCode } = await import('@/lib/crm/workbench');
  const { createEvent, updateEvent } = await import('@/lib/crm/staff');
  const admin = { contactId: '00000000-0000-0000-0000-000000000000', email: 'dev131-admin@example.com', name: 'DEV131-管理员', roles: ['admin'] as ('admin')[] };
  const r1 = await team.addMember(admin, { name: `DEV131-地区 ${sfx}`, phone: '6265550199', roles: ['ops'], regions: ['纽约'] });
  made.staff.push(r1.id);
  assert.match(r1.code, /^[A-Z0-9]{8}$/);
  assert.ok(new Date(r1.expiresAt).getTime() - Date.now() > 23 * 3600_000);
  ok('加人：手机号 + 角色 + 地区 → 8 位绑定码，24 小时有效');
  const phone = await wx('地区管理员微信');
  await claimBindCode(phone, r1.code);
  const s = await staffFor(phone);
  assert.ok(s && s.roles.includes('ops') && s.regions?.includes('纽约'));
  ok('对方在小程序输入绑定码 → 工作台开通（运营 + 只管纽约）');
  await assert.rejects(createEvent(s!, { title: `DEV131-洛杉矶活动 ${sfx}`, startsAt: new Date(Date.now() + 86400_000).toISOString(), region: '洛杉矶/橙县' }), /只能管理 纽约/);
  const ev = await createEvent(s!, { title: `DEV131-纽约活动 ${sfx}`, startsAt: new Date(Date.now() + 86400_000).toISOString(), region: '纽约', listed: false });
  made.e.push(ev.id);
  await assert.rejects(updateEvent(s!, ev.id, { notifyScope: 'all' }), /只有管理员/);
  ok('地区管理员只能建自己地区的活动；“全部地区”通知只有管理员能选');
  await team.updateMember(admin, r1.id, { isActive: false });
  assert.equal(await staffFor(phone), null);
  ok('停用：立即失去工作台权限');
  await team.updateMember(admin, r1.id, { isActive: true, roles: ['checkin'] });
  const s2 = await staffFor(phone);
  assert.deepEqual(s2?.roles, ['checkin']);
  ok('改角色：立即生效');
  const { rows: admins } = await pool.query<{ email: string }>(`SELECT email FROM staff_roles WHERE is_active AND 'admin' = ANY(roles)`);
  if (admins.length === 0) {
    const r2 = await team.addMember(admin, { name: `DEV131-唯一管理员 ${sfx}`, phone: '6265550198', roles: ['admin'] });
    made.staff.push(r2.id);
    await assert.rejects(team.updateMember(admin, r2.id, { isActive: false }), /最后一个在用的管理员/);
    ok('最后一个在用的管理员不能停用');
  } else console.log('  · 测试库里已有管理员，跳过“最后一个管理员”检查');
  const log = await team.teamLog(50);
  assert.ok(log.some((l: { action: string }) => l.action === 'team_add') && log.some((l: { action: string }) => l.action === 'team_disable'));
  ok('操作记录里有加人、停用、改权限（谁、什么时候）');
  console.log(`\n全部通过：${passed} 项`);
}
async function cleanup() {
  await pool.query(`DELETE FROM staff_bind_codes WHERE staff_email = ANY($1::text[])`, [made.staff]);
  await pool.query(`DELETE FROM crm_audit_log WHERE target_id = ANY($1::text[]) OR actor = 'staff:DEV131-管理员' OR target_id = ANY($2::text[])`, [made.staff, made.e]);
  await pool.query(`DELETE FROM staff_roles WHERE email = ANY($1::text[])`, [made.staff]);
  await pool.query(`DELETE FROM event_prep_items WHERE event_id = ANY($1::uuid[])`, [made.e]).catch(() => undefined);
  await pool.query(`DELETE FROM event_prep WHERE event_id = ANY($1::uuid[])`, [made.e]).catch(() => undefined);
  await pool.query(`DELETE FROM events WHERE id = ANY($1::uuid[])`, [made.e]);
  await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[])`, [made.c]);
  console.log('清理完成');
}
main()
  .catch((e) => { console.error('✗ 失败：', e); process.exitCode = 1; })
  .finally(async () => { await cleanup().catch((e) => console.error('清理出错', e)); await pool.end(); });
