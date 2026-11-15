/**
 * 签到台。1.4.0：旧的个人签到码装的就是这个网址（/zh/staff/checkin?reg=…），已经发出去的码不能失效——
 * 没登录（或不是签到工作人员）的人带着 reg 打开时，转到公开说明页 /zh/c/<编号>——那一页不在后台框架里，
 * 顶上不会出现“SAREC 工作人员后台”“返回官网”，网页标题也不是后台（东哥 11/14）。
 */
import { redirect } from 'next/navigation';
import { isCheckinStaff } from '@/lib/crm/checkinCode';
import StaffCheckin from './StaffCheckinClient';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: { reg?: string; staff?: string } }) {
  const reg = searchParams.reg ?? '';
  // staff=1：工作人员点了“我是工作人员 → 登录后台”——显示签到台（没登录时出登录框），登录后页面读网址里的 reg，直接定位到这条报名
  if (reg && searchParams.staff !== '1' && !(await isCheckinStaff())) redirect(`/zh/c/${encodeURIComponent(reg)}`);
  return <StaffCheckin />;
}
