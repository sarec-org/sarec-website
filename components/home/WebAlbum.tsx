'use client';
/** 网站活动相册：已发布的现场照片 + 底部下一场报名 + 加商会微信（与小程序同一份数据） */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import s from '@/components/crm/crm.module.css';
import d from './desk.module.css';
import { WechatSheet, dayLabel, trackWeb } from './HomeDesk';

type Data = {
  event: { slug: string; title: string; startsAt: string; recap: string | null; published: boolean };
  photos: { id: string; url: string; thumb: string; caption: string | null }[];
  next: { slug: string; title: string; startsAt: string; locationName: string | null } | null;
};

export function WebAlbum({ slug }: { slug: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  const [big, setBig] = useState<string | null>(null);
  const [wechat, setWechat] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    trackWeb('album_open', slug);
    fetch(`/api/v1/events/${encodeURIComponent(slug)}/album`, { credentials: 'same-origin' }).then((r) => r.json()).then((j) => (j.ok ? setData(j) : setErr(j.error?.message ?? '加载失败'))).catch(() => setErr('网络不稳定，请刷新重试'));
    fetch('/api/v1/meta').then((r) => r.json()).then((j) => j.ok && setQr(j.wechatQr)).catch(() => undefined);
  }, [slug]);
  if (err) return <div className={s.page}><p className={s.error}>{err}</p></div>;
  if (!data) return <div className={s.page}><p className={s.small}>加载中…</p></div>;
  return (
    <div className={`${s.page} ${s.pageWide}`}>
      <p className={s.eyebrow}>ALBUM · 活动相册</p>
      <h1 className={s.h1}>{data.event.title}</h1>
      <p className={s.muted}>{dayLabel(data.event.startsAt)}{data.event.recap ? ` · ${data.event.recap}` : ''}</p>
      {!data.event.published || !data.photos.length ? (
        <p className={s.notice}>现场照片整理中，上传后会通知参加活动的会员。</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, margin: '1rem 0' }}>
          {data.photos.map((p) => (
            <button key={p.id} onClick={() => setBig(p.url)} style={{ padding: 0, border: 0, background: '#102234', cursor: 'zoom-in' }} aria-label="查看大图">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumb} alt={p.caption ?? '活动现场'} loading="lazy" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
            </button>
          ))}
        </div>
      )}
      {data.next && (
        <div className={`${s.card} ${s.cardGold}`}>
          <p className={s.small} style={{ margin: 0 }}>下一场 · {dayLabel(data.next.startsAt)}</p>
          <p className={s.cardTitle}>{data.next.title}</p>
          <Link className={`${s.btn} ${s.btnBlock}`} href={`/zh/e/${encodeURIComponent(data.next.slug)}`}>报名下一场</Link>
        </div>
      )}
      <button className={`${s.btn} ${s.btnGhost} ${s.btnBlock}`} onClick={() => setWechat(true)}>加商会微信</button>
      {big && (
        <div className={d.sheetMask} onClick={() => setBig(null)} role="presentation">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={big} alt="活动现场大图" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }} />
        </div>
      )}
      {wechat && <WechatSheet qr={qr} onClose={() => setWechat(false)} />}
    </div>
  );
}
