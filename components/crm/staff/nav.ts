/**
 * 后台导航清单（总则第 1、3、7、10 条）：每个后台页面一个固定的家、一个固定的名字。
 * - 顶栏、手机「菜单」、页面下的同栏小导航、「搜页面」、后台首页，全部从这一份清单出，名字不会再对不上。
 * - 后台综合优化（11/21，东哥已同意 13 → 7）：顶栏只留 7 个——今天、活动、客户、收款、内容、数据、设置与团队。
 *
 * 加一个新页面：在下面 NAV 里找到它属于的那一栏，加一行 { href, label, role, words } 就行（要放进栏里的小组就写 sub）。
 * 顶栏、菜单、搜索、首页都会自动带上，不用改别的文件。
 * 旧网址搬家：在 staff-redirects.json 里加一行 { from, to }（next.config.js 和 scripts/check-staff-redirects.ts 都读它）。
 *
 * - role：和页面 StaffGate 的角色一致（多个用 | 分开，满足其一即可；管理员全部能进；空 = 所有工作人员）。
 * - words：搜索时的常用叫法（含搬家前的旧名字，东哥按旧名字也能搜到）。
 * 改名、挪位置先给东哥“原来 → 改成 → 原因”，同意了再改这里。
 */
import STAFF_REDIRECTS from './staff-redirects.json';

export type NavTab = '今天' | '活动' | '客户' | '收款' | '内容' | '数据' | '设置与团队';
/** 顶栏 7 个，顺序固定 */
export const NAV_TABS: NavTab[] = ['今天', '活动', '客户', '收款', '内容', '数据', '设置与团队'];
/** 兼容旧代码：分组 = 顶栏的栏 */
export type NavGroup = NavTab;
export const NAV_GROUPS: NavGroup[] = NAV_TABS;

export type NavItem = {
  href: string;
  label: string;
  role: string;
  /** 在顶栏哪一栏 */
  tab: NavTab;
  /** 兼容旧代码（= tab） */
  group: NavTab;
  /** 栏里的小组（例如「客户」下面的「找工人 · 接活儿」） */
  sub?: string;
  words: string[];
};
type Entry = Omit<NavItem, 'tab' | 'group'>;

const JOBS = '找工人 · 接活儿';

