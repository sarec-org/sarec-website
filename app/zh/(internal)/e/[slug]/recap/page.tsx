/**
 * 1.3.1 G5：网站活动回顾页（每场活动一页）——/zh/e/<slug>/recap
 * 照片墙（从小程序相册同步，只显示已发布的）+ 视频（YouTube 嵌入；视频号给链接）+ 回顾文字（后台审核发布过的回顾）+ 下一场报名入口。
 * 结构化标记完整（Event + ImageGallery + Article + 面包屑），让搜索和 AI 能抓到。
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPool } from '@/lib/db/client';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

type Ev = {
  id: string; slug: string; title: string; summary: string | null; starts_at: Date; ends_at: Date | null; timezone: string;
  location_name: string | null; address: string | null; cover_url: string | null; video_url: string | null; album_published_at: Date | null; event_status: string;
};

async function load(slug: string) {
  const pool = getPool();
  const { rows } = await pool.query<Ev>(
    `SELECT id, slug, title, summary, starts_at, ends_at, timezone, location_name, address, cover_url, video_url, album_published_at, event_status
       FROM events WHERE slug = $1 AND is_listed AND event_status <> 'cancelled'`,
    [slug]
  ).catch(async () => pool.query<Ev>(
    `SELECT id, slug, title, summary, starts_at, ends_at, timezone, location_name, address, cover_url, NULL AS video_url, album_published_at, event_status
       FROM events WHERE slug = $1 AND is_listed AND event_status <> 'cancelled'`,
    [slug]
  ));
  const e = rows[0];
  if (!e) return null;
  // 1.4.0：上传即公开，不再等“发布”
  const { rows: photos } = await pool.query<{ url: string; thumb_url: string; caption: string | null }>(
    `SELECT url, thumb_url, NULL AS caption FROM event_photos
      WHERE event_id = $1 AND NOT is_hidden AND coalesce(visibility, 'album') = 'album' AND variant_of IS NULL AND coalesce(review_status, 'ok') = 'ok'
      ORDER BY sort_order, created_at LIMIT 60`,
    [e.id]
  );
  const { rows: rc } = await pool.query<{ text: string | null }>(
    `SELECT recap_draft AS text FROM event_recaps WHERE event_id = $1 AND status = 'published'`,
    [e.id]
  ).catch(() => ({ rows: [] as { text: string | null }[] }));
  const { rows: next } = await pool.query<{ slug: string; title: string; starts_at: Date; timezone: string; location_name: string | null }>(
    `SELECT slug, title, starts_at, timezone, location_name FROM events
      WHERE is_listed AND event_status = 'scheduled' AND starts_at > now() ORDER BY starts_at LIMIT 1`
  );
  return { e, photos, recap: rc[0]?.text ?? null, next: next[0] ?? null };
}

const fmt = (d: Date, tz: string) =>
  new Intl.DateTimeFormat('zh-CN', { timeZone: tz || 'America/Los_Angeles', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(d));

function youtubeId(u: string | null): string | null {
  if (!u) return null;
  const m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const d = await load(decodeURIComponent(params.slug));
  if (!d) return { title: '活动回顾｜SAREC 中美房地产商会' };
  const desc = (d.e.summary ?? d.recap ?? '').replace(/\s+/g, ' ').slice(0, 150) || `${d.e.title} 活动回顾：现场照片与内容摘要。`;
  const img = d.photos[0]?.url ?? d.e.cover_url ?? `${SITE_URL}/images/la/la-skyline-marquee.jpg`;
  return {
    title: `${d.e.title} · 活动回顾｜SAREC 中美房地产商会`,
    description: desc,
    alternates: { canonical: `${SITE_URL}/zh/e/${d.e.slug}/recap` },
    openGraph: { title: `${d.e.title} · 活动回顾`, description: desc, images: [img], type: 'article', url: `${SITE_URL}/zh/e/${d.e.slug}/recap` }
  };
}

export default async function Recap({ params }: { params: { slug: string } }) {
  const d = await load(decodeURIComponent(params.slug));
  if (!d) notFound();
  const { e, photos, recap, next } = d;
  const url = `${SITE_URL}/zh/e/${e.slug}/recap`;
  const yt = youtubeId(e.video_url);
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: e.title,
      description: e.summary ?? undefined,
      startDate: new Date(e.starts_at).toISOString(),
      endDate: e.ends_at ? new Date(e.ends_at).toISOString() : undefined,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: { '@type': 'Place', name: e.location_name ?? 'SAREC', address: e.address ?? undefined },
      organizer: { '@type': 'Organization', name: 'SAREC 中美房地产商会', url: SITE_URL },
      image: photos.slice(0, 5).map((p) => p.url),
      url
    },
    photos.length
      ? { '@context': 'https://schema.org', '@type': 'ImageGallery', name: `${e.title} 现场照片`, url, image: photos.map((p) => ({ '@type': 'ImageObject', contentUrl: p.url, thumbnailUrl: p.thumb_url })) }
      : null,
    recap
      ? { '@context': 'https://schema.org', '@type': 'Article', headline: `${e.title} · 活动回顾`, articleBody: recap, datePublished: new Date(e.ends_at ?? e.starts_at).toISOString(), author: { '@type': 'Organization', name: 'SAREC 中美房地产商会' }, publisher: { '@type': 'Organization', name: 'SAREC 中美房地产商会' }, mainEntityOfPage: url, image: photos[0]?.url }
      : null,
    yt ? { '@context': 'https://schema.org', '@type': 'VideoObject', name: `${e.title} 活动视频`, embedUrl: `https://www.youtube.com/embed/${yt}`, thumbnailUrl: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`, uploadDate: new Date(e.ends_at ?? e.starts_at).toISOString(), description: e.summary ?? e.title } : null,
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '首页', item: `${SITE_URL}/zh` },
        { '@type': 'ListItem', position: 2, name: '活动', item: `${SITE_URL}/zh/events` },
        { '@type': 'ListItem', position: 3, name: `${e.title} · 回顾`, item: url }
      ]
    }
  ].filter(Boolean);

  return (
    <main style={{ maxWidth: 1080, margin: '0 auto', padding: '96px 20px 64px', color: '#F2EAD6' }}>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <p style={{ color: '#C9A567', letterSpacing: 3, fontSize: 14, margin: 0 }}>活动回顾 · RECAP</p>
      <h1 style={{ fontFamily: "'Songti SC','Noto Serif SC',serif", fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1.25, margin: '12px 0 8px' }}>{e.title}</h1>
      <p style={{ opacity: 0.75, margin: 0 }}>{fmt(e.starts_at, e.timezone)}{e.location_name ? ` · ${e.location_name}` : ''}</p>

      {photos.length > 0 && (
        <section aria-label="现场照片" style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 22, borderLeft: '3px solid #C9A567', paddingLeft: 10 }}>现场照片（{photos.length} 张）</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginTop: 12 }}>
            {photos.map((p, i) => (
              <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', aspectRatio: '4 / 3', overflow: 'hidden', borderRadius: 8, background: '#0B1A28' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb_url} alt={`${e.title} 现场照片 ${i + 1}`} loading={i < 6 ? 'eager' : 'lazy'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </a>
            ))}
          </div>
          <p style={{ fontSize: 14, opacity: 0.7 }}>
            <Link href={`/zh/album/${encodeURIComponent(e.slug)}`} style={{ color: '#C9A567' }}>打开完整相册 ›</Link>
          </p>
        </section>
      )}

      {e.video_url && (
        <section aria-label="活动视频" style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 22, borderLeft: '3px solid #C9A567', paddingLeft: 10 }}>活动视频</h2>
          {yt ? (
            <div style={{ position: 'relative', paddingTop: '56.25%', marginTop: 12, borderRadius: 12, overflow: 'hidden' }}>
              <iframe src={`https://www.youtube.com/embed/${yt}`} title={`${e.title} 活动视频`} allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
            </div>
          ) : (
            <p><a href={e.video_url} target="_blank" rel="noopener noreferrer" style={{ color: '#C9A567' }}>在视频号观看 ›</a></p>
          )}
        </section>
      )}

      {recap && (
        <section aria-label="回顾" style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 22, borderLeft: '3px solid #C9A567', paddingLeft: 10 }}>内容回顾</h2>
          {recap.split(/\n{2,}/).map((para, i) => <p key={i} style={{ lineHeight: 1.85, opacity: 0.9 }}>{para}</p>)}
        </section>
      )}

      {!photos.length && !recap && !e.video_url && <p style={{ marginTop: 32, opacity: 0.8 }}>这场活动的照片和回顾整理好后会放在这里。</p>}

      <section aria-label="下一场" style={{ marginTop: 40, padding: 24, borderRadius: 16, background: 'rgba(201,165,103,0.1)', border: '1px solid rgba(201,165,103,0.4)' }}>
        {next ? (
          <>
            <p style={{ color: '#C9A567', margin: 0, fontSize: 14 }}>下一场活动</p>
            <p style={{ fontSize: 22, margin: '6px 0' }}>{next.title}</p>
            <p style={{ opacity: 0.8, margin: '0 0 12px' }}>{fmt(next.starts_at, next.timezone)}{next.location_name ? ` · ${next.location_name}` : ''}</p>
            <Link href={`/zh/e/${encodeURIComponent(next.slug)}`} style={{ display: 'inline-block', padding: '10px 22px', borderRadius: 8, background: '#C9A567', color: '#0F1F33', fontWeight: 700, textDecoration: 'none' }}>报名下一场</Link>
          </>
        ) : (
          <>
            <p style={{ fontSize: 20, margin: '0 0 8px' }}>下一场活动即将公布</p>
            <Link href="/zh/events" style={{ color: '#C9A567' }}>看看活动日历 ›</Link>
          </>
        )}
      </section>
    </main>
  );
}
