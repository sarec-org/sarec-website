'use client';
/** D12：网站顶部菜单 / 首页的「找工人·接活儿」入口跟着开关走（两个都关不出）。整页只请求一次。 */
import { useEffect, useState } from 'react';

export const JOBS_ENTRY = { label: '找工人·接活儿', href: '/zh/jobs' } as const;

let cached: Promise<boolean> | null = null;
function load(): Promise<boolean> {
  if (!cached) {
    cached = fetch('/api/v1/jobs/entry')
      .then((r) => (r.ok ? r.json() : { show: false }))
      .then((j: { show?: boolean }) => j.show === true)
      .catch(() => false);
  }
  return cached;
}

export function useJobsEntry(): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let alive = true;
    load().then((v) => alive && setShow(v));
    return () => { alive = false; };
  }, []);
  return show;
}
