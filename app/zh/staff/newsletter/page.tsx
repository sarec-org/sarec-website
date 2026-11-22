'use client';
/**
 * 邮件通讯：各期列表（送达 / 打开 / 点击 / 退订）、发信额度、新建一期。
 * 后台综合优化（11/21）把它放在「内容 › 邮件通讯」；1.5.0（东哥 11/14）又把同一块放进「群发」页下面一节。
 * 两处都能用（同一个组件 NewsletterIssues、同一份数据），这里是原来的地址，不再跳走。
 */
import { StaffGate } from '@/components/crm/staff/StaffGate';
import { NewsletterIssues } from '@/components/crm/staff/NewsletterIssues';

export default function NewsletterList() {
  return (
    <StaffGate title="邮件通讯" role="ops" wide>
      {() => <NewsletterIssues />}
    </StaffGate>
  );
}
