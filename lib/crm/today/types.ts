/**
 * 「今天」页（后台首页 /zh/staff）的待办接口 —— 后台综合优化 第二部分 三
 * ------------------------------------------------------------------
 * 每类待办一个 provider（待办来源），返回统一结构 TodayItem[]；页面只认这个结构，不认具体业务。
 * 新加一类待办：在 lib/crm/today/providers/ 下写一个 TodayProvider，放进对应的数组：
 *   · 子任务 B 的：providers/b.ts 的 B_PROVIDERS
 *   · 子任务 C 的：providers/c.ts 的 C_PROVIDERS / C_LIVE_PROVIDERS（B 只放了空数组，C 往里加，合并时不冲突）
 * registry.ts 负责：按登录者角色过滤 → 并发调用 → 单个来源出错不影响别的（出错的那类显示一条"读不出来"）→ 排序。
 *
 * 排序（第二部分 三.2）：
 *   置顶（pinned，一.3 活动回顾待发布）→ 钱相关（待核款、入会未缴费）→ 已过期的跟进 → 新咨询 → 待审核 / 待确认 → 其他。
 *   同一档里 priority 小的在前，再按 at（越早越前）。provider 用 PRIORITY 里的档位常数加 0～99 的细分。
 *
 * 文字规矩：title / suggestion / label 全部用人话，不出现英文代号、内部 ID、模板编号。
 * 手机优先：每条 title 一句话、suggestion 一句话；actions 建议 ≤ 4 个，第一个是最该点的。
 */
import type { StaffRole } from '@/lib/crm/auth';

/** 档位：数字越小越靠前。provider 返回 priority = 档位 + 0～99 */
export const PRIORITY = {
  pinned: 0, // 置顶：活动回顾待发布（一.3）
  money: 100, // 钱：待核款、入会 3 天未缴费
  overdue: 200, // 已过期的跟进（会员跟进 / 访客跟进）
  inquiry: 300, // 新咨询（今天到期、还没过期的跟进也在这一档）
  review: 400, // 待审核、待确认：照片名片、重复档案、接活人核验、筹备到期、投诉
  other: 500 // 失败和异常等
} as const;

/**
 * 待办类型。已定的名字（C 用这些，不要另起）：
 *   B：inquiry_new 新咨询 / followup 会员和访客跟进 / payment_pending 待核款 / recap_publish 活动回顾待发布 / jobs_pro_verify 接活人待核验
 *   C：join_unpaid 入会 3 天未缴费 / prep_due 筹备清单今天到期 / media_review 照片和名片待审 / dup_confirm 拿不准的重复档案
 *      / complaint 投诉 / exception 失败和异常
 * （jobs_pro_verify 由 B 先实现；C 如果要改它的内容，直接改 providers/b.ts 里那一个，别再注册第二个同 kind 的）
 */
export type TodayKind =
  | 'inquiry_new'
  | 'followup'
  | 'payment_pending'
  | 'recap_publish'
  | 'jobs_pro_verify'
  | 'join_unpaid'
  | 'prep_due'
  | 'media_review'
  | 'dup_confirm'
  | 'complaint'
  | 'exception'
  /** 1.5.0（providers/v150.ts）：举报 / 机器拦下的内容 / 个人主页建议看一眼 */
  | 'ugc_report'
  | 'ugc_machine'
  | 'profile_review'
  /** 1.5.1（providers/b.ts）：小程序里交来的「发布活儿」，等工作人员看过再派给师傅 */
  | 'jobs_request'
  /** 指令 103（providers/slides.ts）：讲座结束 2 小时后还没挂课件 */
  | 'slides_upload';

