'use client';
/**
 * 找工人 · 接活儿（网站）共用：读 /api/v1/jobs/meta、开关拦截、统一声明（D8）、反馈/投诉、登录提示、底部固定按钮。
 * 颜色：找工人一律藏蓝（j.find），接活一律金色（j.work）。
 */
import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/components/crm/client';
import { LoginBox } from '@/components/crm/LoginBox';
import { ContactInfoCard, type ContactInfo } from '@/components/crm/ContactInfo';
import s from '@/components/crm/crm.module.css';
import j from './jobs.module.css';
import type { Meta, Side } from './types';

/** D8：所有找工人 / 接活页面底部统一一句 */
export const DISCLAIMER = '商会仅提供信息展示与转达，不参与合同与付款，不承接工程，不担保施工或服务质量；缴纳会费不保证接到活儿。';

export function Disclaimer() {
  return <p className={j.disclaimer}>{DISCLAIMER}</p>;
}

let metaCache: Promise<{ meta: Meta | null; error: string | null }> | null = null;
export function loadMeta(force = false) {
  if (!metaCache || force) {
    metaCache = api<Meta>('/api/v1/jobs/meta').then((r) => (r.ok ? { meta: r.data, error: null } : { meta: null, error: r.message }));
  }
  return metaCache;
}

export function useMeta() {
  const [st, setSt] = useState<{ meta: Meta | null; error: string | null; loading: boolean }>({ meta: null, error: null, loading: true });
  const reload = useCallback(async (force = true) => {
    const x = await loadMeta(force);
    setSt({ ...x, loading: false });
  }, []);
  useEffect(() => {
    reload(false);
  }, [reload]);
  return { ...st, reload };
}

export function tradeName(meta: Meta | null, key: string) {
  return meta?.trades.find((t) => t.key === key)?.name ?? key;
}

/** 页面外壳：开关、加载、出错都有一句话；开关关时普通人看到"还没开放"，工作人员照常用并看到一行提示 */
export function JobsShell({
  side,
  need,
  back = { href: '/zh/jobs', label: '‹ 找工人 · 接活儿' },
  eyebrow,
  title,
  children,
  footer,
  noStaffLine
}: {
  side: Side;
  need: 'find' | 'work' | 'either' | 'none';
  back?: { href: string; label: string } | null;
  eyebrow?: string;
  /** 指令 31：可以按 meta 算（登记页标题带工种名） */
  title?: ReactNode | ((meta: Meta) => ReactNode);
  children: (meta: Meta) => ReactNode;
  footer?: (meta: Meta) => ReactNode;
  /** 首页自己按栏目显示"仅工作人员可见"，不用外壳再显示一次 */
  noStaffLine?: boolean;
}) {
  const { meta, error, loading, reload } = useMeta();
  const cls = `${s.page} ${side === 'find' ? j.find : side === 'work' ? j.work : ''}`;
  if (loading) return <div className={cls}><p className={s.muted}>正在加载…</p></div>;
  if (!meta) {
    return (
      <div className={cls}>
        {back && <Link href={back.href} className={s.back}>{back.label}</Link>}
        <p className={s.error}>{error ?? '系统忙，请稍后再试'}</p>
        <button className={`${s.btn} ${s.btnQuiet}`} onClick={() => reload(true)}>再试一次</button>
        <Disclaimer />
      </div>
    );
  }
  const on = need === 'none' ? true : need === 'either' ? meta.switches.find || meta.switches.work : meta.switches[need];
  if (!on && !meta.staffPreview) {
    return (
      <div className={cls}>
        <p className={s.eyebrow}>{eyebrow ?? 'SAREC'}</p>
        <h1 className={s.h1}>这个功能还没开放</h1>
        <p className={s.lead}>开放后会在这里看到。现在可以先回首页看看别的。</p>
        <Link href="/zh" className={`${s.btn} ${s.btnBlock}`}>回首页</Link>
        <Disclaimer />
      </div>
    );
  }
  return (
    <div className={cls}>
      {back && <Link href={back.href} className={s.back}>{back.label}</Link>}
      {!on && meta.staffPreview && !noStaffLine && <p className={j.staffOnly}>仅工作人员可见：开关未开</p>}
      {eyebrow && <p className={s.eyebrow}>{eyebrow}</p>}
      {title && <h1 className={s.h1}>{typeof title === 'function' ? title(meta) : title}</h1>}
      {children(meta)}
      <Disclaimer />
      {footer?.(meta)}
    </div>
  );
}

/** 固定在屏幕底部的主按钮（拇指区），不用往下滑才看到 */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className={s.bottomBar}>
      <div className={s.bottomInner}>{children}</div>
    </div>
  );
}

/** 要登录才能做的事：同一页里登录（用网站现有的邮箱 / 手机验证码），登录完回到原来那一步 */
export function NeedLogin({ why, onDone }: { why: string; onDone: () => void }) {
  return (
    <div className={s.card}>
      <p className={s.lead} style={{ marginBottom: '0.75rem' }}>{why}</p>
      <LoginBox onDone={onDone} />
    </div>
  );
}

const REPORT_REASONS = ['资料不真实', '联系不上 / 电话不对', '态度不好或骚扰', '执照有问题', '内容违规', '其他'];

