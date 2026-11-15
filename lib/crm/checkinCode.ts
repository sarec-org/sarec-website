/** 个人签到码（1.4.0）：码里装公开中转网址 /zh/c/<报名编号>，任何人扫到都看到对他有用的页面。 */
import QRCode from 'qrcode';
import { cookies } from 'next/headers';
import { getPool } from '@/lib/db/client';
import { SESSION_COOKIE, sessionContact, staffCan, staffFor } from './auth';

export const REG_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CodeEvent = {
  slug: string;
  title: string;
  starts_at: Date;
  timezone: string | null;
  location_name: string | null;
  address: string | null;
  status: string;
};

/** 个人签到码图片（data URL）：内容是公开中转网址，不再是后台签到台网址 */
export async function personalCheckinQr(base: string, registrationId: string): Promise<string> {
  return QRCode.toDataURL(`${base.replace(/\/$/, '')}/zh/c/${registrationId}`, { margin: 1, width: 360, color: { dark: '#06111E', light: '#FFFFFF' } });
}

export async function loadCodeEvent(reg: string): Promise<CodeEvent | null> {
  if (!REG_UUID.test(reg)) return null;
  const { rows } = await getPool().query<CodeEvent>(
    `SELECT e.slug, e.title, e.starts_at, e.timezone, e.location_name, e.address, r.status
       FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.id = $1`,
    [reg]
  );
  return rows[0] ?? null;
}

/** 当前浏览器是不是已登录、有签到权限的工作人员（服务器页面用，读 cookie） */
export async function isCheckinStaff(): Promise<boolean> {
  const contact = await sessionContact(cookies().get(SESSION_COOKIE)?.value ?? null);
  if (!contact) return false;
  return staffCan(await staffFor(contact), 'checkin');
}
