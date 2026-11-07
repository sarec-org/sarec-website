'use client';
/**
 * 活动回顾（1.3 J）：活动结束后系统自动整理好，助理在这里一次审核。
 *  1. 打开这一页（列表里点那场活动）
 *  2. 看一眼精选照片、改改文字 → 点“审核通过并发布”（网站回顾 + 小程序相册，并通知到场的人）
 *  3. 服务号推文点“复制”，到公众号后台粘贴发布
 * AI 只写初稿；不审核不会发布。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, copyText, fmtDateTime } from '@/components/crm/client';

type Stats = { registered: number; arrived: number; companions: number; newPeople: number; staffPhotos: number; guestPhotos: number; referrers: { name: string; brought: number }[] };
type Item = { event_id: string; title: string; starts_at: string; status: string; drafted_by: string; drafted_at: string; published_at: string | null; stats: Stats };
type Detail = Item & {
  slug: string; picks: string[] | null; photo_groups: { pick: string; members: string[] }[]; recap_draft: string; share_draft: string; oa_draft: string; thanks_draft: string | null;
  needs: { count: number; items: { name: string | null; need: string; status: string }[] }; next_recs: { slug: string; title: string; n: number } | null;
  pickPhotos: { id: string; thumb_url: string; url: string; by_customer: boolean }[];
};

export default function StaffRecaps() {
  const [list, setList] = useState<Item[] | null>(null);
  const [cur, setCur] = useState<Detail | null>(null);
  const [form, setForm] = useState({ recap: '', share: '', oa: '', thanks: '' });
  const [picks, setPicks] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ recaps: Item[] }>('/api/v1/staff/recaps');
    if (r.ok) setList(r.data.recaps);
    else setMsg({ ok: false, text: r.message });
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function open(id: string) {
    const r = await api<{ recap: Detail }>(`/api/v1/staff/recaps/${id}`);
    if (!r.ok || !r.data.recap) return setMsg({ ok: false, text: r.ok ? '还没有生成' : r.message });
    const d = r.data.recap;
    setCur(d);
    setPicks(d.picks ?? []);
    setForm({ recap: d.recap_draft ?? '', share: d.share_draft ?? '', oa: d.oa_draft ?? '', thanks: d.thanks_draft ?? '' });
  }
  async function publish() {
    if (!cur || busy) return;
    setBusy(true);
    const r = await api<{ notices: { sent: number; home: number } | null }>(`/api/v1/staff/recaps/${cur.event_id}`, { body: { ...form, picks } });
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: `已发布：网站回顾已更新${r.data.notices ? `，相册已发布并通知 ${r.data.notices.sent + r.data.notices.home} 人` : ''}。服务号推文请点“复制”后到公众号后台发。` } : { ok: false, text: r.message });
    load();
    open(cur.event_id);
  }
  const togglePick = (id: string) => setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return (
    <StaffGate title="活动回顾" role="ops">
      {() => (
        <>
          <div className={styles.notice}>活动结束 2 小时后，系统自动整理：签到和照片汇总、相似照片分组和精选建议、回顾文章 / 分享文案 / 服务号推文初稿、需求汇总和跟进任务、给到场的人推荐下一场。<strong>只有您在这里点“审核通过并发布”才会发布。</strong></div>
          <Msg m={msg} />
          {!cur && (
            <>
              {list?.map((x) => (
                <div key={x.event_id} className={styles.card} style={{ cursor: 'pointer' }} onClick={() => open(x.event_id)}>
                  <p className={styles.cardTitle}>{x.title} <span className={styles.badge}>{x.status === 'published' ? '已发布' : '待审核'}</span></p>
                  <p className={styles.small} style={{ margin: 0 }}>{fmtDateTime(x.starts_at)} · 报名 {x.stats?.registered ?? 0} · 到场 {x.stats?.arrived ?? 0} · 照片 {(x.stats?.staffPhotos ?? 0) + (x.stats?.guestPhotos ?? 0)} · 初稿：{x.drafted_by?.startsWith('ai') ? 'AI' : '模板'}</p>
                </div>
              ))}
              {list && !list.length && <p className={styles.muted}>还没有结束的活动。活动结束 2 小时后会自动出现在这里。</p>}
            </>
          )}
          {cur && (
            <>
              <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setCur(null)}>← 返回列表</button>
              <h2 className={styles.h2}>{cur.title}</h2>
              <p className={styles.small}>
                报名 {cur.stats.registered} · 到场 {cur.stats.arrived} · 带来的朋友 {cur.stats.companions} · 第一次来 {cur.stats.newPeople} · 工作人员照片 {cur.stats.staffPhotos} · 客人照片 {cur.stats.guestPhotos}
                {cur.drafted_by ? ` · 初稿：${cur.drafted_by.startsWith('ai') ? 'AI（请核对事实）' : '模板'}` : ''}
              </p>

              <h3 className={styles.h2} style={{ fontSize: '1.1rem' }}>精选照片（点一下取消 / 选中；排在相册最前）</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                {cur.pickPhotos.map((p) => (
                  <button key={p.id} onClick={() => togglePick(p.id)} style={{ padding: 0, border: picks.includes(p.id) ? '3px solid var(--gold)' : '3px solid transparent', background: 'none', opacity: picks.includes(p.id) ? 1 : 0.4 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.thumb_url} alt="精选照片" style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
              <p className={styles.small}>相似照片共 {cur.photo_groups?.length ?? 0} 组，每组只建议一张。</p>

              {(
                [
                  ['recap', '活动回顾文章（网站活动页、相册页显示）'],
                  ['share', '群聊分享文案'],
                  ['oa', '服务号推文'],
                  ['thanks', '给带人来的会员的感谢（复制后私聊发）']
                ] as [keyof typeof form, string][]
              ).map(([k, label]) => (
                <div key={k} className={styles.field}>
                  <label className={styles.label} htmlFor={`rc-${k}`}>{label}</label>
                  <textarea id={`rc-${k}`} className={styles.input} style={{ minHeight: k === 'recap' || k === 'oa' ? 200 : 90 }} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                  {k !== 'recap' && form[k] && (
                    <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={async () => setMsg({ ok: await copyText(form[k]), text: '已复制' })}>复制</button>
                  )}
                </div>
              ))}

              <h3 className={styles.h2} style={{ fontSize: '1.1rem' }}>活动中留下的需求（已生成待跟进任务）</h3>
              {cur.needs?.items?.length ? (
                cur.needs.items.map((n, i) => <p key={i} className={styles.small} style={{ margin: '4px 0' }}>{n.name ?? '—'}：{n.need || '—'}</p>)
              ) : (
                <p className={styles.small}>没有。</p>
              )}
              <p className={styles.small}><a href="/zh/staff/followups">去待跟进处理 ›</a></p>

              <h3 className={styles.h2} style={{ fontSize: '1.1rem' }}>下一场推荐</h3>
              <p className={styles.small}>{cur.next_recs ? `「${cur.next_recs.title}」：本场到场、还没报名的有 ${cur.next_recs.n} 人。发布后他们在小程序首页和相册底部会看到这场。` : '暂时没有开放报名的下一场。'}</p>

              <button className={styles.btn} style={{ marginTop: 16 }} disabled={busy || cur.status === 'published'} onClick={publish}>
                {cur.status === 'published' ? '已发布' : busy ? '发布中…' : '审核通过并发布'}
              </button>
            </>
          )}
        </>
      )}
    </StaffGate>
  );
}
