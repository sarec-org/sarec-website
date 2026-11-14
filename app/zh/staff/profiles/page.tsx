'use client';
/**
 * 1.5.0 主页审核（运营）：会员在小程序「我的名片 → 我的主页」里写的个人简介、公司介绍、项目 / 案例。
 * - 有图片的项目一律先审后发；文字没通过微信检测（或检测接口不通）的也先在这里等放行。
 * - 简介和公司介绍：放行 / 下架；项目：放行 / 退回（本人可以改了再交）/ 下架。
 * - 禁止某人修改个人主页（可解除），都有记录。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';
import { findContactByNo, Lightbox, Toast } from '@/components/crm/staff/ugcShared';

type Text = { contact_id: string; name: string | null; member_no: number | null; bio: string | null; company_intro: string | null; offers: string[]; seeks: string[]; profile_status: string; updated_at: string };
type Project = { id: string; contact_id: string; name: string | null; member_no: number | null; title: string; body: string | null; images: string[]; status: string; reviewed_by: string | null; reviewed_at: string | null; updated_at: string };
type Ban = { contact_id: string; name: string | null; reason: string | null; banned_by: string; banned_at: string };
type Data = { texts: Text[]; projects: Project[]; bans: Ban[]; pending: number };
type Filter = 'pending' | 'all' | 'taken_down';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'pending', label: '待审核' },
  { key: 'all', label: '全部' },
  { key: 'taken_down', label: '已下架' }
];
const ST: Record<string, { t: string; c: string }> = {
  ok: { t: '已上线', c: styles.badgeGreen },
  pending: { t: '待审核', c: styles.badgeRed },
  rejected: { t: '已退回', c: styles.badgeMuted },
  taken_down: { t: '已下架', c: styles.badgeMuted }
};
const who = (x: { name: string | null; member_no: number | null }) => `${x.name ?? 'SAREC 用户'}${x.member_no ? `（会员号 ${x.member_no}）` : ''}`;

function Profiles() {
  const [filter, setFilter] = useState<Filter>('pending');
  const [d, setD] = useState<Data | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const closeMsg = useCallback(() => setMsg(null), []);
  const [busy, setBusy] = useState('');
  const [big, setBig] = useState<string | null>(null);
  const [banNo, setBanNo] = useState('');
  const [banReason, setBanReason] = useState('');

  const load = useCallback(async () => {
    const r = await api<Data>(`/api/v1/staff/profiles?filter=${filter}`);
    if (r.ok) setD(r.data); else setMsg({ ok: false, text: r.message });
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  async function act(action: string, id: string, label: string, extra: Record<string, unknown> = {}) {
    setBusy(action + id);
    const r = await api<{ message: string }>('/api/v1/staff/profiles', { body: { action, id, ...extra } });
    setBusy('');
    setMsg(r.ok ? { ok: true, text: `${r.data.message}：${label}` } : { ok: false, text: r.message });
    if (r.ok) load();
    return r.ok;
  }
  async function banByNo() {
    setMsg(null);
    const c = await findContactByNo(banNo);
    if (!c.ok) return setMsg({ ok: false, text: c.message });
    if (await act('ban', c.id, c.name, { reason: banReason })) { setBanNo(''); setBanReason(''); }
  }

  const banned = new Set(d?.bans.map((b) => b.contact_id) ?? []);
  const banBtn = (cid: string, x: { name: string | null; member_no: number | null }) =>
    banned.has(cid)
      ? <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} disabled={!!busy} onClick={() => act('unban', cid, who(x))}>解除禁止</button>
      : <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} disabled={!!busy} onClick={() => act('ban', cid, who(x))}>禁止此人修改主页</button>;

  return (
    <>
      <div className={styles.notice}>
        <strong>有图片的项目一律先审后发</strong>（微信图片检测还没配好），<strong>文字检测没通过的</strong>（或检测接口一时不通的）个人简介、公司介绍、项目也在这里等放行。
        放行后别人才看得到；本人自己一直看得到自己写的。
      </div>
      <div className={styles.tabs} role="tablist" aria-label="审核状态">
        {FILTERS.map((f) => (
          <button key={f.key} role="tab" aria-selected={filter === f.key} className={`${styles.tab} ${filter === f.key ? styles.tabOn : ''}`} onClick={() => { setFilter(f.key); setMsg(null); }}>
            {f.label}{f.key === 'pending' && d ? `（${d.pending}）` : ''}
          </button>
        ))}
      </div>
      <Toast m={msg} onClose={closeMsg} />
      {!d && <p className={styles.muted}>正在加载…</p>}
      {d && (
        <>
          <h2 className={styles.h}>个人简介和公司介绍（{d.texts.length}）</h2>
          {d.texts.length === 0 && <p className={styles.small}>{filter === 'pending' ? '没有待审核的简介。' : '没有。'}</p>}
          {d.texts.map((x) => (
            <div key={x.contact_id} className={`${styles.card} ${x.profile_status === 'pending' ? styles.cardGold : ''}`}>
              <p className={styles.cardTitle}>{who(x)}<span className={`${styles.badge} ${ST[x.profile_status]?.c ?? ''}`}>{ST[x.profile_status]?.t ?? x.profile_status}</span></p>
              {x.bio && <p style={{ margin: '0.3rem 0', whiteSpace: 'pre-wrap' }}><span className={styles.small}>个人简介：</span>{x.bio}</p>}
              {x.company_intro && <p style={{ margin: '0.3rem 0', whiteSpace: 'pre-wrap' }}><span className={styles.small}>公司介绍：</span>{x.company_intro}</p>}
              {(x.offers.length > 0 || x.seeks.length > 0) && (
                <p className={styles.small} style={{ margin: '0.3rem 0' }}>我能提供：{x.offers.join('、') || '—'}；我在找：{x.seeks.join('、') || '—'}（从固定标签里选的，不用审）</p>
              )}
              <p className={styles.small} style={{ margin: '0.3rem 0' }}>最后修改：{fmtDateTime(x.updated_at)}</p>
              <div className={styles.btnRow}>
                {x.profile_status !== 'ok' && <button className={`${styles.btn} ${styles.btnSmall}`} disabled={!!busy} onClick={() => act('approve_text', x.contact_id, `${who(x)}的简介`)}>放行</button>}
                {x.profile_status !== 'taken_down' && <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} disabled={!!busy} onClick={() => act('take_down_text', x.contact_id, `${who(x)}的简介`)}>下架</button>}
                {banBtn(x.contact_id, x)}
              </div>
            </div>
          ))}

          <h2 className={styles.h}>项目 / 案例（{d.projects.length}）</h2>
          {d.projects.length === 0 && <p className={styles.small}>{filter === 'pending' ? '没有待审核的项目。' : '没有。'}</p>}
          {d.projects.map((p) => (
            <div key={p.id} className={`${styles.card} ${p.status === 'pending' ? styles.cardGold : ''}`}>
              <p className={styles.cardTitle}>{p.title}<span className={`${styles.badge} ${ST[p.status]?.c ?? ''}`}>{ST[p.status]?.t ?? p.status}</span></p>
              <p className={styles.small} style={{ margin: '0 0 0.3rem' }}>{who(p)} · 最后修改 {fmtDateTime(p.updated_at)}{p.reviewed_by ? ` · ${p.reviewed_by} 审过` : ''}</p>
              {p.body && <p style={{ margin: '0.3rem 0', whiteSpace: 'pre-wrap' }}>{p.body}</p>}
              {p.images.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8, margin: '0.5rem 0' }}>
                  {p.images.map((u) => (
                    <button key={u} onClick={() => setBig(u)} aria-label="看大图" style={{ padding: 0, border: '1px solid var(--line-3)', background: 'none', cursor: 'zoom-in', minHeight: 44 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt={`${p.title} 的图片`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                    </button>
                  ))}
                </div>
              )}
              {p.images.length > 0 && <p className={styles.small} style={{ margin: 0 }}>点图片看大图。</p>}
              <div className={styles.btnRow} style={{ marginTop: '0.6rem' }}>
                {p.status !== 'ok' && <button className={`${styles.btn} ${styles.btnSmall}`} disabled={!!busy} onClick={() => act('approve_project', p.id, `「${p.title}」`)}>放行</button>}
                {p.status === 'pending' && <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} disabled={!!busy} onClick={() => act('reject_project', p.id, `「${p.title}」`)}>退回</button>}
                {p.status !== 'taken_down' && <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} disabled={!!busy} onClick={() => act('take_down_project', p.id, `「${p.title}」`)}>下架</button>}
                {banBtn(p.contact_id, p)}
              </div>
            </div>
          ))}

          <h2 className={styles.h}>禁止修改个人主页的人（{d.bans.length}）</h2>
          <div className={styles.card}>
            <p className={styles.small} style={{ marginTop: 0 }}>被禁止的人不能再改个人简介、公司介绍和项目（已经上线的内容不受影响，需要的话单独下架）。</p>
            <div className={styles.inputRow}>
              <input className={styles.input} inputMode="numeric" placeholder="会员号，例如 1024" aria-label="要禁止的会员号" value={banNo} onChange={(e) => setBanNo(e.target.value.replace(/\D/g, ''))} />
              <input className={styles.input} placeholder="理由（可不填）" aria-label="禁止理由" value={banReason} onChange={(e) => setBanReason(e.target.value)} />
              <button className={`${styles.btn} ${styles.btnDanger}`} disabled={!banNo || !!busy} onClick={banByNo}>按会员号禁止</button>
            </div>
            {d.bans.length === 0 ? <p className={styles.small}>现在没有被禁止的人。</p> : (
              <ul className={styles.list}>
                {d.bans.map((b) => (
                  <li key={b.contact_id} className={styles.listItem}>
                    <div>{b.name ?? 'SAREC 用户'}{b.reason ? ` · 理由：${b.reason}` : ''}</div>
                    <div className={styles.small}>{b.banned_by} 于 {fmtDateTime(b.banned_at)} 禁止</div>
                    <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} style={{ marginTop: 6 }} disabled={!!busy} onClick={() => act('unban', b.contact_id, b.name ?? '此人')}>解除</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
      <Lightbox url={big} onClose={() => setBig(null)} />
    </>
  );
}

export default function Page() {
  return (
    <StaffGate role="ops" title="主页审核" wide>
      {() => <Profiles />}
    </StaffGate>
  );
}
