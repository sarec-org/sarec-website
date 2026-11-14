import { redirect } from 'next/navigation';

/** 1.5.0：「举报」「主页审核」已并进「内容管理」（东哥 11/14 定）。旧网址转过去。 */
export default function Page() {
  redirect('/zh/staff/content');
}
