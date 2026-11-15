/**
 * 1.4.0 后台导航清单（总则第 1、3、7、10 条）：每个后台页面一个固定的家、一个固定的名字。
 * - 顶部导航、「更多」下拉、手机「菜单」、导航搜索、后台首页卡片，全部从这一份清单出，名字不会再对不上。
 * - role：和页面 StaffGate 的角色一致（多个用 | 分开，满足其一即可；管理员全部能进）。
 * - primary：电脑上直接摆在导航条上；其余收进「更多」。手机上全部按分组列出。
 * - words：搜索时的常用叫法。
 * 改名、挪位置先给东哥“原来 → 改成 → 原因”，同意了再改这里。
 */
export type NavGroup = '今天现场' | '活动' | '会员与客户' | '内容' | '设置与团队';
export type NavItem = { href: string; label: string; role: string; group: NavGroup | null; primary?: boolean; words: string[] };

export const NAV_GROUPS: NavGroup[] = ['今天现场', '活动', '会员与客户', '内容', '设置与团队'];

export const NAV_ITEMS: NavItem[] = [
  { href: '/zh/staff', label: '首页', role: '', group: null, primary: true, words: ['后台首页', '首页', '主页'] },
  // 今天现场
  { href: '/zh/staff/followups', label: '待跟进', role: 'ops', group: '今天现场', primary: true, words: ['待跟进任务', '线索', '咨询', '待处理', '失败', '异常', '跟进'] },
  { href: '/zh/staff/checkin', label: '签到台', role: 'checkin', group: '今天现场', primary: true, words: ['现场签到台', '签到', '代签到', '现场登记', '扫码签到'] },
  { href: '/zh/staff/backfill', label: '补登记到场', role: 'checkin', group: '今天现场', words: ['补签到', '补登记', '漏签', '补到场'] },
  { href: '/zh/staff/payments', label: '核款', role: 'finance', group: '今天现场', primary: true, words: ['核款工作台', '收款', 'Zelle', '付款', '订单', '到账'] },
  // 活动
  { href: '/zh/staff/events', label: '活动', role: 'ops|checkin', group: '活动', primary: true, words: ['活动管理', '新建活动', '签到码', '门口签到码', '报名码', '海报', '二维码', '报名名单'] },
  { href: '/zh/staff/prep', label: '活动筹备清单', role: 'ops|checkin', group: '活动', words: ['筹备', '筹备清单', '清单', '模板', '分工'] },
  { href: '/zh/staff/album', label: '相册', role: 'ops', group: '活动', primary: true, words: ['活动相册', '照片', '传照片', '上传照片', '封面'] },
  { href: '/zh/staff/recaps', label: '活动回顾', role: 'ops', group: '活动', words: ['回顾', '推文', '复盘'] },
  { href: '/zh/staff/checkin-questions', label: '签到选择题', role: 'ops', group: '活动', words: ['选择题', '题库', '签到问题'] },
  { href: '/zh/staff/rooms', label: '会议室与电子屏', role: 'ops', group: '活动', primary: true, words: ['会议室', '电子屏', '预约', '场地', '屏幕'] },
  // 会员与客户
  { href: '/zh/staff/contacts', label: '客户', role: 'ops', group: '会员与客户', primary: true, words: ['客户查询', '会员', '档案', '客户档案', '导出', '找人', '查人'] },
  { href: '/zh/staff/join-requests', label: '入会申请', role: 'ops', group: '会员与客户', words: ['入会', '加入商会', '缴费链接', '会费'] },
  { href: '/zh/staff/duplicates', label: '合并重复档案', role: 'ops', group: '会员与客户', words: ['重复', '合并', '去重'] },
  { href: '/zh/staff/display', label: '官网展示', role: 'ops', group: '会员与客户', primary: true, words: ['官网展示审核', '官网', '展示'] },
  { href: '/zh/staff/channels', label: '渠道码', role: 'ops', group: '会员与客户', words: ['渠道', '合作商家', '专属码', '推广码'] },
  // 内容
  { href: '/zh/staff/newsletter', label: '邮件通讯', role: 'ops', group: '内容', words: ['邮件', '群发', '通讯', '发邮件', 'newsletter'] },
  { href: '/zh/staff/home-slides', label: '首页轮播', role: 'ops', group: '内容', words: ['轮播', 'banner', '横幅', '置顶'] },
  { href: '/zh/staff/docs', label: '商会资料', role: 'admin', group: '内容', words: ['资料', 'PPT', 'PDF', '介绍'] },
  { href: '/zh/staff/cards', label: '内容审核', role: 'ops', group: '内容', words: ['审核', '名片', '电子名片', '客户照片', '下架'] },
  { href: '/zh/staff/agent', label: 'AI 助手', role: 'ops', group: '内容', primary: true, words: ['AI', '人工智能', '机器人', '常见问题', 'FAQ', '对话'] },
  // 设置与团队
  { href: '/zh/staff/team', label: '团队', role: 'admin', group: '设置与团队', primary: true, words: ['工作人员', '同事', '权限', '绑定', '绑定码', '工作台', '出码', '加人', '角色'] },
  { href: '/zh/staff/settings', label: '设置', role: 'admin', group: '设置与团队', primary: true, words: ['价格', '折扣', 'Zelle', '商家优惠', '商会微信', '微信二维码', '换二维码', '邮件额度'] },
  { href: '/zh/staff/growth', label: '增长', role: 'ops', group: '设置与团队', primary: true, words: ['增长与设置', '点击统计', '推荐排行', '视频号', '专委会', '企业微信', '内容显示范围'] },
  { href: '/zh/staff/flow-stats', label: '流程数据', role: 'ops', group: '设置与团队', words: ['数据', '统计', '到场率', '转化'] },
  { href: '/zh/staff/features', label: '功能排行', role: 'ops', group: '设置与团队', words: ['排行', '点击数据', '功能月报'] },
  { href: '/zh/staff/client-errors', label: '线上报错', role: 'ops', group: '设置与团队', words: ['报错', '错误', 'bug', '出错'] }
];

