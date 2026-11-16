'use client';
/**
 * 1.5.0 内容管理（东哥 11/14 定：先发后管；「举报」「主页审核」「内容审核」合成这一个页面，名字等东哥点头）。
 * 三栏：被举报的 / 机器拦下的 / 已下架的。每条能 下架 / 恢复 / 禁止此人；被举报的还能「不用处理」。
 * 用户发的内容（组局、个人主页、项目、相册照片、电子名片）发了就公开，这里只做事后管理。
 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';
import { Lightbox, Toast } from '@/components/crm/staff/ugcShared';

type Item = {
  kind: string; kindLabel: string; id: string; ownerId: string | null; owner: string | null; title: string; text: string | null; images: string[];
  state: 'live' | 'machine' | 'down'; note: string | null; at: string;
  reports?: { id: string; reason: string; detail: string | null; reporter: string | null; at: string }[];
};
type Ban = { what: string; contact_id: string; name: string | null; reason: string | null; banned_by: string; banned_at: string };
type Tab = 'reported' | 'machine' | 'down';

const TABS: { key: Tab; label: string; tip: string }[] = [
  { key: 'reported', label: '被举报的', tip: '用户在小程序里点「举报」的内容。看过以后：不合适就「下架」，没问题就「不用处理」。' },
  { key: 'machine', label: '机器拦下的', tip: '微信内容检测拦下或提醒看一眼的：组局没过检测（还没显示）、图片没过检测（已自动撤下）、文字建议人工看一眼（照常显示）。' },
  { key: 'down', label: '已下架的', tip: '工作人员下架的内容，别人看不到。点「恢复」又能看到。' }
];
const STATE: Record<string, string> = { live: '正在显示', machine: '机器拦下', down: '已下架' };

function Content() {
  const [tab, setTab] = useState<Tab>('reported');
  const [d, setD] = useState<{ items: Item[]; reportedOpen: number; bans: Ban[] } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [big, setBig] = useState<string | null>(null);
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    const r = await api<{ items: Item[]; reportedOpen: number; bans: Ban[] }>(`/api/v1/staff/content?tab=${tab}`);
    if (r.ok) setD(r.data); else setMsg({ ok: false, text: r.message });
  }, [tab]);
  useEffect(() => { load(); }, [load]);
  async function act(it: Item, action: string) {
    let reason: string | undefined;
    if (action === 'take_down' || action === 'ban') {
      const v = window.prompt(action === 'ban' ? `禁止 ${it.owner ?? '此人'}？写一句理由（可不填）` : '下架理由（可不填，会记在记录里）', '');
      if (v === null) return;
      reason = v;
    }
    setBusy(it.kind + it.id + action);
    const r = await api<{ message: string }>('/api/v1/staff/content', { body: { kind: it.kind, id: it.id, action, reason } });
    setBusy('');
    setMsg(r.ok ? { ok: true, text: r.data.message } : { ok: false, text: r.message });
    load();
  }
  async function unban(b: Ban) {
    const r = await api<{ message: string }>('/api/v1/staff/content', { body: { kind: 'profile', id: b.contact_id, action: 'unban', what: b.what } });
    setMsg(r.ok ? { ok: true, text: r.data.message } : { ok: false, text: r.message });
    load();
  }
  const cur = TABS.find((t) => t.key === tab)!;
  return (
    <>
      <div className={styles.notice}>用户发的内容发了就公开（东哥 11/14 定：先发后管）。这里集中做事后管理：下架、恢复、禁止此人，都有记录。</div>
      <div className={styles.tabs} role="tablist" style={{ margin: '12px 0' }}>
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={`${styles.tab} ${tab === t.key ? styles.tabOn : ''}`} onClick={() => setTab(t.key)}>
            {t.label}{t.key === 'reported' && d?.reportedOpen ? `（${d.reportedOpen}）` : ''}
          </button>
        ))}
      </div>
      <p className={styles.small}>{cur.tip}</p>
      {d && !d.items.length && <p className={styles.muted}>这里现在没有内容。</p>}
      {d?.items.map((it) => (
        <div key={it.kind + it.id} className={styles.card}>
          <p className={styles.cardTitle}>{it.title}</p>
          <p className={styles.small}>发的人：{it.owner ?? '（没留名字）'} · {fmtDateTime(it.at)} · 现在：{STATE[it.state]}{it.note ? ` · ${it.note}` : ''}</p>
          {it.text && <p style={{ whiteSpace: 'pre-wrap', margin: '6px 0' }}>{it.text}</p>}
          {it.images.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '6px 0' }}>
              {it.images.map((u) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={u} src={u} alt="内容里的图片" onClick={() => setBig(u)} style={{ width: 96, height: 96, objectFit: 'cover', cursor: 'zoom-in', border: '1px solid var(--line-3)' }} />
              ))}
            </div>
          )}
          {it.reports && (
            <ul style={{ margin: '6px 0', paddingLeft: '1.2em' }}>
              {it.reports.map((r) => <li key={r.id} className={styles.small}>举报：{r.reason}{r.detail ? `（${r.detail}）` : ''} · {r.reporter ?? '用户'} · {fmtDateTime(r.at)}</li>)}
            </ul>
          )}
          <div className={styles.btnRow} style={{ flexWrap: 'wrap' }}>
            {it.state === 'live' && <button className={`${styles.btn} ${styles.btnDanger}`} disabled={!!busy} onClick={() => act(it, 'take_down')}>下架</button>}
            {it.state !== 'live' && <button className={styles.btn} disabled={!!busy} onClick={() => act(it, 'restore')}>{it.state === 'machine' ? '放行（恢复显示）' : '恢复'}</button>}
            {tab === 'reported' && it.state === 'live' && <button className={`${styles.btn} ${styles.btnGhost}`} disabled={!!busy} onClick={() => act(it, 'dismiss')}>不用处理</button>}
            {it.ownerId && <button className={`${styles.btn} ${styles.btnGhost}`} disabled={!!busy} onClick={() => act(it, 'ban')}>禁止此人</button>}
          </div>
        </div>
      ))}
      {d && d.bans.length > 0 && (
        <div className={styles.card} style={{ marginTop: 24 }}>
          <p className={styles.cardTitle}>被禁止的人（{d.bans.length}）</p>
          <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
            {d.bans.map((b) => (
              <li key={b.what + b.contact_id} style={{ margin: '6px 0' }}>
                {b.name ?? '（没留名字）'} · {b.what === 'club' ? '不能发起、参加组局' : '不能改个人主页和名片'} · {b.banned_by} {fmtDateTime(b.banned_at)}{b.reason ? ` · ${b.reason}` : ''}
                <button className={`${styles.btn} ${styles.btnGhost}`} style={{ marginLeft: 8 }} onClick={() => unban(b)}>解除</button>
              </li>
            ))}
          </ul>
          <p className={styles.small}>禁止上传照片的人在「相册」页里管。</p>
        </div>
      )}
      <p className={styles.small} style={{ marginTop: 24 }}>
        电子名片、相册照片逐条翻看（含 1.3.4 以前版本上传、等放行的照片）：<Link href="/zh/staff/cards" style={{ textDecoration: 'underline' }}>名片和照片</Link>
      </p>
      <Lightbox url={big} onClose={() => setBig(null)} />
      <Toast m={msg} onClose={() => setMsg(null)} />
    </>
  );
}

export default function Page() {
  return (
    <StaffGate role="ops" title="内容管理" wide>
      {() => <Content />}
    </StaffGate>
  );
}
