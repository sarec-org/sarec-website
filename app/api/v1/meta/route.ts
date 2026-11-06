/** GET /api/v1/meta —— 角色分类、常用角色、活动主题（小程序与网站共用） */
import { QUICK_ROLES, ROLE_CATEGORIES, TOPIC_LABELS, findRoleSub } from '@/lib/crm/questionBank';
import { smsConfigured } from '@/lib/crm/auth';
import { handler, ok } from '@/lib/crm/http';
import { twilioVerifyConfigured } from '@/lib/crm/contactInfo';
import { publicTemplateIds } from '@/lib/crm/reminders';
import { getPool } from '@/lib/db/client';
import { getSetting } from '@/lib/crm/orders';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async () => {
  const pool = getPool();
  return ok({
    roleCategories: ROLE_CATEGORIES.map((c) => ({ key: c.key, label: c.label, subs: c.subs.map((s) => ({ key: s.key, label: s.label })) })),
    quickRoles: QUICK_ROLES.map((k) => ({ key: k, label: findRoleSub(k)!.label })),
    topics: TOPIC_LABELS,
    smsAvailable: smsConfigured(),
    phoneVerifyAvailable: twilioVerifyConfigured(),
    /** 活动提醒订阅消息模板 ID（未申请时为 null，小程序不弹授权） */
    subscribeTemplates: publicTemplateIds(),
    /** 1.2：商会微信二维码（后台可换图）、视频号 ID（没配置则小程序隐藏入口） */
    wechatQr: (await getSetting<string>(pool, 'wechat_qr_url', '')) || null,
    channelsId: (await getSetting<string>(pool, 'channels_finder_id', '')) || null
  });
});
