/**
 * 签到台。1.4.0：旧的个人签到码装的就是这个网址（/zh/staff/checkin?reg=…），已经发出去的码不能失效——
 * 没登录（或不是签到工作人员）的人带着 reg 打开时，显示和 /zh/c/<编号> 一样的大白话说明，不再出现后台登录页。
 */
import { CheckinCodeNote } from '@/components/crm/CheckinCodeNote';
import { REG_UUID, isCheckinStaff, loadCodeEvent } from '@/lib/crm/checkinCode';
import StaffCheckin from './StaffCheckinClient';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: { reg?: string; staff?: string } }) {
  const reg = searchParams.reg ?? '';
  // staff=1：工作人员点了“我是工作人员 → 登录后台”——显示签到台（没登录时出登录框），登录后页面读网址里的 reg，直接定位到这条报名
  if (reg && searchParams.staff !== '1' && !(await isCheckinStaff())) return <CheckinCodeNote ev={REG_UUID.test(reg) ? await loadCodeEvent(reg) : null} reg={REG_UUID.test(reg) ? reg : undefined} />;
  return <StaffCheckin />;
}
