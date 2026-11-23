'use client';
/**
 * 操作记录（后台综合优化 11/21，九.4）：每行写清“谁、对谁、做了什么”。
 * - 不写“其他操作”：认不出的动作按对象写成“改了某某”。
 * - 不显示微信内部编号：服务器已把做事的人换成工作人员名字、对象换成名字（lib/crm/team.ts teamLog），这里不显示任何编号。
 * - 手机上每条一张小卡片，不用左右滑。
 */
import { fmtDateTime } from '@/components/crm/client';

export type LogRow = {
  created_at: string;
  actor: string;
  action: string;
  target_type: string;
  target_name: string | null;
  setting_key?: string | null;
  reason: string | null;
  before_value: unknown;
  after_value: unknown;
};

const ROLE: Record<string, string> = { admin: '管理员', ops: '运营', checkin: '签到员', finance: '财务' };

/** 动作 → 人话（动词短语） */
const ACTION: Record<string, string> = {
  capacity_change: '改了名额', staff_admit: '现场放人进场', noshow_exempt: '解除爽约候补', confirm_timeline: '开关确认时间线', backfill_attendance: '补登记到场',
  merge_contacts: '合并档案', undo_merge_contacts: '撤销合并档案', team_add: '加了工作人员', team_update: '改了权限', team_disable: '停用工作人员', team_bind_code: '生成工作台绑定码',
  join_link_sent: '发了入会缴费链接', join_status: '改了入会申请状态', home_slide: '设置首页轮播', home_slide_remove: '撤掉首页轮播设置', contact_region: '改了客户地区', checkin_questions_update: '改了签到题库',
  staff_checkin: '代签到', onsite_register: '现场登记', newsletter_confirm: '确认群发邮件通讯', create_event: '新建活动', update_event: '修改活动',
  regenerate_checkin_code: '重置签到码', upsert_staff: '改了网站后台登录（按邮箱）', update_setting: '改了设置', upsert_room: '改了会议室', update_room_info: '改了会议室说明',
  upsert_offer: '改了商家优惠', delete_offer: '删除商家优惠', staff_create_booking: '登记会议室预约', cancel_booking: '取消会议室预约', record_booking_payment: '登记会议室收款',
  set_display: '改了官网展示', schedule_screen_ad: '安排电子屏广告', approve_screen_ad: '通过电子屏广告', reject_screen_ad: '退回电子屏广告',
  adjust_points: '调整积分', reverse_points: '撤销积分', export_contacts: '导出客户名单', export_data_people: '导出「数据」页名单', event_cover: '换了活动封面', poster_official_on: '设为官方海报', poster_official_off: '取消官方海报',
  verify_payment: '确认到账', cancel_order: '取消订单', activate_membership: '开通会籍', merge_needed: '发现需要人工合并的档案', contact_merged: '自动合并档案',
  wechat_identity_linked: '把微信登录挂到已有档案', guest_checkin_name: '网页签到（姓名没写进档案）',
  card_approve: '名片审核通过', card_hide: '下架名片', card_restore: '恢复名片', card_clear_avatar: '清掉名片头像', card_return: '退回名片', card_delete: '删除名片',
  jobs_switch: '改了找工人 · 接活儿开关', jobs_city_save: '改了城市', jobs_city_add: '加了城市', jobs_city_disable: '停用城市', jobs_city_delete: '删除城市',
  jobs_trade_save: '改了工种', jobs_trade_delete: '删除工种', jobs_home_entries: '改了找工人首页入口',
  jobs_pro_approve: '核验通过接活人', jobs_pro_return: '退回接活人', jobs_pro_remove: '下架接活人', jobs_pro_check: '查了接活人牌照',
  jobs_post_remove: '下架活儿', jobs_post_note: '给活儿写备注', jobs_invite: '发邀请登记接活'
};

/** 对象类型 → 名词（认不出动作时用“改了 + 名词”） */
const NOUN: Record<string, string> = {
  contact: '客户档案', contacts: '一批客户', staff: '工作人员', event: '活动', newsletter: '邮件通讯', setting: '设置', join_request: '入会申请', application: '入会记录',
  data: '「数据」页名单', order: '订单', room: '会议室', offer: '商家优惠', home_slide: '首页轮播', jobs_pro: '接活人', jobs_post: '活儿', jobs_trade: '工种', jobs_city: '城市', jobs_home_entries: '找工人首页入口'
};

