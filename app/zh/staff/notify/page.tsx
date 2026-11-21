'use client';
/**
 * 后台综合优化 五.7：手机通知（建议挂在「设置与团队」下）。
 * 每个人选自己收哪几类、走哪个渠道；管理员能改所有人、指定“负责人”（东哥：钱和异常一定发给他）。
 * 最下面是“最近的通知”和（管理员）“本该发什么”的记录——通知总闸关着时只记录不发，收件人打码。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';

type Person = { key: string; name: string; isMe: boolean; isOwner: boolean; channel: string | null; effectiveChannel: string | null; wecomUserid: string | null; hasPhone: boolean; hasEmail: boolean; categories: string[]; custom: boolean };
type Data = {
  live: boolean; wecomReady: boolean; isAdmin: boolean; rules: string[];
  categories: { key: string; label: string; immediate: boolean }[];
  people: Person[];
  notices: { id: string; staff_name: string | null; category_label: string; title: string; status: string; created_at: string; sent_at: string | null; send_after: string | null }[];
  log: { id: string; kind: string; channel: string; to_masked: string; body: string; status: string; error: string | null; created_at: string }[];
};
const CH: Record<string, string> = { sms: '短信', wecom: '企业微信', email: '邮件' };
const NST: Record<string, string> = { sent: '已通知', held: '夜里攒着，早上 8 点发', merged: '当天超过 10 条，已合并', digest: '进每日汇总', pending: '待发', skipped: '没发' };
const LST: Record<string, string> = { sent: '已发出', held: '只记录没发（总闸关着）', blocked: '只记录没发（测试站只发测试身份）', failed: '没发出去' };

export default function NotifySettings() {
  const [d, setD] = useState<Data | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    const r = await api<Data>('/api/v1/staff/notify');
    if (r.ok) setD(r.data);
    else setMsg({ ok: false, text: r.message });
  }, []);
  useEffect(() => { load(); }, [load]);
  const save = async (b: Record<string, unknown>, ok: string) => {
    const r = await api('/api/v1/staff/notify', { body: b });
    setMsg(r.ok ? { ok: true, text: ok } : { ok: false, text: r.message });
    load();
  };
  const big = { minHeight: 44 };
  return (
    <StaffGate title="手机通知" role={['ops', 'checkin', 'finance']}>
      {() => d && (
        <>
          <Msg m={msg} />
          <div className={d.live ? styles.success : styles.notice}>
            {d.live
              ? '通知总闸：开着。正式站会真的发出去。'
              : '通知总闸：关着。正式站只记录“本该发什么、发给谁”，一条都不真发。打开要东哥点头。'}
            {' '}测试站不看总闸，只发给测试身份（测试号码、测试邮箱），其余只记录。
            {d.isAdmin && (
              <div className={styles.btnRow}>
                <button className={`${styles.btn} ${d.live ? styles.btnQuiet : ''}`} style={big} onClick={() => {
                  if (!d.live && !confirm('打开后会真的给工作人员发通知、给入会申请人发缴费链接。东哥同意了吗？')) return;
                  save({ action: 'live', on: !d.live }, d.live ? '已关上通知总闸：以后只记录不发' : '已打开通知总闸');
                }}>{d.live ? '关上总闸' : '打开总闸'}</button>
              </div>
            )}
          </div>
          <div className={styles.card}>
            <p className={styles.cardTitle}>规则</p>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>{d.rules.map((r) => <li key={r} className={styles.small}>{r}</li>)}</ul>
            {!d.wecomReady && <p className={styles.small}>企业微信通知还没配好：选了企业微信的人暂时自动改用短信。</p>}
          </div>
          {d.people.map((p) => (
            <div key={p.key} className={styles.card}>
              <p className={styles.cardTitle} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {p.name}{p.isMe && '（我）'}
                {p.isOwner && <span className={`${styles.badge} ${styles.badgeGreen}`}>负责人：钱和异常一定发给他</span>}
              </p>
              <p className={styles.small} style={{ marginTop: 0 }}>
                现在走：{p.effectiveChannel ? CH[p.effectiveChannel] : '没有可用的渠道（没留手机号和邮箱）'}
                {!p.hasPhone && ' · 没有手机号，短信发不了'}
              </p>
              <div className={styles.field}>
                <span className={styles.label}>渠道</span>
                <div className={styles.btnRow} style={{ flexWrap: 'wrap', marginTop: 0 }}>
                  {(['sms', 'wecom', 'email'] as const).map((c) => (
                    <button key={c} style={big} className={`${styles.btn} ${(p.channel ?? 'sms') === c ? '' : styles.btnGhost}`} onClick={() => save({ staffKey: p.key, channel: c }, `${p.name} 改用${CH[c]}`)}>{CH[c]}</button>
                  ))}
                </div>
                {(p.channel === 'wecom' || p.wecomUserid) && (
                  <WecomId p={p} onSave={(v) => save({ staffKey: p.key, wecomUserid: v }, '企业微信账号已保存')} />
                )}
              </div>
              <div className={styles.field}>
                <span className={styles.label}>收哪几类{p.custom ? '' : '（现在是默认）'}</span>
                {d.categories.map((c) => {
                  const on = p.categories.includes(c.key);
                  return (
                    <label key={c.key} style={{ display: 'flex', gap: 10, alignItems: 'center', minHeight: 44 }}>
                      <input type="checkbox" style={{ width: 22, height: 22 }} checked={on} onChange={() => {
                        const next = on ? p.categories.filter((x) => x !== c.key) : [...p.categories, c.key];
                        save({ staffKey: p.key, categories: next }, '已保存');
                      }} />
                      <span>{c.label}{c.immediate ? '（立即）' : ''}</span>
                    </label>
                  );
                })}
                <div className={styles.btnRow} style={{ flexWrap: 'wrap' }}>
                  {p.custom && <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} onClick={() => save({ staffKey: p.key, reset: true }, '已改回默认')}>改回默认</button>}
                  {d.isAdmin && !p.isOwner && <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} onClick={() => save({ staffKey: p.key, owner: true }, `${p.name} 设为负责人`)}>设为负责人</button>}
                </div>
              </div>
            </div>
          ))}
          <h2 className={styles.h}>最近的通知</h2>
          {!d.notices.length && <p className={styles.muted}>还没有。</p>}
          {d.notices.map((n) => (
            <div key={n.id} className={styles.card} style={{ padding: '0.6rem 0.9rem', margin: '0 0 0.4rem' }}>
              <div>{n.title}</div>
              <div className={styles.small}>{n.category_label} · {d.isAdmin && n.staff_name ? `${n.staff_name} · ` : ''}{NST[n.status] ?? n.status} · {fmtDateTime(n.created_at)}</div>
            </div>
          ))}
          {d.isAdmin && (
            <>
              <h2 className={styles.h}>发送记录（收件人已打码）</h2>
              {!d.log.length && <p className={styles.muted}>还没有。</p>}
              {d.log.map((l) => (
                <div key={l.id} className={styles.card} style={{ padding: '0.6rem 0.9rem', margin: '0 0 0.4rem' }}>
                  <div className={styles.small}>{l.kind} · {CH[l.channel] ?? l.channel} · {l.to_masked} · <b>{LST[l.status] ?? l.status}</b>{l.error ? `（${l.error}）` : ''} · {fmtDateTime(l.created_at)}</div>
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.92rem' }}>{l.body}</div>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </StaffGate>
  );
}

function WecomId({ p, onSave }: { p: Person; onSave: (v: string) => void }) {
  const [v, setV] = useState(p.wecomUserid ?? '');
  return (
    <div className={styles.inputRow} style={{ marginTop: 8 }}>
      <input className={styles.input} placeholder="企业微信账号（成员 ID）" aria-label="企业微信账号" value={v} onChange={(e) => setV(e.target.value)} />
      <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => onSave(v)}>保存</button>
    </div>
  );
}