/** 电脑上导航条直接摆的项，顺序沿用 1.3 的导航（只加了「团队」，「增长与设置」改名「增长」，均已点头） */
export const PRIMARY_ORDER = [
  '/zh/staff', '/zh/staff/followups', '/zh/staff/checkin', '/zh/staff/payments', '/zh/staff/events', '/zh/staff/contacts', '/zh/staff/album',
  '/zh/staff/rooms', '/zh/staff/growth', '/zh/staff/display', '/zh/staff/agent', '/zh/staff/settings', '/zh/staff/team'
];

export const ROLE_NAME: Record<string, string> = { admin: '管理员', ops: '运营', checkin: '签到员', finance: '财务' };

/** 登录者能不能进这一项（管理员全部能进） */
export function canSee(roles: string[], item: { role: string }) {
  if (!item.role) return true;
  if (roles.includes('admin')) return true;
  return item.role.split('|').some((r) => roles.includes(r));
}

/** 当前路径属于哪一项（详情页算在它的列表页上），首页只认完全相同 */
export function activeHref(pathname: string): string | null {
  let best: string | null = null;
  for (const it of NAV_ITEMS) {
    if (it.href === '/zh/staff') {
      if (pathname === '/zh/staff' || pathname === '/zh/staff/') best = best ?? it.href;
      continue;
    }
    if ((pathname === it.href || pathname.startsWith(it.href + '/')) && (!best || it.href.length > best.length)) best = it.href;
  }
  return best;
}

/** 导航搜索：名字、常用叫法里包含输入的字（不分大小写），名字开头的排前面 */
export function searchNav(q: string, items: NavItem[]): NavItem[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const score = (it: NavItem) => {
    const l = it.label.toLowerCase();
    if (l === s) return 0;
    if (l.startsWith(s)) return 1;
    if (l.includes(s)) return 2;
    if (it.words.some((w) => w.toLowerCase() === s)) return 3;
    if (it.words.some((w) => w.toLowerCase().includes(s) || s.includes(w.toLowerCase()))) return 4;
    return 99;
  };
  return items.map((it) => [it, score(it)] as const).filter(([, n]) => n < 99).sort((a, b) => a[1] - b[1]).map(([it]) => it);
}
