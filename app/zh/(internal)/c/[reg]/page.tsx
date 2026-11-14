/**
 * 个人签到码的公开中转页（1.3.5 第 1 条 / 1.4.0）。
 * - 已登录、有签到权限的工作人员打开 → 直接跳到签到台并定位到这条报名（和以前一样）。
 * - 其他任何人（本人、朋友、没登录的工作人员）→ 一页大白话说明 + 活动名称、时间、地点。
 *   不出现“工作人员后台”“登录”字样（交互总则第 9 条）。
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { REG_UUID, isCheckinStaff, loadCodeEvent } from '@/lib/crm/checkinCode';
import { CheckinCodeNote } from '@/components/crm/CheckinCodeNote';

export const metadata: Metadata = { title: '我的签到码｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: { reg: string } }) {
  if (REG_UUID.test(params.reg) && (await isCheckinStaff())) redirect(`/zh/staff/checkin?reg=${params.reg}`);
  return <CheckinCodeNote ev={await loadCodeEvent(params.reg)} />;
}
