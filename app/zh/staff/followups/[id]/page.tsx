'use client';
/**
 * 一条待跟进的处理页（后台综合优化 B，四.2–四.7）：通知邮件和「今天」卡片都直达这里，不是列表。
 * 手机一屏看完：这是什么 + 建议怎么办 → 原话 → 联系按钮（草稿按谁联系）→ 联系回填 → 不跟进 / 我来联系 / 转给助理 → 负责人、下一步日期。
 * 邮件按钮带 ?do=drop|claim|assist&t=口令：已登录的工作人员打开就自动执行（没登录先登录，登录完自动执行），只执行一次。
 */
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';
import { ActionButtons, ContactResult, DateQuick } from '@/components/crm/staff/TodayActions';
import type { TodayAction } from '@/lib/crm/today/types';

type Card = {
  id: string; what: string; suggest: string; name: string | null; need: string | null; message: string | null; sourceLabel: string; status: string;
  owner: string | null; nextDate: string | null; createdAt: string; contactId: string | null; isMember: boolean; memberTier: string | null;
  phone: string | null; email: string | null; wechat: string | null; category: 'customer' | 'pitch' | 'spam'; categoryLabel: string; categoryReason: string;
  overdueDays: number; lastContactAt: string | null; lastContactResult: string | null; lastContactBy: string | null; storedDraft: string | null; storedDraftBy: string;
};
type Data = { card: Card; draft: string | null; draftVoice: string; actions: TodayAction[]; log: { actor: string; from_status: string | null; to_status: string | null; note: string | null; created_at: string }[]; team: { name: string; president: boolean; assistant: boolean }[]; me: string };

const STATUS: Record<string, string> = { todo: '待联系', contacted: '已联系', meeting: '已约谈', won: '已成交', dropped: '不跟进' };
const RESULT: Record<string, string> = { reached: '联系上了', no_answer: '没接', scheduled: '已约时间' };
const DO_LABEL: Record<string, string> = { drop: '不跟进', claim: '我来联系', assist: '转给助理' };

