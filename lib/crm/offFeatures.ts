/**
 * 后台综合优化 11/21（十.2）：「设置与团队」最上面列出“现在关着的功能”。
 * 只列出、每项一句话说开了会怎样、在哪改；不在这里替东哥打开任何东西。
 * 只读 crm_settings 和环境是否配置（不读、不返回任何密钥）。
 */
import { getPool } from '@/lib/db/client';
import { getSetting } from './orders';
import { wecomConfigured } from '@/lib/wecom';

export type OffFeature = { key: string; name: string; now: string; ifOn: string; where: string; whereHref: string; admin: boolean };

export async function offFeatures(): Promise<OffFeature[]> {
  const db = getPool();
  const g = <T,>(k: string, f: T) => getSetting<T>(db, k, f);
  const out: OffFeature[] = [];
  const add = (on: boolean, f: OffFeature) => { if (!on) out.push(f); };

  // 真发通知总闸（子任务 C 加的 notify_live；没设过 = 关）
  const live = await g<unknown>('notify_live', false);
  add(live === true || live === 'true', {
    key: 'notify_live', name: '真发通知（总闸）', now: '关着：系统只记下“本该发什么、发给谁”，一条都不真发',
    ifOn: '打开后，给申请人发缴费链接、给工作人员发短信 / 企业微信 / 邮件、每日汇总都会真的发出去', where: '要东哥点头后才打开（由开发按东哥的话打开）', whereHref: '', admin: true
  });
  add((await g('confirm_timeline_enabled', false)) === true, {
    key: 'confirm_timeline', name: '出席确认时间线', now: '关着：一条确认消息都不发、一个人都不自动转',
    ifOn: '打开后，活动前按设定时间请报名的人确认出席；没确认的名额按候补顺序递补', where: '设置 › 活动 › 活动确认时间线', whereHref: '/zh/staff/settings#timeline', admin: true
  });
  add((await g('patrol_email_enabled', false)) === true, {
    key: 'patrol_email', name: '巡检邮件', now: '关着：线上巡检照常每天跑，结果只在「系统状态」里看',
    ifOn: '打开后，线上巡检发现问题会发邮件给东哥本人（同一组问题一天只发一次）', where: '设置与团队 › 系统状态', whereHref: '/zh/staff/system', admin: true
  });
  const wecomOn = wecomConfigured() && (await g<unknown>('wecom_enabled', true)) !== false;
  add(wecomOn, {
    key: 'wecom', name: '企业微信“联系我”码', now: wecomConfigured() ? '关着：显示个人微信二维码' : '还没配好企业微信：显示个人微信二维码',
    ifOn: '打开后，小程序和网站里所有“加商会微信”的码换成企业微信码，加好友后自动关联到会员档案', where: '设置 › 小程序与微信 › 企业微信', whereHref: '/zh/staff/settings#wecom', admin: false
  });
  add((await g('member_prices_published', false)) === true, {
    key: 'member_prices', name: '会员价公布', now: '没公布：页面显示“会员价即将公布”，按标准价收费',
    ifOn: '公布后，会议室、电子屏、月卡按会员等级折扣收费，页面显示会员价', where: '设置 › 收款与价格', whereHref: '/zh/staff/settings#member-prices', admin: true
  });
  add((await g('zelle_enabled', false)) === true, {
    key: 'zelle', name: 'Zelle 付款', now: '关着：付款页只显示银行卡',
    ifOn: '打开后，付款页显示 Zelle 收款信息，会员可以提交 Zelle 付款说明，进「核款」核对', where: '设置 › 收款与价格', whereHref: '/zh/staff/settings#zelle', admin: true
  });
  add((await g('card_tpl_batches', 1)) === 2, {
    key: 'card_tpl', name: '电子名片第二批模板', now: '只开放第一批 39 款',
    ifOn: '开放后，会员在“我的名片”里能选全部 105 款', where: '设置 › 小程序与微信 › 名片模板库', whereHref: '/zh/staff/settings#card-tpl', admin: false
  });
  add(!!String((await g('channels_finder_id', '')) ?? '').trim(), {
    key: 'channels', name: '视频号入口', now: '没填视频号：小程序不显示视频号入口',
    ifOn: '填上视频号后，小程序显示视频号入口（视频号要先和小程序关联，否则点了打不开）', where: '设置 › 小程序与微信 › 视频号', whereHref: '/zh/staff/settings#channels', admin: false
  });
  add(!!String((await g('photo_topic', '')) ?? '').trim(), {
    key: 'photo_topic', name: '发到微信贴图话题', now: '没填话题：照片分享页不显示这个入口',
    ifOn: '填上话题后，照片分享页出现“发到微信贴图话题”', where: '设置 › 小程序与微信 › 贴图话题、服务号', whereHref: '/zh/staff/settings#topic', admin: false
  });
  add(!!String((await g('oa_username', '')) ?? '').trim(), {
    key: 'oa', name: '去服务号主页的入口', now: '没填服务号：关注组件不显示时，也不显示替代入口',
    ifOn: '填上服务号后，签到成功页、相册页在关注组件不显示时改显示去服务号主页的入口', where: '设置 › 小程序与微信 › 贴图话题、服务号', whereHref: '/zh/staff/settings#topic', admin: false
  });
  const prompts = await g<Record<string, boolean> | null>('invite_prompts', null);
  add(!prompts || prompts.enabled !== false, {
    key: 'invite_prompts', name: '邀请提醒', now: '总开关关着：三处邀请提醒都不出',
    ifOn: '打开后，报名成功页、保存合影时、看下一场活动时各轻提示一次“带朋友来”', where: '设置 › 活动 › 邀请提醒', whereHref: '/zh/staff/settings#invite-prompts', admin: false
  });
  add(Number(await g<unknown>('companions_max', 2)) !== 0, {
    key: 'companions', name: '带一位朋友', now: '关着（每份报名最多带 0 位）',
    ifOn: '打开后，报名时可以顺手替朋友报名', where: '设置 › 活动 › 带一位朋友', whereHref: '/zh/staff/settings#companions', admin: false
  });
  const find = await g<unknown>('jobs_find_on', true);
  add(find === true || find === 'true', {
    key: 'jobs_find', name: '「找工人 / 施工队」栏目', now: '关着：小程序和网站不显示',
    ifOn: '打开后，大家能发活儿、找接活的人', where: '客户 › 找工人 · 接活儿 › 开关', whereHref: '/zh/staff/jobs/switches', admin: false
  });
  const work = await g<unknown>('jobs_work_on', true);
  add(work === true || work === 'true', {
    key: 'jobs_work', name: '「我要接活儿」栏目', now: '关着：小程序和网站不显示',
    ifOn: '打开后，师傅能登记接活、上列表', where: '客户 › 找工人 · 接活儿 › 开关', whereHref: '/zh/staff/jobs/switches', admin: false
  });
  return out;
}
