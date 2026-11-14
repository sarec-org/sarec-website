'use client';
/**
 * 1.4.0：后台导航和页面共用“当前登录的工作人员是谁”。
 * 登录 / 退出后发 sarec-staff-changed 事件，导航跟着刷新（不用整页刷新）。
 */
import { useEffect, useState } from 'react';
import { api } from '@/components/crm/client';

export type Me = { staff: { name: string; email: string; roles: string[] }; admins: string[] };
export type MeState = { status: 'loading' | 'login' | 'forbidden' | 'ok'; me: Me | null; message?: string };

export const STAFF_CHANGED = 'sarec-staff-changed';

let inflight: Promise<MeState> | null = null;
export function loadMe(force = false): Promise<MeState> {
  if (!inflight || force) {
    inflight = api<Me>('/api/v1/staff/me').then((r) =>
      r.ok ? { status: 'ok', me: r.data } : r.status === 401 ? { status: 'login', me: null } : { status: 'forbidden', me: null, message: r.message }
    );
  }
  return inflight;
}

/** 登录 / 退出后调用：让导航重新读一次 */
export function notifyStaffChanged() {
  inflight = null;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(STAFF_CHANGED));
}

export function useStaffMe(): MeState {
  const [st, setSt] = useState<MeState>({ status: 'loading', me: null });
  useEffect(() => {
    let alive = true;
    const run = (force: boolean) => loadMe(force).then((x) => alive && setSt(x));
    run(false);
    const on = () => run(true);
    window.addEventListener(STAFF_CHANGED, on);
    return () => {
      alive = false;
      window.removeEventListener(STAFF_CHANGED, on);
    };
  }, []);
  return st;
}
