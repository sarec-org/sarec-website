import type { Metadata } from 'next';
import { rosterByToken } from '@/lib/crm/roster';
import s from '@/components/crm/crm.module.css';

export const metadata: Metadata = { title: '本场电子名册｜SAREC', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** 1.3 M：私企面对面会后电子名册（凭邮件里的链接打开；只含本人同意公开的联系方式） */
export default async function RosterPage({ params }: { params: { token: string } }) {
  const r = await rosterByToken(params.token).catch(() => null);
  if (!r) return <div className={s.page}><p className={s.lead}>找不到这份名册，或链接已失效。</p></div>;
  return (
    <div className={s.page}>
      <p className={s.eyebrow}>ROSTER · 本场电子名册</p>
      <h1 className={s.h1}>{r.title}</h1>
      <p className={s.small}>只发给本场参与者，请勿外传。联系方式由本人在电子名片里选择是否公开。</p>
      {r.entries.map((e, i) => (
        <div key={i} className={s.card} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          {e.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.avatarUrl} alt="" width={64} height={64} style={{ width: 64, height: 64, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 64, height: 64, background: 'var(--ink-2)', flexShrink: 0 }} />
          )}
          <div style={{ minWidth: 0 }}>
            <p className={s.cardTitle} style={{ margin: 0 }}>{e.name}</p>
            <p className={s.small} style={{ margin: '2px 0' }}>{[e.company, e.title].filter(Boolean).join(' · ')}</p>
            {e.intro && <p style={{ margin: '6px 0' }}>{e.intro}</p>}
            <p className={s.small} style={{ margin: 0 }}>
              {[e.phone && `电话 ${e.phone}`, e.email && `邮箱 ${e.email}`, e.wechatId && `微信 ${e.wechatId}`].filter(Boolean).join(' · ') || '未公开联系方式'}
            </p>
          </div>
        </div>
      ))}
      {!r.entries.length && <p className={s.muted}>名册还是空的。</p>}
    </div>
  );
}
