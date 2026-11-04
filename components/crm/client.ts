'use client';
/**
 * 浏览器端小工具：调用 /api/v1、草稿保存（网络失败已填内容不丢）、复制。
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string; status: number };

export async function api<T = Record<string, unknown>>(
  path: string,
  opts: { method?: string; body?: unknown } = {}
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
      headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: 'same-origin',
      cache: 'no-store'
    });
    const json = (await res.json().catch(() => null)) as
      | ({ ok: true } & T)
      | { ok: false; error: { code: string; message: string } }
      | null;
    if (!json) return { ok: false, code: 'bad_response', message: '系统忙，请稍后再试', status: res.status };
    if (json.ok === false) return { ok: false, code: json.error.code, message: json.error.message, status: res.status };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, code: 'network', message: '网络不稳定，没有提交成功。您填的内容还在，请稍后再点一次', status: 0 };
  }
}

/** 草稿：存在本机浏览器，刷新、断网、跳到银行 App 再回来都不丢。 */
export function useDraft<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void, () => void] {
  const [val, setVal] = useState<T>(initial);
  const loaded = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`sarec:${key}`);
      if (raw) setVal({ ...initial, ...(JSON.parse(raw) as T) });
    } catch {
      /* 无痕模式等：忽略 */
    }
    loaded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(`sarec:${key}`, JSON.stringify(val));
    } catch {
      /* ignore */
    }
  }, [key, val]);
  const clear = useCallback(() => {
    try {
      localStorage.removeItem(`sarec:${key}`);
    } catch {
      /* ignore */
    }
  }, [key]);
  return [val, setVal, clear];
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export const money = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

export function fmtDateTime(iso: string | Date, tz = 'America/Los_Angeles'): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('zh-CN', { timeZone: tz, month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}

export function fmtDate(iso: string | Date, tz = 'America/Los_Angeles'): string {
  return new Intl.DateTimeFormat('zh-CN', { timeZone: tz, year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso));
}
