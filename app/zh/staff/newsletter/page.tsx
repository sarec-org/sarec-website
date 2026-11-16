import { redirect } from 'next/navigation';

/** 东哥 11/14 定：「邮件通讯」并进「群发」，作为其中的邮件渠道。旧网址跳到群发页的邮件通讯部分；各期详情页 /zh/staff/newsletter/<编号> 照旧。 */
export default function Page() {
  redirect('/zh/staff/broadcast#newsletter');
}
