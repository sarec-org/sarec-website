/**
 * 正式库一次性改动（后台综合优化 七.2）：重复档案自动合并的“首次批量”——手机号相同、两边都已验证的档案合并成一份。
 * ------------------------------------------------------------------
 * 默认只打印要合并哪几对（dry-run，不改数据）；加 --apply 才执行。等东哥说“行”后由开发窗口做成双击文件执行；子任务 C 不执行。
 * - 留哪一份：工作人员账号 > 有效会员 > 报名多的 > 建档早的；两边都是工作人员账号的不合并（留给人）。
 * - 每次合并都留记录（contact_merges.auto = true），在后台「合并重复档案 → 合并记录」里可以一键撤销。
 * - 执行前后各数一次：客户数、会员数、报名数、签到数——报名 / 签到 / 会员记录只搬家不删除，数字应当不变（客户数会少掉被合并的份数）。
 * - --apply 成功后把每天自动合并的开关 dup_auto_merge 打开（之后每天定时任务自动做）；加 --no-enable 则不打开。
 * 用法：DATABASE_URL=... pnpm dlx tsx scripts/admin-oneoff-merge-dups.ts [--limit 200] [--apply] [--no-enable]
 */
import { getPool } from '@/lib/db/client';
import { autoMergeVerified, verifiedPhonePairs } from '@/lib/crm/autoMerge';
import { setSetting } from '@/lib/crm/orders';

async function counts() {
  const { rows } = await getPool().query<{ contacts: number; members: number; regs: number; checkins: number }>(
    `SELECT (SELECT count(*)::int FROM contacts WHERE merged_into IS NULL) AS contacts,
            (SELECT count(DISTINCT contact_id)::int FROM applications WHERE membership_end_date >= current_date AND application_status IN ('approved','paid','second_payment_due')) AS members,
            (SELECT count(*)::int FROM registrations) AS regs,
            (SELECT count(*)::int FROM registrations WHERE arrival_status = 'checked_in') AS checkins`
  );
  return rows[0];
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('请先设置 DATABASE_URL');
  const a = process.argv.slice(2);
  const apply = a.includes('--apply');
  const li = a.indexOf('--limit');
  const limit = li >= 0 ? Math.min(500, Number(a[li + 1]) || 200) : 200;
  const pairs = await verifiedPhonePairs();
  console.log(`手机号相同且两边都已验证的档案：${pairs.length} 对`);
  for (const p of pairs.slice(0, limit)) console.log(`  · 留 #${p.keptNo} ${p.keptName}  ←  并入 #${p.mergedNo} ${p.mergedName}  （手机 ***${p.phone.slice(-4)}）`);
  const before = await counts();
  console.log('执行前：', before);
  if (!apply) {
    console.log('\n这是预演，没有改任何数据。确认无误后加 --apply 执行。');
    return;
  }
  const r = await autoMergeVerified({ apply: true, limit });
  for (const x of r.items) console.log(`  ${x.error ? '没合并' : '已合并'} #${x.keptNo} ← #${x.mergedNo}${x.error ? `（${x.error}）` : `（合并记录 ${x.mergeId}）`}`);
  const after = await counts();
  console.log('执行后：', after);
  if (after.regs !== before.regs || after.checkins !== before.checkins || after.members !== before.members) {
    console.log('！报名 / 签到 / 会员数前后不一致，请检查（每一次合并都能在后台撤销）');
  }
  if (!a.includes('--no-enable')) {
    await setSetting(getPool(), 'dup_auto_merge', true, '一次性脚本');
    console.log('已打开每天自动合并（dup_auto_merge）。');
  }
  console.log(`\n完成：合并 ${r.count} 对。`);
}

main()
  .then(() => getPool().end())
  .catch(async (e) => {
    console.error('失败：', e instanceof Error ? e.message : e);
    await getPool().end().catch(() => undefined);
    process.exit(1);
  });
