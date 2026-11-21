/**
 * 正式库一次性改动（后台综合优化 八.1）：把东哥本人的几份档案合并成一份，并标为“内部账号”。
 * ------------------------------------------------------------------
 * 默认只打印找到哪几份、打算怎么做（dry-run，不改数据）；加 --apply 才执行。等东哥说“行”后由开发窗口做成双击文件执行；子任务 C 不执行。
 * 代码里不写死任何手机号 / 邮箱：用参数传进来（可给多次）：
 *   DATABASE_URL=... pnpm dlx tsx scripts/admin-oneoff-internal-account.ts --phone +1626xxxxxxx --email a@b.com [--id <档案编号>] [--apply]
 * - 按手机号（身份号或联系方式记录）、邮箱、档案编号找出所有还没合并的档案。
 * - 留哪一份：工作人员账号 > 有效会员 > 报名多的 > 建档早的；其余不是工作人员账号的并进来（留合并记录，可在后台撤销）。
 *   绑着小程序工作台的工作人员账号（东哥几个微信号各一行）不能被合并掉：保留原样，一起标“内部账号”。
 * - 标了内部账号：不进待办、不进统计、不进推荐排行、不收跟进提醒；他的入会申请不会被自动发链接、不会被补发。
 * - 一次最多 10 份档案，多了拒绝（防止条件写宽了误伤）。
 */
import { getPool } from '@/lib/db/client';
import type { Staff } from '@/lib/crm/auth';
import { mergeContacts } from '@/lib/crm/dupMerge';
import { normalizeEmail, normalizePhone } from '@/lib/crm/events';
import { setAccountKind } from '@/lib/crm/accountKind';
import { maskTarget } from '@/lib/crm/notifyGate';

const BY: Staff = { contactId: '00000000-0000-0000-0000-000000000000', email: 'system', name: '一次性脚本·内部账号', roles: ['admin'] };

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('请先设置 DATABASE_URL');
  const a = process.argv.slice(2);
  const many = (k: string) => a.flatMap((x, i) => (x === k && a[i + 1] ? [a[i + 1]] : []));
  const apply = a.includes('--apply');
  const phones = many('--phone').map((p) => normalizePhone(p) ?? normalizePhone(p, '+86')).filter((x): x is string => !!x);
  const emails = many('--email').map((e) => normalizeEmail(e)).filter((x): x is string => !!x);
  const ids = many('--id').filter((x) => /^[0-9a-f-]{36}$/i.test(x));
  if (!phones.length && !emails.length && !ids.length) throw new Error('请用 --phone / --email / --id 指定东哥本人的档案（可给多次）');
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; member_no: number; name: string; created_at: Date; account_kind: string | null; is_staff: boolean; is_member: boolean; regs: number; phone: string | null; email: string | null }>(
    `SELECT c.id, c.member_no::int, c.name, c.created_at, c.account_kind, c.phone_e164 AS phone, c.email,
            EXISTS (SELECT 1 FROM staff_roles s WHERE s.mp_contact_id = c.id OR (s.email = c.email AND c.email_verified_at IS NOT NULL)) AS is_staff,
            EXISTS (SELECT 1 FROM applications x WHERE x.contact_id = c.id AND x.membership_end_date >= current_date AND x.application_status IN ('approved','paid','second_payment_due')) AS is_member,
            (SELECT count(*)::int FROM registrations r WHERE r.contact_id = c.id AND r.status <> 'cancelled') AS regs
       FROM contacts c
      WHERE c.merged_into IS NULL AND (
            c.id = ANY($3::uuid[])
         OR c.phone_e164 = ANY($1::text[]) OR EXISTS (SELECT 1 FROM contact_methods m WHERE m.contact_id = c.id AND m.kind = 'phone' AND m.value = ANY($1::text[]))
         OR lower(c.email) = ANY($2::text[]) OR EXISTS (SELECT 1 FROM contact_methods m WHERE m.contact_id = c.id AND m.kind = 'email' AND lower(m.value) = ANY($2::text[])))
      ORDER BY c.created_at`,
    [phones, emails, ids]
  );
  // 小程序工作台绑定的微信档案（东哥几个微信号），按 staff_roles.phone 也找出来
  const { rows: mp } = await pool.query<{ id: string }>(
    `SELECT s.mp_contact_id AS id FROM staff_roles s JOIN contacts c ON c.id = s.mp_contact_id WHERE c.merged_into IS NULL AND s.phone = ANY($1::text[])`,
    [phones]
  );
  const extra = mp.map((x) => x.id).filter((id) => !rows.some((r) => r.id === id));
  if (extra.length) {
    const { rows: more } = await pool.query<(typeof rows)[number]>(
      `SELECT c.id, c.member_no::int, c.name, c.created_at, c.account_kind, c.phone_e164 AS phone, c.email, true AS is_staff, false AS is_member,
              (SELECT count(*)::int FROM registrations r WHERE r.contact_id = c.id AND r.status <> 'cancelled') AS regs
         FROM contacts c WHERE c.id = ANY($1::uuid[])`,
      [extra]
    );
    rows.push(...more);
  }
  if (!rows.length) throw new Error('没找到档案，请核对参数');
  if (rows.length > 10) throw new Error(`找到 ${rows.length} 份，超过 10 份，拒绝执行（请把条件写准）`);
  const score = (x: (typeof rows)[number]) => [x.is_staff ? 1 : 0, x.is_member ? 1 : 0, x.regs, -new Date(x.created_at).getTime()];
  const keep = [...rows].sort((x, y) => { const a1 = score(x); const b1 = score(y); for (let i = 0; i < a1.length; i++) if (a1[i] !== b1[i]) return b1[i] - a1[i]; return 0; })[0];
  console.log(`找到 ${rows.length} 份档案：`);
  for (const r of rows) {
    const plan = r.id === keep.id ? '保留（主档案）' : r.is_staff ? '工作人员账号：不合并，只标内部账号' : '并入主档案';
    console.log(`  · #${r.member_no} ${r.name}  ${r.phone ? maskTarget('sms', r.phone) : '没手机'}  ${r.email ? maskTarget('email', r.email) : '没邮箱'}  报名 ${r.regs}${r.is_staff ? '  工作人员' : ''}${r.is_member ? '  会员' : ''}${r.account_kind ? `  现在是 ${r.account_kind}` : ''}  → ${plan}`);
  }
  if (!apply) {
    console.log('\n这是预演，没有改任何数据。确认无误后加 --apply 执行。');
    return;
  }
  for (const r of rows) {
    if (r.id === keep.id || r.is_staff) continue;
    const m = await mergeContacts(BY, keep.id, r.id, '东哥本人的几份档案合并成一份（内部账号）');
    console.log(`  已并入：#${r.member_no}（合并记录 ${m.mergeId}，可在后台撤销）`);
  }
  for (const r of rows) {
    if (r.id !== keep.id && !r.is_staff) continue;
    await setAccountKind('一次性脚本', r.id, 'internal', '东哥本人档案');
    console.log(`  已标内部账号：#${r.member_no}`);
  }
  console.log('\n完成。');
}

main()
  .then(() => getPool().end())
  .catch(async (e) => {
    console.error('失败：', e instanceof Error ? e.message : e);
    await getPool().end().catch(() => undefined);
    process.exit(1);
  });
