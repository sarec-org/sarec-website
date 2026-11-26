/**
 * 指令 89-B.2：后台「搜页面」大白话验收——这 40 个词每个都要搜得到（按管理员能看到的全部页面 + 开关算）。
 * 用法：pnpm dlx tsx scripts/check-staff-search-words.ts   （只读清单，不连库、不发请求）
 * 输出：词 → 前 3 个结果（第一个就是按回车会去的地方）；有词搜不到时退出码 1。
 */
import { NAV_ITEMS, SEARCH_EXTRA, searchNav } from '../components/crm/staff/nav';

export const WORDS = ['小程序码', '二维码', '码', '太阳码', '海报', '模板', '换海报', '祝福', '节日', '主办方', '开通', '名单', '报名', '导出', '签到', '麻将', '掼蛋', '俱乐部', '开关', '关掉', '传海报', 'AI 标识', '会员', '入会', '名片', '渠道', '推荐', '群发', '通知', '活动', '审核', '下架', '举报', '照片', '相册', '资料', '首页大图', '设置', '员工', '权限'];

const all = [...SEARCH_EXTRA, ...NAV_ITEMS];
let bad = 0;
const md = process.argv.includes('--md');
if (md) console.log('| 搜的词 | 第一个结果（回车直接去） | 还会列出 |\n|---|---|---|');
for (const w of WORDS) {
  const r = searchNav(w, all);
  const name = (it: (typeof all)[number]) => `${it.label}（${it.sub ? `${it.tab} › ${it.sub}` : it.tab}）`;
  if (!r.length) bad++;
  if (md) console.log(`| ${w} | ${r[0] ? `${name(r[0])} \`${r[0].href}\`` : '**搜不到**'} | ${r.slice(1, 4).map((it) => it.label).join('、')} |`);
  else console.log(`${r.length ? 'OK ' : 'NO '} ${w} → ${r.slice(0, 3).map(name).join(' / ') || '搜不到'}`);
}
console.log(md ? `\n${WORDS.length} 个词，搜不到 ${bad} 个。` : `\n${WORDS.length} words, ${bad} missing`);
process.exit(bad ? 1 : 0);
