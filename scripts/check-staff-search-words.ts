/**
 * 指令 89-B.2 / 验收 P2-5：后台「搜页面」大白话验收。
 * - 40 个词每个都要搜得到（按管理员能看到的全部页面 + 开关算）；
 * - 每个词「第一个结果」（按回车会去的地方）必须是 EXPECT 里写的那一页——"最该去的地方"，改清单时这里一起改；
 * - 另外验收时东哥可能说的说法（EXTRA_WORDS）也查第一个结果。
 * 用法：pnpm dlx tsx scripts/check-staff-search-words.ts [--md]   （只读清单，不连库、不发请求）；有不对的退出码 1。
 */
import { NAV_ITEMS, SEARCH_EXTRA, searchNav } from '../components/crm/staff/nav';

/** 词 → 第一个结果应该去的网址 */
const EXPECT: Record<string, string> = {
  小程序码: '/zh/staff/settings#common', 二维码: '/zh/staff/settings#common', 码: '/zh/staff/settings#common', 太阳码: '/zh/staff/settings#common',
  海报: '/zh/staff/poster-templates', 模板: '/zh/staff/poster-templates#list', 换海报: '/zh/staff/poster-templates#list',
  祝福: '/zh/staff/poster-templates?purpose=greeting#list', 节日: '/zh/staff/festivals', 主办方: '/zh/staff/organizers', 开通: '/zh/staff/team#add',
  名单: '/zh/staff/events?want=list', 报名: '/zh/staff/events?want=list', 导出: '/zh/staff/events?want=list', 签到: '/zh/staff/checkin',
  麻将: '/zh/staff/clubs#club-mahjong', 掼蛋: '/zh/staff/clubs#club-guandan', 俱乐部: '/zh/staff/clubs', 开关: '/zh/staff/settings#switches', 关掉: '/zh/staff/settings#switches',
  传海报: '/zh/staff/poster-templates#upload-own', 'AI 标识': '/zh/staff/poster-templates#ai-badge', 会员: '/zh/staff/contacts', 入会: '/zh/staff/join-requests',
  名片: '/zh/staff/cards', 渠道: '/zh/staff/channels', 推荐: '/zh/staff/data', 群发: '/zh/staff/broadcast', 通知: '/zh/staff/notify',
  活动: '/zh/staff/events', 审核: '/zh/staff/cards', 下架: '/zh/staff/moderation', 举报: '/zh/staff/moderation', 照片: '/zh/staff/album', 相册: '/zh/staff/album',
  资料: '/zh/staff/docs', 首页大图: '/zh/staff/home-slides', 设置: '/zh/staff/settings', 员工: '/zh/staff/team#add', 权限: '/zh/staff/team'
};
export const WORDS = Object.keys(EXPECT);

/** 验收报告里东哥可能说的别的说法（第二节"表外 33 个词"里出问题的那些） */
const EXTRA_WORDS: Record<string, string> = {
  下架模板: '/zh/staff/poster-templates#list', 换模板: '/zh/staff/poster-templates#list', 小程序链接: '/zh/staff/settings#common', 链接: '/zh/staff/settings#common',
  报名名单: '/zh/staff/events?want=list', 活动名单: '/zh/staff/events?want=list', 导出名单: '/zh/staff/events?want=list', 导出报名: '/zh/staff/events?want=list',
  谁报名: '/zh/staff/events?want=list', 今天报名: '/zh/staff/events?want=list', 举报活动: '/zh/staff/moderation', 投诉: '/zh/staff/moderation',
  加同事: '/zh/staff/team#add', 工作人员: '/zh/staff/team#add', 说明: '/zh/staff/settings#off', 客户名单: '/zh/staff/contacts', 祝福图: '/zh/staff/poster-templates?purpose=greeting#list'
};

const all = [...SEARCH_EXTRA, ...NAV_ITEMS];
const md = process.argv.includes('--md');
let bad = 0;
const name = (it: (typeof all)[number]) => `${it.label}（${it.sub ? `${it.tab} › ${it.sub}` : it.tab}）`;
function run(title: string, list: Record<string, string>) {
  if (md) console.log(`\n**${title}**\n\n| 搜的词 | 第一个结果（回车直接去） | 对不对 | 还会列出 |\n|---|---|---|---|`);
  for (const [w, want] of Object.entries(list)) {
    const r = searchNav(w, all);
    const ok = !!r[0] && r[0].href === want;
    if (!ok) bad++;
    if (md) console.log(`| ${w} | ${r[0] ? `${name(r[0])} \`${r[0].href}\`` : '**搜不到**'} | ${ok ? '对' : `**不对**（应去 \`${want}\`）`} | ${r.slice(1, 4).map((it) => it.label).join('、')} |`);
    else console.log(`${ok ? 'OK ' : 'NO '} ${w} → ${r.slice(0, 3).map(name).join(' / ') || '搜不到'}${ok ? '' : `   应去 ${want}`}`);
  }
}
run(`40 个词（${WORDS.length}）`, EXPECT);
run('验收时补查的说法', EXTRA_WORDS);
console.log(md ? `\n第一个结果不对的：${bad} 个。` : `\n${bad} wrong`);
process.exit(bad ? 1 : 0);
