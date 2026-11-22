/**
 * 后台综合优化 11/21（第二部分二）：旧后台网址全部还能打开——要么原地 200，要么自动跳到新位置（再打开是 200）。
 * 列出：改版前（7b912a1）导航里的全部后台页面 + 仓库里邮件 / 通知 / 定时任务 / 页面里生成过的后台链接。
 * 用法：BASE=http://localhost:3000 pnpm dlx tsx scripts/check-staff-redirects.ts
 * 只发 GET，不登录、不改任何数据。不许对正式站跑（BASE 是正式站时直接退出）。
 */
import { NAV_ITEMS, OLD_URLS, PENDING_MERGE } from '../components/crm/staff/nav';

const BASE = (process.env.BASE || 'http://localhost:3000').replace(/\/$/, '');
if (/sinoamericanrec\.org/.test(BASE)) {
  console.error('不对正式站跑。');
  process.exit(2);
}

const FAKE = '00000000-0000-4000-8000-000000000000';
/** 改版前导航里的全部页面（原 13 个顶栏入口 + 「更多」里的每个子页面） */
const OLD_NAV = [
  '/zh/staff', '/zh/staff/followups', '/zh/staff/checkin', '/zh/staff/backfill', '/zh/staff/payments',
  '/zh/staff/events', '/zh/staff/prep', '/zh/staff/album', '/zh/staff/recaps', '/zh/staff/checkin-questions', '/zh/staff/rooms',
  '/zh/staff/contacts', '/zh/staff/join-requests', '/zh/staff/duplicates', '/zh/staff/display', '/zh/staff/channels',
  '/zh/staff/jobs', '/zh/staff/jobs/pros', '/zh/staff/jobs/trades', '/zh/staff/jobs/cities', '/zh/staff/jobs/switches', '/zh/staff/jobs/stats', '/zh/staff/jobs/reports', '/zh/staff/jobs/invite',
  '/zh/staff/newsletter', '/zh/staff/home-slides', '/zh/staff/docs', '/zh/staff/cards', '/zh/staff/agent',
  '/zh/staff/team', '/zh/staff/settings', '/zh/staff/growth', '/zh/staff/flow-stats', '/zh/staff/features', '/zh/staff/client-errors'
];
/** 仓库里生成过的后台链接（邮件、通知、定时任务、页面里的链接；带参数的照原样） */
const FROM_CODE: [string, string][] = [
  ['/zh/staff/followups', 'lib/crm/followups.ts 新咨询通知邮件；lib/agent/digest.ts AI 助手日报'],
  ['/zh/staff/followups?tab=exceptions', '后台首页“失败 / 异常”'],
  ['/zh/staff/payments', 'lib/crm/membership.ts 入会到账邮件'],
  [`/zh/staff/prep/${FAKE}`, 'lib/crm/prep.ts 筹备清单到期提醒 / 活动前汇总邮件'],
  ['/zh/staff/agent', 'lib/agent/digest.ts AI 助手日报'],
  ['/zh/staff/cards', 'lib/agent/digest.ts 名片审核'],
  ['/zh/staff/checkin?reg=1&staff=1', 'components/crm/CheckinCodeNote.tsx 个人签到码'],
  ['/zh/staff/settings#wechat-qr', '旧首页卡片「换商会微信二维码」、旧「增长」页'],
  ['/zh/staff/settings#email-quota', '邮件通讯页“额度在设置里改”'],
  [`/zh/staff/contacts/${FAKE}`, '推荐排行 / 客户档案链接'],
  [`/zh/staff/events/${FAKE}`, '活动详情链接'],
  ['/zh/staff/growth?days=30', '旧「增长」页带参数'],
  ['/zh/staff/client-errors?days=7', '旧「线上报错」页带参数']
];

const navHrefs = NAV_ITEMS.map((it) => it.href);
const inNav = (path: string) => navHrefs.some((h) => path === h || path.startsWith(h + '/'));

async function check(url: string): Promise<{ ok: boolean; line: string }> {
  const r1 = await fetch(BASE + url, { redirect: 'manual' });
  if (r1.status === 200) {
    const p = url.split(/[?#]/)[0];
    return { ok: inNav(p), line: `200 原地打开${inNav(p) ? '' : '（但新导航里没有它！）'}` };
  }
  if (r1.status >= 300 && r1.status < 400) {
    const loc = r1.headers.get('location') || '';
    const to = new URL(loc, BASE);
    const r2 = await fetch(to.toString(), { redirect: 'manual' });
    const good = r2.status === 200 && inNav(to.pathname) && OLD_URLS.some((o) => url.split(/[?#]/)[0] === o.from);
    return { ok: good, line: `${r1.status} → ${to.pathname}${to.search}（${r2.status}）` };
  }
  return { ok: false, line: `${r1.status} 打不开` };
}

async function main() {
  const all: [string, string][] = [...OLD_NAV.map((u) => [u, '改版前导航'] as [string, string]), ...FROM_CODE];
  let bad = 0;
  for (const [u, why] of all) {
    const r = await check(u);
    if (!r.ok) bad++;
    console.log(`${r.ok ? '✓' : '✗'} ${u}  ${r.line}  —— ${why}`);
  }
  // 新导航里的每一页也都要能打开
  for (const h of navHrefs) {
    if (all.some(([u]) => u === h)) continue;
    const r = await check(h);
    if (!r.ok && PENDING_MERGE.includes(h) && /404/.test(r.line)) {
      console.log(`… ${h}  ${r.line}  —— 别的子任务的新页面，合并后再查（合并后把它从 nav.ts 的 PENDING_MERGE 删掉）`);
      continue;
    }
    if (!r.ok) bad++;
    console.log(`${r.ok ? '✓' : '✗'} ${h}  ${r.line}  —— 新页面`);
  }
  console.log(bad ? `\n${bad} 个有问题` : `\n全部通过：${all.length} 个旧网址 + 新导航页面都能打开`);
  process.exit(bad ? 1 : 0);
}
main();