function One({ id }: { id: string }) {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [asked, setAsked] = useState(false);
  const [owner, setOwner] = useState('');
  const [nextDate, setNextDate] = useState('');
  const ran = useRef(false);
  const load = useCallback(async () => {
    const r = await api<Data>(`/api/v1/staff/followups/${id}/card`);
    if (!r.ok) return setErr(r.message);
    setD(r.data);
    setOwner(r.data.card.owner ?? '');
    setNextDate(r.data.card.nextDate ?? '');
  }, [id]);
  const act = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      const r = await api<{ message: string }>(`/api/v1/staff/followups/${id}/act`, { body: { action, ...extra } });
      setMsg(r.ok ? { ok: true, text: r.data.message } : { ok: false, text: r.message });
      load();
    },
    [id, load]
  );
  useEffect(() => {
    // 邮件按钮：只自动执行一次，执行完把口令从地址栏去掉（刷新不会再执行）
    const sp = new URLSearchParams(location.search);
    const doIt = sp.get('do');
    const t = sp.get('t');
    if (!ran.current && doIt && t && DO_LABEL[doIt]) {
      ran.current = true;
      history.replaceState(null, '', location.pathname);
      act(doIt, { token: t, auto: true });
    } else load();
  }, [act, load]);

  if (err) return <p className={styles.error}>{err} <Link href="/zh/staff/followups">去待跟进列表</Link></p>;
  if (!d) return <p className={styles.muted}>加载中…</p>;
  const c = d.card;
  const open = ['todo', 'contacted', 'meeting'].includes(c.status);
  const save = async () => {
    const r = await api(`/api/v1/staff/followups/${id}`, { body: { owner: owner || null, nextDate: nextDate || null } });
    setMsg(r.ok ? { ok: true, text: '负责人和下一步日期已保存' } : { ok: false, text: r.message });
    load();
  };
  return (
    <>
      <Msg m={msg} />
      <div className={`${styles.card} ${styles.cardGold}`}>
        <p style={{ margin: '0 0 0.3rem', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {c.isMember && <span className={`${styles.badge} ${styles.badgeGreen}`}>会员{c.memberTier && c.memberTier !== '会员' ? ` · ${c.memberTier}` : ''}</span>}
          <span className={styles.badge}>{c.sourceLabel}</span>
          <span className={`${styles.badge} ${c.category === 'customer' ? '' : styles.badgeMuted}`}>{c.categoryLabel}</span>
          <span className={`${styles.badge} ${c.status === 'dropped' ? styles.badgeMuted : ''}`}>{STATUS[c.status] ?? c.status}</span>
          {c.overdueDays > 0 && <span className={`${styles.badge} ${styles.badgeRed}`}>过期 {c.overdueDays} 天</span>}
        </p>
        <p className={styles.cardTitle}>{c.what}</p>
        <p style={{ margin: 0 }}><strong>建议：</strong>{c.suggest}</p>
        {c.category !== 'customer' && c.categoryReason && <p className={styles.small} style={{ margin: '0.3rem 0 0' }}>为什么这么分：{c.categoryReason}</p>}
      </div>

      <div className={styles.card}>
        <p className={styles.small} style={{ margin: '0 0 0.3rem' }}>原话（{fmtDateTime(c.createdAt)}）</p>
        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{c.message || c.need || '（对方没有留言）'}</p>
        <p className={styles.small} style={{ margin: '0.5rem 0 0' }}>
          {[c.phone && `手机 ${c.phone}`, c.email && `邮箱 ${c.email}`, c.wechat && `微信号 ${c.wechat}`].filter(Boolean).join(' · ') || '没留联系方式'}
          {c.lastContactAt ? ` · 上次联系 ${fmtDateTime(c.lastContactAt)}（${c.lastContactBy ?? ''}${c.lastContactResult ? '，' + (RESULT[c.lastContactResult] ?? '') : ''}）` : ''}
        </p>
      </div>

      {d.draft && (
        <div className={styles.notice}>
          <p className={styles.small} style={{ margin: '0 0 6px' }}>建议联系内容（{d.draftVoice}{c.isMember ? '、对会员' : ''}{c.overdueDays > 0 ? '、带致歉' : ''}；点下面的短信 / 邮件会带上，您自己发，系统不替您发）</p>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{d.draft}</p>
        </div>
      )}
      {d.actions.length > 0 ? (
        <ActionButtons actions={d.actions} onDone={setMsg} onContact={() => setAsked(true)} />
      ) : (
        <p className={styles.muted}>对方没留电话、邮箱或微信，没法直接联系。</p>
      )}
      {(asked || (open && d.actions.length > 0)) && <ContactResult endpoint={`/api/v1/staff/followups/${id}/result`} onDone={(m) => { setMsg(m); if (m.ok) { setAsked(false); load(); } }} />}

      <div className={styles.btnRow} style={{ marginTop: '0.8rem' }}>
        <button type="button" className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => act('drop')}>不跟进</button>
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => act('claim')}>我来联系</button>
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => act('assist')}>转给助理</button>
      </div>
      <div className={styles.btnRow} style={{ marginTop: '0.5rem' }}>
        {c.category === 'customer' ? (
          <>
            <button type="button" className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => act('category', { category: 'pitch' })}>其实是推销</button>
            <button type="button" className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => act('category', { category: 'spam' })}>其实是垃圾</button>
          </>
        ) : (
          <button type="button" className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => act('category', { category: 'customer' })}>其实是客户咨询</button>
        )}
      </div>

      <div className={styles.card} style={{ marginTop: '1rem' }}>
        <p className={styles.cardTitle}>负责人和下一步</p>
        <p className={styles.small} style={{ margin: '0 0 0.3rem' }}>负责人（点选团队成员）</p>
        <div className={styles.chips}>
          {d.team.map((m) => (
            <button key={m.name} type="button" className={`${styles.chip} ${owner === m.name ? styles.chipOn : ''}`} onClick={() => setOwner(owner === m.name ? '' : m.name)}>
              {m.name}{m.president ? '（会长）' : m.assistant ? '（助理）' : ''}
            </button>
          ))}
        </div>
        <p className={styles.small} style={{ margin: '0.6rem 0 0.3rem' }}>下一步日期</p>
        <DateQuick value={nextDate} onChange={setNextDate} id={`nd-${id}`} />
        <button type="button" className={styles.btn} style={{ marginTop: '0.6rem', width: '100%' }} onClick={save}>保存负责人和日期</button>
      </div>

      {d.log.length > 0 && (
        <div className={styles.card}>
          <p className={styles.cardTitle}>处理记录</p>
          {d.log.map((l, i) => (
            <p key={i} className={styles.small} style={{ margin: '4px 0' }}>
              {fmtDateTime(l.created_at)} · {l.actor.replace(/^staff:/, '')} · {STATUS[l.from_status ?? ''] ?? '—'} → {STATUS[l.to_status ?? ''] ?? '—'}{l.note ? ` · ${l.note}` : ''}
            </p>
          ))}
        </div>
      )}
      <div className={styles.btnRow}>
        {c.contactId && <Link className={`${styles.btn} ${styles.btnQuiet}`} href={`/zh/staff/contacts/${c.contactId}`}>查看客户档案</Link>}
        <Link className={`${styles.btn} ${styles.btnQuiet}`} href="/zh/staff/followups">全部待跟进</Link>
      </div>
    </>
  );
}

export default function Page({ params }: { params: { id: string } }) {
  return (
    <StaffGate role="ops" title="这条跟进">
      {() => <One id={params.id} />}
    </StaffGate>
  );
}
