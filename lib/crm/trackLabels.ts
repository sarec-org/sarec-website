/**
 * 打点名 / 来源代号 → 小程序里的叫法（后台「数据」页共用；页面上一律不出现英文代号）。
 * 指令 44：名单里“从哪来的”“主要看了什么”也用这里的叫法；查不到叫法的归到“其他点击”“其他来源”，不编。
 */

/** 打点名 → 叫法 */
export const TRACK_LABEL: Record<string, string> = {
  home_entry: '点首页入口', share: '分享给朋友 / 群', share_timeline: '分享到朋友圈', poster: '生成邀请海报', poster_save: '保存邀请海报', card_open: '打开电子名片', card_share: '分享电子名片',
  visit: '从分享 / 渠道码进来', status_action: '点状态卡上的按钮', wechat_qr: '看商会微信', channels: '点视频号', album_open: '打开活动相册', agent_open: '打开 AI 助手',
  companion_add: '带一位朋友', group_signup: '群报名', photo_upload: '上传我拍的照片', beauty_apply: '用美颜', photo_share: '分享照片', jobs_trade: '点找工人的工种'
};

/** 名单里“主要看了什么”用的短叫法（比 TRACK_LABEL 多认几种；认不出的不显示代号） */
const SHORT: Record<string, string> = {
  ...TRACK_LABEL,
  card_share_image: '分享名片图片', invite_card: '邀请卡', calc_open: '计算器', calc_image: '计算结果存图', toolinfo: '工具', glossary: '术语解释', doc: '资料',
  rooms_contact: '会议室咨询', companion_open: '带朋友', jobs_contact: '找工人 · 联系师傅', jobs_home: '找工人 / 接活儿', jobs_home_entry: '找工人 / 接活儿',
  jobs_home_work_entry: '我要接活儿', jobs_reg_role: '登记接活儿', jobs_reg_from_trade: '登记接活儿', jobs_reg_submit: '登记接活儿'
};

export const HOME_ENTRY_LABEL: Record<string, string> = { events: '活动报名', mine: '我的报名', checkin: '现场签到', invite: '邀请好友', card: '我的名片', benefits: '会员权益', rooms: '会议室', contact: '联系商会' };

/** 一条打点 → 短叫法（首页入口带上入口名） */
export function trackShort(name: string, target?: string | null): string {
  if (name === 'home_entry' && target && HOME_ENTRY_LABEL[target]) return `首页 · ${HOME_ENTRY_LABEL[target]}`;
  if (SHORT[name]) return SHORT[name];
  if (name.startsWith('jobs_')) return '找工人 / 接活儿';
  return '其他点击';
}

/** 报名 / 访问上的来源代号 → 叫法（c-xxxx 渠道码另查渠道名） */
export const CHANNEL_SOURCE_LABEL: Record<string, string> = {
  poster: '邀请海报', card: '电子名片', share: '分享卡片（聊天 / 群）', timeline: '朋友圈', group: '群报名', album: '活动相册', photo: '照片分享',
  companion: '朋友带来（同行人）', invite_card: '邀请卡', web: '网站', email: '邮件', onsite: '现场'
};

/** 建档方式（contacts.acquisition_source）→ 叫法 */
export const ACQ_LABEL: Record<string, string> = {
  miniprogram: '小程序（没记到从哪来）', web: '网站', website: '网站', membership_application: '网站入会申请', membership_import: '会员名单导入', onsite_staff: '现场工作人员登记',
  staff_backfill: '工作人员补登记', companion: '朋友带来（同行人）', jobs_proxy: '找工人 · 代登记', staff_room_booking: '会议室预约登记', import: '导入', registration: '活动报名', referral: '朋友推荐', join: '入会申请', checkin: '现场签到'
};
