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
const SEC: Record<string, string> = { pass: '内容安全：通过', review: '内容安全：建议人工复核', skipped: '内容安全：未检测（转人工审核）', error: '内容安全：检测失败' };
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
          <img src={c.avatar_url} alt="头像" width={64} height={64} style={{ width: 64, height: 64, minWidth: 64, maxWidth: 64, objectFit: 'cover', flexShrink: 0, display: 'block' }} />
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

type P = { id: string; url: string; thumb_url: string; visibility: string; review_status: string; created_at: string; event_title: string; uploader: string | null; member_no: number | null };

/** 1.3：客户上传、勾选“放进活动相册”但没自动通过的照片（不是本场报名的人传的）在这里审 */
function PhotoReview() {
  const [filter, setFilter] = useState('review');
  const [data, setData] = useState<{ photos: P[]; pending: number } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ photos: P[]; pending: number }>(`/api/v1/staff/photos?filter=${filter}`);
    if (r.ok) setData(r.data);
    else setMsg({ ok: false, text: r.message });
  }, [filter]);
  useEffect(() => {
    load();
  }, [load]);
  async function act(id: string, action: string) {
    const r = await api('/api/v1/staff/photos', { body: { id, action } });
    setMsg(r.ok ? { ok: true, text: { approve: '已放进相册', reject: '已退回（只有上传者自己能看）', hide: '已删除' }[action] ?? '已处理' } : { ok: false, text: r.message });
    load();
  }
  return (
    <>
      <div className={styles.notice}>客户自己上传的照片默认只有本人和工作人员能看。本场报名的人勾选“放进活动相册”会直接进相册；其他人勾选的在这里审。</div>
      <Msg m={msg} />
      <div className={styles.chips}>
        {([['review', '待审核'], ['album', '已在相册'], ['all', '全部客户照片']] as [string, string][]).map(([k, v]) => (
          <button key={k} className={`${styles.chip} ${filter === k ? styles.chipOn : ''}`} onClick={() => setFilter(k)}>{v}{k === 'review' && data ? ` ${data.pending}` : ''}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
        {data?.photos.map((p) => (
          <div key={p.id} className={styles.card} style={{ padding: 8 }}>
            <a href={p.url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumb_url} alt="客户上传的照片" style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }} />
            </a>
            <p className={styles.small} style={{ margin: '6px 0' }}>{p.event_title}<br />{p.uploader ?? '—'}{p.member_no ? ` · No.${p.member_no}` : ''}</p>
            <div className={styles.btnRow}>
              {p.review_status === 'review' && <button className={styles.btn} onClick={() => act(p.id, 'approve')}>放进相册</button>}
              {p.visibility === 'album' && <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => act(p.id, 'reject')}>退回</button>}
              <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => act(p.id, 'hide')}>删除</button>
            </div>
          </div>
        ))}
      </div>
      {data && !data.photos.length && <p className={styles.muted}>暂无。</p>}
    </>
  );
}

export default function StaffCards() {
  const [tab, setTab] = useState<'cards' | 'photos'>('cards');
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
    <StaffGate title="内容审核" role="ops">
      {() => (
        <>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab === 'cards' ? styles.tabOn : ''}`} onClick={() => setTab('cards')}>名片</button>
            <button className={`${styles.tab} ${tab === 'photos' ? styles.tabOn : ''}`} onClick={() => setTab('photos')}>客户照片</button>
          </div>
          {tab === 'photos' ? <PhotoReview /> : <>
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
          </>}
        </>
      )}
    </StaffGate>
  );
}
