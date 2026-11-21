/**
 * 联系按钮（第二部分 四.4、七.4）：「待跟进」「今天」、客户档案、入会申请、专委会意向……全站同一套。
 * 打电话、发短信（带草稿）、发邮件（带草稿，只打开邮件程序，系统不自动发）、复制微信号、复制手机号加微信。
 * 纯函数，服务器（lib/crm/followupKit.ts）和页面（components/crm/staff/TodayActions.tsx 的 ContactButtons）共用。
 */
import type { TodayAction } from './types';

export type ContactInfo = {
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  /** 短信草稿 */
  smsDraft?: string | null;
  emailSubject?: string | null;
  /** 邮件草稿（不给就用短信草稿） */
  emailDraft?: string | null;
};

export const DEFAULT_EMAIL_SUBJECT = 'SAREC 中美房地产商会';

export function buildContactActions(c: ContactInfo): TodayAction[] {
  const a: TodayAction[] = [];
  if (c.phone) {
    a.push({ type: 'tel', label: '打电话', phone: c.phone });
    a.push({ type: 'sms', label: '发短信', phone: c.phone, body: c.smsDraft ?? '' });
  }
  if (c.email) a.push({ type: 'mailto', label: '发邮件', email: c.email, subject: c.emailSubject || DEFAULT_EMAIL_SUBJECT, body: c.emailDraft ?? c.smsDraft ?? '' });
  if (c.wechat) a.push({ type: 'copy', label: `复制微信号 ${c.wechat}`, text: c.wechat, toast: `已复制微信号 ${c.wechat}，打开微信「添加朋友」粘贴搜索` });
  if (c.phone) a.push({ type: 'copy', label: '复制手机号加微信', text: c.phone, toast: `已复制手机号 ${c.phone}，打开微信「添加朋友」粘贴搜索` });
  return a;
}
