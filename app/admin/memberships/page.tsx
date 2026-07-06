import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { verifyAdminToken, ADMIN_COOKIE } from '@/lib/admin/auth';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { MembershipOpsClient } from '@/components/admin/MembershipOpsClient';

// 内部运营工作台：不收录、不缓存。cookie session(httpOnly)保护;所有写操作经 token 校验。
export const metadata: Metadata = {
  title: 'SAREC Admin — Membership Operations',
  robots: { index: false, follow: false }
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default function MembershipOpsPage() {
  // 服务端读 httpOnly cookie 决定初始渲染;token 不下发到前端。
  const token = cookies().get(ADMIN_COOKIE)?.value;
  const authed = verifyAdminToken(token);
  return authed ? <MembershipOpsClient /> : <AdminLogin />;
}
