'use client';
/**
 * D12：网站顶部菜单里加的一项「找工人·接活儿」→ /zh/jobs（跟开关走：两个都关不出）。
 * 只追加在已有菜单项后面，样式用所在菜单已有的 class，不改已有项。
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { JOBS_ENTRY, useJobsEntry } from './useJobsEntry';

export function JobsMenuItem({ liClassName, linkClassName, activeClassName, rowClassName, onClick }: {
  liClassName?: string; linkClassName?: string; activeClassName?: string; rowClassName?: string; onClick?: () => void;
}) {
  const show = useJobsEntry();
  const pathname = usePathname();
  if (!show) return null;
  const active = typeof pathname === 'string' && (pathname === JOBS_ENTRY.href || pathname.startsWith(`${JOBS_ENTRY.href}/`));
  const link = (
    <Link href={JOBS_ENTRY.href} onClick={onClick} className={[linkClassName, active ? activeClassName : ''].filter(Boolean).join(' ') || undefined}>
      {JOBS_ENTRY.label}
    </Link>
  );
  return <li className={liClassName}>{rowClassName ? <div className={rowClassName}>{link}</div> : link}</li>;
}
