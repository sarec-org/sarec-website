import type { Metadata } from 'next';
import { AdminMembershipClient } from '@/components/admin/AdminMembershipClient';

// 内部工具页：不收录、不缓存。操作全部经 token 保护的 /api/admin/membership。
export const metadata: Metadata = {
  title: 'SAREC Admin — Membership',
  robots: { index: false, follow: false }
};

export const dynamic = 'force-dynamic';

export default function AdminMembershipPage() {
  return <AdminMembershipClient />;
}
