/** GET /api/v1/meta —— 角色分类、常用角色、活动主题（小程序与网站共用） */
import { QUICK_ROLES, ROLE_CATEGORIES, TOPIC_LABELS, findRoleSub } from '@/lib/crm/questionBank';
import { smsConfigured } from '@/lib/crm/auth';
import { handler, ok, optionalContact } from '@/lib/crm/http';
import { wechatQrFor } from '@/lib/wecom';
import { twilioVerifyConfigured } from '@/lib/crm/contactInfo';
import { publicTemplateIds } from '@/lib/crm/reminders';
import { getPool } from '@/lib/db/client';
import { getSetting } from '@/lib/crm/orders';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const pool = getPool();
  const placement = new URL(req.url).searchParams.get('p');
  const qr = await wechatQrFor(placement, placement ? await optionalContact(req) : null);
  return ok({
    roleCategories: ROLE_CATEGORIES.map((c) => ({ key: c.key, label: c.label, subs: c.subs.map((s) => ({ key: s.key, label: s.label })) })),
    quickRoles: QUICK_ROLES.map((k) => ({ key: k, label: findRoleSub(k)!.label })),
    topics: TOPIC_LABELS,
    smsAvailable: smsConfigured(),
    phoneVerifyAvailable: twilioVerifyConfigured(),
    /** 活动提醒订阅消息模板 ID（未申请时为 null，小程序不弹授权） */
    subscribeTemplates: publicTemplateIds(),
    /** 1.2：商会微信二维码（后台可换图）、视频号 ID（没配置则小程序隐藏入口） */
    // 1.3 O：企业微信“联系我”码（按入口 / 按人）；企业微信不可用时是后台上传的个人微信二维码
    wechatQr: qr?.url ?? null,
    wechatQrKind: qr?.kind ?? null,
    channelsId: (await getSetting<string>(pool, 'channels_finder_id', '')) || null,
    /** 1.3：贴图话题名（没配置 = 隐藏“发到贴图话题”）、服务号原始 ID（关注服务号组件不显示时的替代入口）、邀请提醒开关 */
    photoTopic: (await getSetting<string>(pool, 'photo_topic', '')) || null,
    oaUsername: (await getSetting<string>(pool, 'oa_username', '')) || null,
    /** 1.3 H：一键填入微信手机号（后台开了、并在公众平台开通付费后才显示） */
    phoneQuick: !!(await getSetting<boolean>(pool, 'phone_quick', false)),
    invitePrompts: await getSetting<Record<string, unknown>>(pool, 'invite_prompts', { enabled: true, afterRegister: true, afterPhoto: true, nextEvent: true })
  });
});
