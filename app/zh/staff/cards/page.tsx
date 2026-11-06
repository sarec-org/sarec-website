'use client';
/**
 * 名片审核（用户生成内容）：会员自己填写、对外展示的电子名片——姓名、公司、职位、业务介绍、微信号、头像。
 * 先发后审：文字保存前已过微信内容安全检查；这里逐条人工查看，可审核通过、下架（写原因）、恢复、清除头像。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';

type C = {
  contact_id: string; token: string; name: string; member_no: number; avatar_url: string | null;
  company: string | null; title: string | null; intro: string | null; wechat_id: string | null;
  content_updated_at: string | null; reviewed_at: string | null; reviewed_by: string | null; sec_check: string | null;
  hidden_at: string | null; hidden_reason: string | null; hidden_by: string | null; pending: boolean;
};
const SEC: Record<string, string> = { pass: '内容安全：通过', review: '内容安全：建议人工复核', skipped: '内容安全：未检测（网站端修改）', error: '内容安全：检测失败' };
const FILTERS: [string, string][] = [['pending', '待审核'], ['hidden', '已下架'], ['all', '全部']];

function Card({ c, onDone }: { c: C; onDone: (m: { ok: boolean; text: string }) => void }) {
  const [reason, setReason] = useState('');
  async function act(action: string) {
    const r = await api('/api/v1/staff/cards', { body: { contactId: c.contact_id, action, reason } });
    const label: Record<string, string> = { approve: '已审核通过', hide: '已下架', restore: '已恢复', clear_avatar: '已清除头像' };
    onDone(r.ok ? { ok: true, text: `${c.name}：${label[action]}` } : { ok: false, text: r.message });
  }
  return (
    <div className={styles.card} style={{ borderColor: c.hidden_at ? '#e7a1a1' : c.sec_check === 'review' ? '#e7c46a' : undefined }}>
      <div className={styles.row} style={{ alignItems: 'flex-start', gap: 14 }}>
        {c.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.avatar_url} alt="头像" width={64} height={64} style={{ objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 64, height: 64, background: '#e8e4da', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className={styles.cardTitle} style={{ marginBottom: 4 }}>
            {c.name} <span className={styles.small}>No.{c.member_no}</span>{' '}
            {c.hidden_at ? <span className={`${styles.badge} ${styles.badgeRed}`}>已下架</span> : c.pending ? <span className={styles.badge}>待审核</span> : <span className={`${styles.badge} ${styles.badgeGreen}`}>已审核</span>}
          </p>
          <p className={styles.small} style={{ margin: 0 }}>{[c.company, c.title].filter(Boolean).join(' · ') || '未填公司职位'}{c.wechat_id ? ` · 微信 ${c.wechat_id}` : ''}</p>
          <p style={{ margin: '6px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.intro || <span className={styles.muted}>未填业务介绍</span>}</p>
          <p className={styles.small} style={{ margin: 0 }}>
            最近修改 {c.content_updated_at ? fmtDateTime(c.content_updated_at) : '—'} · {SEC[c.sec_check ?? ''] ?? '内容安全：—'}
            {c.reviewed_at ? ` · ${c.reviewed_by ?? ''} 审核于 ${fmtDateTime(c.reviewed_at)}` : ''}
          </p>
          {c.hidden_at && <p className={styles.error} style={{ margin: '4px 0 0' }}>下架原因：{c.hidden_reason}（{c.hidden_by}，{fmtDateTime(c.hidden_at)}）</p>}
        </div>
      </div>
      <div className={styles.inputRow} style={{ marginTop: 10 }}>
        {!c.hidden_at && <input className={styles.input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="下架原因（必填，例如：含收益承诺 / 不实信息 / 广告引流）" aria-label="下架原因" />}
        {!c.hidden_at && c.pending && <button className={styles.btn} onClick={() => act('approve')}>审核通过</button>}
        {!c.hidden_at && <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => act('hide')} disabled={!reason.trim()}>下架</button>}
        {c.hidden_at && <button className={styles.btn} onClick={() => act('restore')}>恢复展示</button>}
        {c.avatar_url && <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => act('clear_avatar')}>清除头像</button>}
      </div>
    </div>
  );
}

export default function StaffCards() {
  const [filter, setFilter] = useState('pending');
  const [q, setQ] = useState('');
  const [data, setData] = useState<{ cards: C[]; counts: { pending: number; hidden: number } } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ cards: C[]; counts: { pending: number; hidden: number } }>(`/api/v1/staff/cards?filter=${filter}&q=${encodeURIComponent(q)}`);
    if (r.ok) setData(r.data);
    else setMsg({ ok: false, text: r.message });
  }, [filter, q]);
  useEffect(() => {
    load();
  }, [load]);
  return (
    <StaffGate title="名片审核" role="ops">
      {() => (
        <>
          <div className={styles.notice}>
            会员自己填写、对外展示的电子名片（姓名、公司、职位、业务介绍、微信号、头像）。<strong>先发后审</strong>：文字保存前已过微信内容安全检查，明显违规的不能保存；这里逐条人工查看。
            下架后别人打开名片只显示“已下架”，本人仍可修改，改好后在这里恢复。
          </div>
          <Msg m={msg} />
          <div className={styles.chips}>
            {FILTERS.map(([k, v]) => (
              <button key={k} className={`${styles.chip} ${filter === k ? styles.chipOn : ''}`} onClick={() => setFilter(k)}>
                {v}{k === 'pending' && data ? ` ${data.counts.pending}` : k === 'hidden' && data ? ` ${data.counts.hidden}` : ''}
              </button>
            ))}
          </div>
          <div className={styles.inputRow} style={{ margin: '10px 0' }}>
            <input className={styles.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索姓名 / 公司 / 职位 / 介绍" aria-label="搜索" />
          </div>
          {data?.cards.map((c) => <Card key={c.contact_id} c={c} onDone={(m) => { setMsg(m); load(); }} />)}
          {data && !data.cards.length && <p className={styles.muted}>{filter === 'pending' ? '没有待审核的名片。' : '暂无。'}</p>}
        </>
      )}
    </StaffGate>
  );
}
