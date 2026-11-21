'use client';
/** /zh/jobs/posts/[id]：活儿详情（金色）。联系发布人：有资格显示电话（并记录谁看过）；没资格显示一句人话原因 + 下一步 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/components/crm/client';
import s from '@/components/crm/crm.module.css';
import j from './jobs.module.css';
import { ago, BottomBar, JobsShell, NeedLogin, ReportButton } from './shared';
import type { Meta, PostDetailRes, PostFull } from './types';

type ContactRes = { phone: string | null; wechat: string | null; callName: string | null; freeLeft?: number | null; freeLeftText?: string };

export function PostDetail({ id }: { id: string }) {
  const [d, setD] = useState<PostDetailRes | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [contact, setContact] = useState<ContactRes | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await api<PostDetailRes>(`/api/v1/jobs/posts/${id}`);
    if (r.ok) { setD(r.data); setErr(null); } else setErr(r.message);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const doContact = useCallback(async () => {
    setBusy(true);
    setWhy(null);
    const r = await api<ContactRes>(`/api/v1/jobs/posts/${id}/contact`, { method: 'POST' });
    setBusy(false);
    if (r.ok) { setNeedLogin(false); return setContact(r.data); }
    if (r.status === 401) return setNeedLogin(true);
    setNeedLogin(false);
    setWhy(r.message);
    load();
  }, [id, load]);

  const p = d?.post;
  const open = p?.status === 'open';
  return (
    <JobsShell
      side="work"
      need="either"
      back={{ href: '/zh/jobs/posts', label: '‹ 全部活儿' }}
      eyebrow="我要接活儿"
      footer={() =>
        p && !p.mine && open && !contact && !needLogin ? (
          <BottomBar>
            <button type="button" className={`${s.btn} ${j.btnWork}`} disabled={busy} onClick={doContact}>{busy ? '正在查看…' : '联系发布人'}</button>
          </BottomBar>
        ) : null
      }
    >
      {(meta) => (
        <>
          {err && <div className={s.error}>{err} <Link href="/zh/jobs/posts" style={{ color: 'var(--gold)' }}>看别的活儿 ›</Link></div>}
          {!d && !err && <p className={s.muted}>正在加载…</p>}
          {p && <Body p={p} />}
          {p && (
            <div id="contact" style={{ scrollMarginTop: 120 }}>
              {p.mine && (
                <div className={s.notice}>这是你自己发的活儿。<Link href="/zh/jobs/my-posts" style={{ color: 'var(--gold)' }}>去「我发的活儿」改、关、续期，看谁联系过 ›</Link></div>
              )}
              {!open && !p.mine && <div className={s.notice}>这条活儿{p.statusLabel}，不能再联系了。看看<Link href="/zh/jobs/posts" style={{ color: 'var(--gold)' }}>别的活儿 ›</Link></div>}
              {contact && (
                <div className={j.phoneBox} style={{ borderColor: 'var(--gold)' }}>
                  {contact.callName ? `${contact.callName} · ` : ''}电话：{contact.phone ? <a href={`tel:${contact.phone}`}>{contact.phone}</a> : '（发布人没留电话）'}
                  {contact.wechat && <><br />微信：<span className={s.mono}>{contact.wechat}</span></>}
                  {contact.freeLeft != null && <p className={s.small} style={{ margin: '0.3rem 0 0' }}><b>{contact.freeLeftText ?? `还可以免费联系 ${contact.freeLeft} 位`}</b>（这条以后再看不再算次数）</p>}
                  <p className={s.small} style={{ margin: '0.3rem 0 0' }}>发布人能看到是你看了电话。请只在执照范围内接活儿，价钱、合同、付款自己和对方谈清楚。</p>
                </div>
              )}
              {!contact && !needLogin && open && !p.mine && d?.canContact && d.freeLeft != null && (
                <p className={s.small}>你还可以免费联系 {d.freeLeft} 位发布人；看这一条会用掉 1 次（看过的再看不算）。</p>
              )}
              {needLogin && <NeedLogin why="登录后才能联系发布人（用邮箱或手机收验证码，不用密码）。" onDone={doContact} />}
              {!contact && !needLogin && open && !p.mine && (why || (d && !d.canContact && d.reasonCode !== 'unauthorized')) && (
                <div className={s.notice}>
                  {why ?? d?.reason}
                  <WhyNext meta={meta} needPay={!!d?.needPay} />
                </div>
              )}
            </div>
          )}
          {p && <div style={{ marginTop: '0.8rem' }}><ReportButton targetType="post" targetId={p.id} label="反馈 / 投诉这条活儿" /></div>}
        </>
      )}
    </JobsShell>
  );
}

/** 没资格时给出路：没登记 → 去登记；不是会员 → 去交会费；其它 → 看我的接活儿 */
function WhyNext({ meta, needPay }: { meta: Meta; needPay: boolean }) {
  const pro = meta.me.pro;
  const a = { color: 'var(--gold)' };
  if (!pro) return <p style={{ margin: '0.5rem 0 0' }}><Link href="/zh/jobs/register" style={a}>去登记接活儿 ›</Link></p>;
  if (needPay || pro.needPay) return <p style={{ margin: '0.5rem 0 0' }}><Link href="/zh/join" style={a}>成为商会会员 ›</Link></p>;
  return <p style={{ margin: '0.5rem 0 0' }}><Link href="/zh/jobs/mine" style={a}>看我的接活儿和核验状态 ›</Link></p>;
}

function Body({ p }: { p: PostFull }) {
  const rows: [string, string | null | undefined][] = [
    ['什么活', p.tradeName],
    ['城市', p.city],
    ['什么时候要', p.timingLabel],
    ['发布人', p.posterLabel],
    ['预算', p.budget],
    ['房屋类型', p.propertyTypeLabel],
    ['要几个人', p.crew?.headcount ? `${p.crew.headcount} 人` : null],
    ['干多久', p.crew?.duration],
    ['日薪 / 时薪', p.crew?.pay],
    ['看现场', p.wantSiteVisit ? '想先找人看现场' : null],
    ['状态', p.statusLabel],
    ['发布时间', ago(p.createdAt)]
  ];
  return (
    <>
      <h1 className={s.h1}>{p.title}</h1>
      {p.description && <p style={{ whiteSpace: 'pre-wrap', color: 'var(--ivory-warm)' }}>{p.description}</p>}
      {p.voiceUrl && <audio src={p.voiceUrl} controls style={{ width: '100%', margin: '0 0 1rem' }} />}
      {p.photos.length > 0 && (
        <div className={j.photos} style={{ marginBottom: '1rem' }}>
          {p.photos.map((u) => (
            <a key={u} href={u} target="_blank" rel="noreferrer" className={j.photo}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="现场照片" />
            </a>
          ))}
        </div>
      )}
      <div className={s.card} style={{ borderLeft: '3px solid var(--gold)' }}>
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className={s.row}><span className={s.rowLabel}>{k}</span><span className={s.rowValue}>{v}</span></div>
        ))}
      </div>
      <p className={s.small}>完整地址不公开，联系上以后再和发布人确认。</p>
    </>
  );
}