/** 设置项 → 名字（对象是设置时显示） */
const SETTING: Record<string, string> = {
  zelle_enabled: 'Zelle 付款', member_prices_published: '会员价公布', room_discount: '会议室折扣', screen_fee_cents: '电子屏月费', points_per_dollar: '积分比例', room_pass_cents: '月卡价',
  resend_monthly_quota: '每月发信额度', resend_daily_quota: '每天发信额度', confirm_timeline_enabled: '确认时间线', wechat_qr_url: '商会微信二维码', channels_finder_id: '视频号',
  committees: '专委会状态', content_visibility: '文章显示范围', photo_topic: '贴图话题', oa_username: '服务号', companions_max: '带朋友人数', invite_prompts: '邀请提醒',
  wecom_userids: '企业微信接待人', wecom_enabled: '企业微信码开关', home_recap_days: '首页回顾天数', invite_card_text: '邀请卡文案', card_tpl_batches: '名片模板批次',
  checkin_questions: '签到题库', jobs_find_on: '「找工人」栏目', jobs_work_on: '「我要接活儿」栏目', jobs_work_fee_mode: '接活儿收费方式', jobs_free_contacts: '免费看电话次数', jobs_free_posts: '免费发活儿条数',
  patrol_email_enabled: '巡检邮件', notify_live: '真发通知总闸'
};

const roleText = (r?: unknown) => (Array.isArray(r) ? r : []).map((x) => ROLE[String(x)] ?? String(x)).join('、');

function who(actor: string) {
  if (actor === 'system' || actor.startsWith('system:')) return actor === 'system:stripe' ? '系统（银行卡到账）' : actor === 'system:zelle' ? '系统（Zelle）' : '系统自动';
  return actor || '一位工作人员';
}
function what(l: LogRow) {
  if (ACTION[l.action]) return ACTION[l.action];
  const noun = NOUN[l.target_type];
  return noun ? `改了${noun}` : '做了改动';
}
function whom(l: LogRow) {
  if (l.target_type === 'setting' && l.setting_key) return SETTING[l.setting_key] ?? '一项设置';
  if (l.target_name) return l.target_name;
  if (l.target_type === 'contact' || l.target_type === 'application' || l.target_type === 'order') return '一位没登记姓名的客户';
  if (l.target_type === 'contacts') return '一批客户';
  return NOUN[l.target_type] ? `（${NOUN[l.target_type]}）` : '';
}
function detail(l: LogRow) {
  const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
  const b = obj(l.before_value);
  const a = obj(l.after_value);
  if (l.action === 'team_update' || l.action === 'team_disable') {
    const parts = [] as string[];
    if (a.roles && roleText(b.roles) !== roleText(a.roles)) parts.push(`${roleText(b.roles)} → ${roleText(a.roles)}`);
    if (a.active === false) parts.push('停用');
    if (a.active === true && b.is_active === false) parts.push('恢复');
    return parts.join('；');
  }
  if (l.action === 'export_data_people') {
    const LIST: Record<string, string> = { new: '新人', shells: '只打开过没登记', arrived: '到场', joined: '入会', bringer: '功能 / 渠道带来的人', visitors: '这段时间谁来过' };
    return `${LIST[String(a.list ?? '')] ?? '名单'} · 最近 ${String(a.days ?? '')} 天 · ${String(a.count ?? '')} 行`;
  }
  if (l.action === 'newsletter_confirm' && a.recipients) return `发给 ${String(a.recipients)} 人`;
  if (l.action === 'jobs_switch' || l.action === 'confirm_timeline') {
    const t = (v: unknown) => (v === true ? '开' : v === false ? '关' : v == null ? '没设' : String(v));
    if ('on' in a) return `改为${t(a.on)}`;
    if (l.before_value !== null || l.after_value !== null) return `${t(l.before_value)} → ${t(l.after_value)}`;
  }
  return l.reason ?? '';
}

export function AuditLog({ log }: { log: LogRow[] }) {
  if (!log.length) return <p className="small" style={{ opacity: 0.7 }}>还没有记录。</p>;
  return (
    <div>
      {log.map((l, i) => {
        const d = detail(l);
        const t = whom(l);
        return (
          <div key={i} style={{ padding: '0.55rem 0', borderBottom: '1px solid var(--line-2)' }}>
            <div>
              <strong>{who(l.actor)}</strong> {what(l)}
              {t ? <>：<strong>{t}</strong></> : null}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--ivory-mute)' }}>
              {fmtDateTime(l.created_at)}
              {d ? ` · ${d}` : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}
