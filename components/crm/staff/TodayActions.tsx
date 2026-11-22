'use client';
/**
 * 「今天」页和待跟进处理页共用：卡片上的按钮（TodayAction）+ 联系回填（联系上了 / 没接 / 已约时间）。
 * 联系按钮只打开手机自己的电话 / 短信 / 邮件程序，系统不替人发。
 * ContactButtons：全站唯一的一套联系按钮（客户档案、入会申请、专委会意向……和「待跟进」一致，七.4）；MemberBadge：会员身份一眼可见。
 */
import Link from 'next/link';
import { useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { api, copyText } from '@/components/crm/client';
import type { TodayAction } from '@/lib/crm/today/types';
import { buildContactActions, type ContactInfo } from '@/lib/crm/today/contactActions';
import { laToday } from '@/lib/laDate';

const isContact = (a: TodayAction) => a.type === 'tel' || a.type === 'sms' || a.type === 'mailto' || a.type === 'copy';

/** sms: 链接：iPhone 用 &body=，安卓用 ?body=；两种都认的写法是 sms:<号码>?&body= */
export function smsHref(phone: string, body: string) {
  return `sms:${phone}${body ? `?&body=${encodeURIComponent(body)}` : ''}`;
}
export function mailtoHref(email: string, subject: string, body: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function ActionButtons({
  actions,
  onDone,
  onContact
}: {
  actions: TodayAction[];
  onDone: (msg: { ok: boolean; text: string }) => void;
  onContact?: () => void;
}) {
  const [busy, setBusy] = useState('');
  const cls = (a: { primary?: boolean; danger?: boolean }, i: number) =>
    `${styles.btn} ${a.danger ? styles.btnDanger : a.primary || i === 0 ? '' : styles.btnGhost}`;
  return (
    <div className={styles.btnRow} style={{ marginTop: '0.6rem' }}>
      {actions.map((a, i) => {
        const key = `${a.type}-${a.label}-${i}`;
        const contacted = () => isContact(a) && onContact?.();
        if (a.type === 'link') return <Link key={key} className={cls(a, i)} href={a.href}>{a.label}</Link>;
        if (a.type === 'tel') return <a key={key} className={cls({}, i)} href={`tel:${a.phone}`} onClick={contacted}>{a.label}</a>;
        if (a.type === 'sms') return <a key={key} className={cls({}, i)} href={smsHref(a.phone, a.body)} onClick={contacted}>{a.label}</a>;
        if (a.type === 'mailto') return <a key={key} className={cls({}, i)} href={mailtoHref(a.email, a.subject, a.body)} onClick={contacted}>{a.label}</a>;
        if (a.type === 'copy')
          return (
            <button key={key} type="button" className={cls({}, i)} onClick={async () => { const ok = await copyText(a.text); onDone(ok ? { ok: true, text: a.toast } : { ok: false, text: `复制没成功，请手动记下：${a.text}` }); if (ok) contacted(); }}>
              {a.label}
            </button>
          );
        return (
          <button
            key={key}
            type="button"
            className={cls(a, i)}
            disabled={!!busy}
            onClick={async () => {
              if (a.confirm && !window.confirm(a.confirm)) return;
              setBusy(a.label);
              const r = await api<{ message?: string }>(a.endpoint, { body: a.body ?? {} });
              setBusy('');
              onDone(r.ok ? { ok: true, text: r.data.message || a.done || '已完成' } : { ok: false, text: r.message });
            }}
          >
            {busy === a.label ? '处理中…' : a.label}
          </button>
        );
      })}
    </div>
  );
}

const addDays = (n: number) => new Date(Date.parse(laToday()) + n * 86400_000).toISOString().slice(0, 10);

/** 四.5：点过联系按钮回来，一键选结果 */
export function ContactResult({ endpoint, onDone }: { endpoint: string; onDone: (msg: { ok: boolean; text: string }) => void }) {
  const [pick, setPick] = useState(false);
  const [date, setDate] = useState(addDays(1));
  const [busy, setBusy] = useState(false);
  const send = async (result: string, d?: string) => {
    setBusy(true);
    const r = await api<{ message: string }>(endpoint, { body: { result, date: d } });
    setBusy(false);
    onDone(r.ok ? { ok: true, text: r.data.message } : { ok: false, text: r.message });
  };
  return (
    <div className={styles.notice} style={{ marginTop: '0.6rem' }}>
      <p style={{ margin: '0 0 0.4rem' }}><strong>联系得怎么样？</strong>点一下，自动改状态、记时间</p>
      <div className={styles.btnRow}>
        <button type="button" className={styles.btn} disabled={busy} onClick={() => send('reached')}>联系上了</button>
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} disabled={busy} onClick={() => send('no_answer')}>没接</button>
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} disabled={busy} onClick={() => setPick(!pick)}>已约时间</button>
      </div>
      {pick && (
        <div style={{ marginTop: '0.6rem' }}>
          <DateQuick value={date} onChange={setDate} />
          <button type="button" className={styles.btn} style={{ marginTop: '0.5rem', width: '100%' }} disabled={busy} onClick={() => send('scheduled', date)}>约在 {date}，记下</button>
        </div>
      )}
    </div>
  );
}