/** 每张卡片、每条活儿都有的"反馈 / 投诉"：直达工作人员 */
export function ReportButton({ targetType, targetId, label = '反馈 / 投诉' }: { targetType: 'pro' | 'post'; targetId: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [more, setMore] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  async function send() {
    setBusy(true);
    setMsg(null);
    const r = await api('/api/v1/jobs/report', { body: { targetType, targetId, reason: [reason, more.trim()].filter(Boolean).join('：') } });
    setBusy(false);
    if (!r.ok) {
      if (r.status === 401) return setNeedLogin(true);
      return setMsg({ ok: false, text: r.message });
    }
    setMsg({ ok: true, text: '已转给商会工作人员，他们会尽快处理。谢谢您告诉我们。' });
  }
  return (
    <>
      <button type="button" className={j.linkBtn} onClick={() => { setOpen(true); setMsg(null); }}>{label}</button>
      {open && (
        <div className={j.mask} role="dialog" aria-modal="true" aria-label="反馈 / 投诉" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className={j.sheet}>
            <p className={s.cardTitle}>反馈 / 投诉</p>
            <p className={s.small}>直接转给商会工作人员，对方看不到是谁反馈的。</p>
            {msg && <div className={msg.ok ? s.success : s.error}>{msg.text}</div>}
            {needLogin && !msg?.ok ? (
              <NeedLogin why="登录后才能反馈（方便工作人员回复您）。" onDone={() => { setNeedLogin(false); send(); }} />
            ) : !msg?.ok ? (
              <>
                <div className={j.opts} style={{ margin: '0.5rem 0 0.75rem' }}>
                  {REPORT_REASONS.map((x) => (
                    <button key={x} type="button" className={`${s.chip} ${reason === x ? s.chipOn : ''}`} onClick={() => setReason(x)}>{x}</button>
                  ))}
                </div>
                <div className={s.field}>
                  <label className={s.label} htmlFor={`rp-${targetId}`}>补充说明（选填）</label>
                  <textarea id={`rp-${targetId}`} className={s.textarea} style={{ minHeight: 80 }} value={more} onChange={(e) => setMore(e.target.value)} />
                </div>
              </>
            ) : null}
            <div className={s.btnRow}>
              {!msg?.ok && !needLogin && <button type="button" className={s.btn} disabled={busy || !reason} onClick={send}>{busy ? '正在提交…' : reason ? '提交给工作人员' : '先选一个原因'}</button>}
              <button type="button" className={`${s.btn} ${s.btnQuiet}`} onClick={() => setOpen(false)}>{msg?.ok ? '好的' : '取消'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** 点选：单选 / 多选，按钮样子（能点选就不让打字） */
export function Pick<T extends string>({
  options,
  value,
  onChange,
  multi
}: {
  options: { value: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  multi?: boolean;
}) {
  return (
    <div className={j.opts}>
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            className={`${j.opt} ${on ? j.optOn : ''}`}
            onClick={() => onChange(multi ? (on ? value.filter((x) => x !== o.value) : [...value, o.value]) : [o.value])}
          >
            {on && multi ? '✓ ' : ''}{o.label}
          </button>
        );
      })}
    </div>
  );
}

export function initial(name: string) {
  return (name || '?').trim().slice(0, 1);
}

export function ago(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 60) return `${Math.max(1, m)} 分钟前`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN', { timeZone: 'America/Los_Angeles' });
}

/** 点击统计（后台「找工人接活儿统计」的点击数）：工种 / 首页入口；失败不影响页面 */
export function trackJobs(name: 'jobs_trade' | 'jobs_home_entry', target: string) {
  try {
    void fetch('/api/v1/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', keepalive: true, body: JSON.stringify({ client: 'web', items: [{ name, target }] }) });
  } catch {
    /* ignore */
  }
}

/** 已验证的手机号：发布活儿、登记接活儿都要（对方要能打电话）。没验证就在同一页验证，填的内容不丢 */
export function PhoneCheck({ onPhone, why }: { onPhone: (phone: string | null) => void; why: string }) {
  const [info, setInfo] = useState<ContactInfo | null>(null);
  const [state, setState] = useState<'loading' | 'login' | 'ok' | 'error'>('loading');
  const load = useCallback(async () => {
    const r = await api<{ contactInfo: ContactInfo }>('/api/v1/me/contact');
    if (!r.ok) { setState(r.status === 401 ? 'login' : 'error'); onPhone(null); return; }
    setInfo(r.data.contactInfo);
    setState('ok');
    const ph = r.data.contactInfo.phone;
    onPhone(ph && ph.status === 'confirmed' ? ph.value : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);
  if (state === 'loading') return <p className={s.small}>正在读取你的手机号…</p>;
  if (state === 'login') return <NeedLogin why={why} onDone={load} />;
  if (state === 'error' || !info) return <p className={s.error}>没读到你的手机号。<button className={j.linkBtn} onClick={load}>再试一次</button></p>;
  const ph = info.phone;
  if (ph && ph.status === 'confirmed') return <p style={{ margin: 0 }}><span className={s.mono}>{ph.masked}</span> <span className={s.small}>（已验证，自动带出）</span></p>;
  return (
    <>
      <p className={s.small} style={{ margin: '0 0 0.4rem' }}>{ph ? '你的手机号还没验证。点"验证手机号"，收一条短信验证码就好；' : '你的账号还没有手机号。点"修改"填上手机号再验证；'}填的其它内容不会丢。</p>
      <ContactInfoCard info={info} onChange={(i) => { setInfo(i); onPhone(i.phone && i.phone.status === 'confirmed' ? i.phone.value : null); }} />
    </>
  );
}
