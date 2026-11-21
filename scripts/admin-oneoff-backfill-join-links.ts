/**
 * 正式库一次性改动（后台综合优化 一.1）：已有的、还没处理的入会申请，照“申请一提交就自动发缴费链接”补发一次。
 * ------------------------------------------------------------------
 * 默认只打印要补发哪几条（dry-run，不改数据、不发任何东西）；加 --apply 才执行。等东哥说“行”后由开发窗口做成双击文件执行；子任务 C 不执行。
 * - 只补发：状态还是“新申请”、从没发过缴费链接的。内部账号 / 审核演示 / 测试账号（contacts.account_kind）一律不发——
 *   东哥本人测试的那条：先跑 scripts/admin-oneoff-internal-account.ts 把他的档案标成内部账号，这里就自动排除；
 *   也可以用 --skip <申请编号>（可给多次）再手动排除。
 * - 每条都过通知总闸（lib/crm/notifyGate.ts）：总闸关着只会在申请上记“本该发什么”（收件人打码），不真发——
 *   所以要真发，必须先由东哥点头打开 notify_live，再跑 --apply。
 * - 发了什么、什么时候发的，记在每条申请上（link_log）。一次最多 50 条。
 * 用法：DATABASE_URL=... pnpm dlx tsx scripts/admin-oneoff-backfill-join-links.ts [--skip <申请编号>] [--apply]
 */
import { getPool } from '@/lib/db/client';
import { autoSendJoinLink, backlogJoinRequests } from '@/lib/crm/join';
import { maskTarget, notifyLive } from '@/lib/crm/notifyGate';

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('请先设置 DATABASE_URL');
  const a = process.argv.slice(2);
  const apply = a.includes('--apply');
  const skip = new Set(a.flatMap((x, i) => (x === '--skip' && a[i + 1] ? [a[i + 1]] : [])));
  const list = (await backlogJoinRequests()).filter((j) => !skip.has(j.id));
  const live = await notifyLive();
  console.log(`未处理、没发过缴费链接的入会申请：${list.length} 条（已排除内部 / 审核演示 / 测试账号${skip.size ? `，另手动排除 ${skip.size} 条` : ''}）`);
  console.log(`通知总闸：${live ? '开着（会真发）' : '关着（--apply 也只记录，不真发）'}`);
  for (const j of list) {
    console.log(`  · ${j.id}  ${j.name}  ${j.created_at.toISOString().slice(0, 10)}  ${j.phone ? `短信 ${maskTarget('sms', j.phone)}` : '没手机'}  ${j.email ? `邮件 ${maskTarget('email', j.email)}` : '没邮箱'}${j.auto_link_at ? '  （以前记过“本该发”）' : ''}`);
  }
  if (list.length > 50) throw new Error('超过 50 条，拒绝执行（请核对条件）');
  if (!apply) {
    console.log('\n这是预演，没有改任何数据、没有发任何东西。确认无误后加 --apply 执行。');
    return;
  }
  let sent = 0;
  for (const j of list) {
    const r = await autoSendJoinLink(j.id, { force: true });
    if (r.sent) sent++;
    console.log(`  ${j.id}：${r.skipped ?? r.log.map((l) => `${l.channel === 'sms' ? '短信' : '邮件'} ${l.status}`).join('，')}`);
  }
  console.log(`\n完成：真发出 ${sent} 条；其余见每条申请上的记录。`);
}

main()
  .then(() => getPool().end())
  .catch(async (e) => {
    console.error('失败：', e instanceof Error ? e.message : e);
    await getPool().end().catch(() => undefined);
    process.exit(1);
  });