/** 四.7：日期快捷选：今天 / 明天 / 下周 + 自己选 */
export function DateQuick({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) {
  const opts: [string, string][] = [['今天', addDays(0)], ['明天', addDays(1)], ['下周', addDays(7)]];
  return (
    <div className={styles.chips} style={{ alignItems: 'center' }}>
      {opts.map(([l, v]) => (
        <button key={l} type="button" className={`${styles.chip} ${value === v ? styles.chipOn : ''}`} onClick={() => onChange(v)}>{l}</button>
      ))}
      <input id={id} type="date" className={styles.input} style={{ maxWidth: 180 }} value={value} onChange={(e) => onChange(e.target.value)} aria-label="自己选日期" />
    </div>
  );
}

/**
 * 联系按钮（和「待跟进」「今天」同一套）：打电话、发短信（带草稿）、发邮件（带草稿，只打开邮件程序）、复制微信号、复制手机号加微信。
 * 给了 resultEndpoint（某条待跟进的 /api/v1/staff/followups/<id>/result）：点过联系按钮回来，一键选“联系上了 / 没接 / 已约时间”。
 */
export function ContactButtons({
  resultEndpoint,
  onResultDone,
  ...info
}: ContactInfo & { resultEndpoint?: string | null; onResultDone?: (msg: { ok: boolean; text: string }) => void }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [asked, setAsked] = useState(false);
  if (!info.phone && !info.email && !info.wechat) return <p className={styles.small} style={{ margin: '0.4rem 0 0' }}>没有留联系方式</p>;
  return (
    <div>
      <ActionButtons actions={buildContactActions(info)} onDone={setMsg} onContact={() => setAsked(true)} />
      {info.wechat && <p className={styles.small} style={{ margin: '0.3rem 0 0' }}>微信号：<b>{info.wechat}</b></p>}
      {msg && <p className={styles.small} style={{ margin: '0.3rem 0 0', color: msg.ok ? undefined : '#f3a1a1' }}>{msg.text}</p>}
      {resultEndpoint && asked && (
        <ContactResult
          endpoint={resultEndpoint}
          onDone={(m) => {
            setMsg(m);
            if (m.ok) setAsked(false);
            onResultDone?.(m);
          }}
        />
      )}
    </div>
  );
}

/** 会员身份一眼可见（所有列表共用）；内部 / 审核演示 / 测试账号另标 */
export function MemberBadge({ isMember, tier, kind }: { isMember?: boolean | null; tier?: string | null; kind?: string | null }) {
  if (kind === 'internal') return <span className={`${styles.badge} ${styles.badgeMuted}`}>内部账号</span>;
  if (kind === 'review_demo') return <span className={`${styles.badge} ${styles.badgeMuted}`}>审核演示</span>;
  if (kind === 'test') return <span className={`${styles.badge} ${styles.badgeMuted}`}>测试</span>;
  if (!isMember && !tier) return null;
  return <span className={`${styles.badge} ${styles.badgeGreen}`}>会员{tier ? `·${tier}` : ''}</span>;
}