/** 卡片上的按钮。页面按 type 渲染；所有按钮都要够大（手机上一指点中）。 */
export type TodayAction =
  /** 打开一个后台页面（处理页 / 详情） */
  | { type: 'link'; label: string; href: string; primary?: boolean }
  /** 打电话：tel: */
  | { type: 'tel'; label: string; phone: string }
  /** 发短信：sms: 链接带草稿，只打开手机短信，系统不发 */
  | { type: 'sms'; label: string; phone: string; body: string }
  /** 发邮件：mailto: 带标题和草稿，只打开邮件程序，系统不发 */
  | { type: 'mailto'; label: string; email: string; subject: string; body: string }
  /** 复制一段文字（手机号去微信加好友、微信话术……）；toast 是复制后的提示，要说清复制了什么 */
  | { type: 'copy'; label: string; text: string; toast: string }
  /**
   * 直接生效的操作：页面 POST 到 endpoint（必须是 /api/v1/staff/ 或 /api/v1/workbench/ 开头，服务器端自己再查权限），
   * 成功后整列刷新。confirm 有值时先弹一句确认（只用于不可撤销的事）；done 是成功后的提示。
   */
  | { type: 'post'; label: string; endpoint: string; body?: Record<string, unknown>; confirm?: string; done?: string; primary?: boolean; danger?: boolean };

export type TodayItem = {
  /** 全列唯一、刷新后不变，例如 'followup:<任务号>'（只用作 key，不显示） */
  id: string;
  kind: TodayKind;
  /** PRIORITY 档位 + 0～99 */
  priority: number;
  /** 一句话：这是什么。例："Rocco Xue（会员）的跟进已过期 14 天" */
  title: string;
  /** 一句话：建议怎么办。例："建议今天打个电话，草稿已按对会员的口气写好" */
  suggestion: string;
  /** 卡片上直接点的按钮，第一个是最该点的 */
  actions: TodayAction[];
  /** 点卡片标题去哪（处理这一条的页面，不是列表） */
  href: string;
  /** 小标签：'会员'、'钱'、'已过期'…… 一两个字到四五个字 */
  tags?: string[];
  /** 排同档的时间（ISO），越早越前；没有就按 priority */
  at?: string;
  /** 可选：卡片里多一段原话/摘要（≤ 200 字，页面会折叠） */
  detail?: string;
  /**
   * 可选（四.5）：卡片上点过打电话 / 短信 / 邮件 / 复制后，页面在这张卡上出"联系上了 / 没接 / 已约时间"三个按钮，
   * POST 到这个地址 { result: 'reached' | 'no_answer' | 'scheduled', date?: 'YYYY-MM-DD' }。
   */
  contactResult?: { endpoint: string };
};

export type TodayContext = {
  now: Date;
  /** 洛杉矶日期 YYYY-MM-DD */
  today: string;
  staff: { email: string; name: string; roles: StaffRole[] };
};

export type TodayProvider = {
  kind: TodayKind;
  /** 哪些角色能看到这类待办（admin 永远能看到）。例：钱的只给 finance */
  roles: StaffRole[];
  /** 这一类没东西时返回 []；出错直接抛，registry 会兜住 */
  list(ctx: TodayContext): Promise<TodayItem[]>;
};

/** 「今天现场」（三.4）：今天有活动时最上面三个大按钮：签到台、现场登记、传照片。由 C 提供 */
export type TodayLive = {
  eventId: string;
  /** 活动名，例："11/22 周六 茶叙" */
  title: string;
  /** 一般正好三个：签到台、现场登记、传照片 */
  buttons: { label: string; href: string }[];
};
export type TodayLiveProvider = {
  roles: StaffRole[];
  list(ctx: TodayContext): Promise<TodayLive[]>;
};

/** GET /api/v1/staff/today 的返回 */
export type TodayPayload = {
  today: string;
  live: TodayLive[];
  items: TodayItem[];
  /** 读不出来的待办类型（人话），页面显示一句"这几类暂时读不出来" */
  failed: string[];
  /** 三.5 昨天的四个结果（ops 才有） */
  yesterday: { visits: number; newArrived: number; joined: number; inquiries: number } | null;
  /** 指令 89-B 验收 P2-1：今天（洛杉矶）新报名的真实客户，按活动分（只给网站后台，运营 / 签到员） */
  newRegs?: { eventId: string; title: string; n: number }[];
  /** 1.5.0 体验1（第三部分 2）：登录者有没有绑定手机工作台；没绑时网站「今天」页顶上提示去绑 */
  mpBind?: { bound: boolean; boundAt: string | Date | null; bindHref: string };
};
