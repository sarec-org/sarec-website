/**
 * 签到台。1.4.0：旧的个人签到码装的就是这个网址（/zh/staff/checkin?reg=…），已经发出去的码不能失效——
 * 没登录（或不是签到工作人员）的人带着 reg 打开时，显示和 /zh/c/<编号> 一样的大白话说明，不再出现后台登录页。
 */
import { CheckinCodeNote } from '@/components/crm/CheckinCodeNote';
import { REG_UUID, isCheckinStaff, loadCodeEvent } from '@/lib/crm/checkinCode';
import StaffCheckin from './StaffCheckinClient';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: { reg?: string } }) {
  const reg = searchParams.reg ?? '';
  if (reg && !(await isCheckinStaff())) return <CheckinCodeNote ev={REG_UUID.test(reg) ? await loadCodeEvent(reg) : null} />;
  return <StaffCheckin />;
}