/** 每一栏有哪些页面（第一行是点顶栏时打开的那一页） */
export const NAV: Record<NavTab, Entry[]> = {
  今天: [
    // 「今天」页本身由子任务 B 做，地址就是 /zh/staff
    { href: '/zh/staff', label: '今天', role: '', words: ['后台首页', '首页', '主页', '今天要办', '待办', '昨天的四个结果'] },
    { href: '/zh/staff/followups', label: '待跟进', role: 'ops', words: ['待跟进任务', '线索', '咨询', '待处理', '失败', '异常', '跟进'] }
  ],
  活动: [
    { href: '/zh/staff/events', label: '活动', role: 'ops|checkin', words: ['活动管理', '新建活动', '签到码', '门口签到码', '报名码', '海报', '二维码', '报名名单'] },
    { href: '/zh/staff/checkin', label: '签到台', role: 'checkin', words: ['现场签到台', '签到', '代签到', '现场登记', '扫码签到'] },
    { href: '/zh/staff/backfill', label: '补登记到场', role: 'checkin', words: ['补签到', '补登记', '漏签', '补到场'] },
    { href: '/zh/staff/prep', label: '活动筹备清单', role: 'ops|checkin', words: ['筹备', '筹备清单', '清单', '模板', '分工'] },
    { href: '/zh/staff/album', label: '相册', role: 'ops', words: ['活动相册', '照片', '传照片', '上传照片', '封面'] },
    { href: '/zh/staff/recaps', label: '活动回顾', role: 'ops', words: ['回顾', '推文', '复盘'] },
    { href: '/zh/staff/checkin-questions', label: '签到选择题', role: 'ops', words: ['选择题', '题库', '签到问题'] },
    // 1.6.0 活动工具开放给别的主办方（名字「主办方」「主办方试用看板」待东哥点头）
    { href: '/zh/staff/organizers', label: '主办方', role: 'ops', words: ['主办方', '别的主办方', '开通主办方', '开通码', '活动工具', '接龙', '先审后发', '放行', '下架活动', '停用主办方', '我也要办活动', '数据承诺', '主办方的客人'] },
    { href: '/zh/staff/organizers/trial', label: '主办方试用看板', role: 'ops', words: ['试用', '试用看板', '主办方统计', '第一次发布', '再办一场'] }
  ],
  客户: [
    { href: '/zh/staff/contacts', label: '客户', role: 'ops', words: ['客户查询', '会员', '档案', '客户档案', '导出', '找人', '查人'] },
    { href: '/zh/staff/join-requests', label: '入会申请', role: 'ops', words: ['入会', '加入商会', '缴费链接', '会费'] },
    { href: '/zh/staff/duplicates', label: '合并重复档案', role: 'ops', words: ['重复', '合并', '去重'] },
    { href: '/zh/staff/display', label: '官网展示', role: 'ops', words: ['官网展示审核', '官网', '展示'] },
    { href: '/zh/staff/channels', label: '渠道码', role: 'ops', words: ['渠道', '合作商家', '专属码', '推广码'] },
    // 子任务 C（第二部分 一.4）：专委会和俱乐部意向名单（真实姓名、联系方式、待补填）
    { href: '/zh/staff/committees', label: '专委会意向', role: 'ops', words: ['专委会', '俱乐部', '意向', '专委会意向', '专委会名单', '俱乐部意向', '待补填'] },
    // 1.5.0：俱乐部（名字东哥 11/14 已点头）——会员自己加入、组局，归「客户」，挨着专委会意向
    { href: '/zh/staff/clubs', label: '俱乐部', role: 'ops', words: ['俱乐部', '专委会', '组局', '掼蛋', '牌局', '群二维码', '负责人', '禁止名单'] },
    // 找工人 · 接活儿（1.4.3 新加的 8 个后台页，归到「客户」下面一个小组）
    { href: '/zh/staff/jobs', label: '活儿', role: 'ops', sub: JOBS, words: ['找工人', '接活', '接活儿', '找工人接活', '找工人接活儿', '发布的活儿', '下架活儿', '备注', '到期'] },
    { href: '/zh/staff/jobs/pros', label: '接活人核验', role: 'ops', sub: JOBS, words: ['核验', '牌照', '执照', 'CSLB', '施工队', '师傅', '退回', '下架接活人'] },
    { href: '/zh/staff/jobs/trades', label: '工种与资质表', role: 'ops', sub: JOBS, words: ['工种', '资质', '资质表', '分组', '首页入口', '方块'] },
    { href: '/zh/staff/jobs/cities', label: '找工人接活儿城市', role: 'ops', sub: JOBS, words: ['城市', '地区', '尔湾', '橙县', '服务城市', '加城市', '城市排序'] },
    { href: '/zh/staff/jobs/switches', label: '找工人接活儿开关', role: 'ops', sub: JOBS, words: ['开关', '开放', '缴费会员', '接活开关', '接活儿开关', '找工人开关', '收费方式', '免费额度', '免费次数'] },
    { href: '/zh/staff/jobs/stats', label: '找工人接活儿统计', role: 'ops', sub: JOBS, words: ['统计', '点击数', '联系次数', '成了', '多久有人联系'] },
    { href: '/zh/staff/jobs/reports', label: '找工人接活儿投诉', role: 'ops', sub: JOBS, words: ['投诉', '反馈', '举报'] },
    // 子任务 D（指令 13 第 3 条）：工作人员替师傅代登记、贴表批量录入
    { href: '/zh/staff/jobs/proxy', label: '代登记接活人', role: 'ops', sub: JOBS, words: ['代登记', '替师傅登记', '批量登记', '贴表', '商会代登记', '登记师傅'] },
    { href: '/zh/staff/jobs/invite', label: '邀请登记接活', role: 'ops', sub: JOBS, words: ['邀请', '行业标签', '来登记接活', '登记接活儿', '邀请会员'] }
  ],
  收款: [
    { href: '/zh/staff/payments', label: '核款', role: 'finance', words: ['核款工作台', '收款', 'Zelle', '付款', '订单', '到账'] },
    { href: '/zh/staff/rooms', label: '会议室与电子屏', role: 'ops', words: ['会议室', '电子屏', '预约', '场地', '屏幕', '收款登记'] }
  ],
  内容: [
    { href: '/zh/staff/home-slides', label: '首页轮播', role: 'ops', words: ['轮播', 'banner', '横幅', '置顶'] },
    { href: '/zh/staff/docs', label: '商会资料', role: 'admin', words: ['资料', 'PPT', 'PDF', '介绍'] },
    { href: '/zh/staff/newsletter', label: '邮件通讯', role: 'ops', words: ['邮件', '群发', '通讯', '发邮件', 'newsletter'] },
    { href: '/zh/staff/content-visibility', label: '文章显示范围', role: 'ops', words: ['内容显示范围', '显示范围', '文章', '全文', '简介', '隐藏文章'] },
    { href: '/zh/staff/cards', label: '内容审核', role: 'ops', words: ['审核', '名片', '电子名片', '客户照片', '下架'] },
    // 1.5.0 新页面（名字东哥 11/14 已点头）：群发、内容管理（举报 + 主页审核 + 机器拦下的内容）、商会风采
    { href: '/zh/staff/broadcast', label: '群发', role: 'ops', words: ['群发', '发短信', '发通知', '服务通知', '选人', '按条件选人', '常用人群', '短信', '邮件通讯', '发邮件', '退订', '打开率'] },
    { href: '/zh/staff/content', label: '内容管理', role: 'ops', words: ['内容管理', '举报', '投诉', '违规', '恢复', '禁止', '个人主页', '主页审核', '项目', '案例', '机器拦下', '组局'] },
    // 1.7.0：主办方出海报能选的模板底图；「传自己的海报」开关也在这页
    { href: '/zh/staff/poster-templates', label: '海报模板', role: 'ops', words: ['海报', '海报模板', '模板', '模板库', '底图', '节日海报', '传自己的海报', '上传海报', 'AI 生成'] },
    { href: '/zh/staff/showcase', label: '商会风采', role: 'ops', words: ['商会风采', '风采', '副会长单位', '合作方', '战略合作方', '标志', 'logo'] },
    { href: '/zh/staff/agent', label: 'AI 助手', role: 'ops', words: ['AI', '人工智能', '机器人', '常见问题', 'FAQ', '对话'] }
  ],
  数据: [
    { href: '/zh/staff/data', label: '数据', role: 'ops', words: ['统计', '增长', '点击统计', '推荐排行', '流程数据', '功能排行', '到场率', '转化', '排行', '功能月报', '操作记录', '新人名单', '谁来过', '访问的都是谁', '到场名单', '入会名单', '只打开过', '导出名单'] }
  ],
  设置与团队: [
    { href: '/zh/staff/settings', label: '设置', role: '', words: ['价格', '折扣', 'Zelle', '商家优惠', '商会微信', '微信二维码', '换二维码', '邮件额度', '企业微信', '视频号', '专委会', '邀请提醒', '带朋友', '名片模板', '贴图话题', '服务号', '首页与邀请', '关着的功能', '绑定码', '我的绑定码', '手机工作台', '增长与设置'] },
    { href: '/zh/staff/team', label: '团队', role: 'admin', words: ['工作人员', '同事', '权限', '绑定', '工作台', '出码', '加人', '角色'] },
    // 子任务 C（第二部分 五）：每人选收哪几类通知、走哪个渠道；通知总闸、发送记录
    { href: '/zh/staff/notify', label: '手机通知', role: 'ops|checkin|finance', words: ['通知', '手机通知', '短信通知', '企业微信', '每日汇总', '通知渠道', '通知设置', '总闸', '发送记录'] },
    { href: '/zh/staff/system', label: '系统状态', role: 'ops', words: ['线上巡检', '巡检', '线上报错', '报错', '错误', 'bug', '出错'] },
    // 指令 31：体验版小程序真机计时（只在测试站有数据）
    { href: '/zh/staff/system/speed', label: '真机速度', role: 'ops', words: ['速度', '打开慢', '卡', '真机', '计时', '性能', '慢请求', '机型'] }
  ]
};

export const NAV_ITEMS: NavItem[] = NAV_TABS.flatMap((tab) => NAV[tab].map((e) => ({ ...e, tab, group: tab })));

/** 顶栏每一栏点下去打开哪一页：登录者能进的第一页 */
export function tabHref(tab: NavTab, items: NavItem[]): string | null {
  return items.find((it) => it.tab === tab)?.href ?? null;
}

/** 别的分支里才有、还没合进来的页面（打开是 404；scripts/check-staff-redirects.ts 跳过）。B/C/D 已合进 feat/admin-optimize，现在没有 */
export const PENDING_MERGE: string[] = [];

/** 旧网址 → 新位置（东哥邮件里的旧链接也能打开）；next.config.js 读同一份 JSON */
export const OLD_URLS: { from: string; to: string; was: string }[] = STAFF_REDIRECTS;

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

/** 当前路径在哪一栏 */
export function activeTab(pathname: string): NavTab | null {
  const h = activeHref(pathname);
  return h ? NAV_ITEMS.find((it) => it.href === h)?.tab ?? null : null;
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
