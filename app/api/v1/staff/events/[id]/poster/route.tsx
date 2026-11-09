/**
 * 补充 3（东哥 11/8 21:05）：活动保存后自动出 3 款海报，后台 / 工作台一键下载，不需要再改任何东西。
 * GET ?size=moments（朋友圈竖版 1080×1920）| square（群聊方版 1080×1080）| oa（公众号横版 900×500）[&inline=1]
 * 风格同首页轮播：藏蓝渐变压在封面图上、宋体大标题、香槟金点缀、底部小程序码 + 日期地点。没传封面用该活动类型的默认图库。
 * 海报上不写金额和“已报 N 人”。
 */
import { ImageResponse } from 'next/og';
import QRCode from 'qrcode';
import { getPool } from '@/lib/db/client';
import { staffCan, staffFor } from '@/lib/crm/auth';
import { CrmError } from '@/lib/crm/events';
import { handler, requireContact } from '@/lib/crm/http';
import { eventRegisterCode, wxConfigured } from '@/lib/crm/wechat';
import { clock, defaultCover, fullDate } from '@/lib/crm/home131';
import { tzLabel } from '@/lib/crm/regions';
import { dataUri, ogFonts } from '@/lib/og/fonts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIZES = { moments: [1080, 1920], square: [1080, 1080], oa: [900, 500] } as const;
const NAVY = '#0F1F33';
const GOLD = '#C9A567';
const IVORY = '#F2EAD6';
const TYPE: Record<string, string> = { lecture: '公开讲座', face: '企业家圆桌', summit: '高峰论坛' };
const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://sinoamericanrec.org').replace(/\/$/, '');

export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await staffFor(await requireContact(req));
  if (!staffCan(s, 'ops') && !staffCan(s, 'checkin')) throw new CrmError('forbidden', '您没有这个操作的权限，请联系管理员开通');
  const sp = new URL(req.url).searchParams;
  const size = (sp.get('size') ?? 'moments') as keyof typeof SIZES;
  if (!SIZES[size]) throw new CrmError('bad_request', '海报尺寸不对');
  const { rows } = await getPool().query<{ id: string; slug: string; title: string; summary: string | null; starts_at: Date; timezone: string; location_name: string | null; address: string | null; cover_url: string | null; region: string | null; template_key: string | null }>(
    `SELECT e.id, e.slug, e.title, e.summary, e.starts_at, e.timezone, e.location_name, e.address, e.cover_url, e.region,
            (SELECT p.template_key FROM event_prep p WHERE p.event_id = e.id LIMIT 1) AS template_key
       FROM events e WHERE e.id = $1`,
    [params.id]
  );
  const e = rows[0];
  if (!e) throw new CrmError('not_found', '找不到这场活动');
  const tz = e.timezone || 'America/Los_Angeles';
  const [W, H] = SIZES[size];
  const cover = await dataUri(e.cover_url ? (e.cover_url.startsWith('http') ? e.cover_url : SITE() + e.cover_url) : `${SITE()}/_next/image?url=${encodeURIComponent(defaultCover(e.template_key, e.id))}&w=1200&q=80`);
  const code = wxConfigured() ? await eventRegisterCode(e.slug) : await QRCode.toBuffer(`SAREC-TEST:pages/event/event?slug=${e.slug}`, { margin: 1, width: 400 });
  const qr = `data:image/png;base64,${code.toString('base64')}`;
  const when = `${fullDate(e.starts_at, tz)} ${clock(e.starts_at, tz)}（${tzLabel(tz)}）`;
  const eyebrow = `SAREC 中美房地产商会 · ${TYPE[e.template_key ?? ''] ?? '活动'}`;
  const place = [e.location_name, e.address].filter(Boolean).join(' · ');
  const summary = (e.summary ?? '').split(/\n+/)[0]?.slice(0, 60) ?? '';
  const fonts = await ogFonts([eyebrow, e.title, when, place, summary, '微信扫码报名中美房地产商会'].join(''));

  const big = size === 'moments';
  const wide = size === 'oa';
  const titleSize = big ? 92 : wide ? 46 : 70;
  const qrSize = big ? 240 : wide ? 150 : 200;

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', background: NAVY, fontFamily: 'Sans' }}>
        {cover ? <img src={cover} width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, objectFit: 'cover' }} /> : null}
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex', background: wide ? 'linear-gradient(90deg, rgba(6,17,30,0.92) 0%, rgba(6,17,30,0.75) 55%, rgba(6,17,30,0.25) 100%)' : 'linear-gradient(180deg, rgba(6,17,30,0.15) 0%, rgba(6,17,30,0.55) 40%, rgba(6,17,30,0.95) 75%, #0B1A28 100%)' }} />
        <div style={{ position: 'absolute', left: wide ? 48 : 72, right: wide ? 300 : 72, top: wide ? 44 : big ? 120 : 72, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: big ? 32 : wide ? 20 : 26, color: GOLD, letterSpacing: 4 }}>{eyebrow}</div>
          <div style={{ display: 'flex', width: big ? 120 : 80, height: 4, background: GOLD, marginTop: big ? 28 : 16 }} />
        </div>
        <div style={{ position: 'absolute', left: wide ? 48 : 72, right: wide ? 300 : 72, bottom: wide ? 44 : big ? 140 : 72, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontFamily: 'Serif', fontWeight: 700, fontSize: titleSize, lineHeight: 1.2, color: IVORY }}>{e.title}</div>
          {summary && !wide ? <div style={{ display: 'flex', fontSize: big ? 36 : 28, color: 'rgba(242,234,214,0.82)', marginTop: big ? 28 : 18, lineHeight: 1.45 }}>{summary}</div> : null}
          <div style={{ display: 'flex', fontSize: big ? 38 : wide ? 22 : 30, color: GOLD, marginTop: big ? 48 : wide ? 16 : 28 }}>{when}</div>
          {place ? <div style={{ display: 'flex', fontSize: big ? 32 : wide ? 20 : 26, color: 'rgba(242,234,214,0.85)', marginTop: 10 }}>{place}</div> : null}
          {!wide ? (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: big ? 72 : 40 }}>
              <img src={qr} width={qrSize} height={qrSize} style={{ background: '#fff', borderRadius: 16, padding: 10 }} />
              <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 32 }}>
                <div style={{ display: 'flex', fontSize: big ? 40 : 30, color: IVORY, fontWeight: 700 }}>微信扫码报名</div>
                <div style={{ display: 'flex', fontSize: big ? 28 : 22, color: 'rgba(242,234,214,0.7)', marginTop: 10 }}>SAREC 中美房地产商会</div>
              </div>
            </div>
          ) : null}
        </div>
        {wide ? (
          <div style={{ position: 'absolute', right: 48, bottom: 44, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img src={qr} width={qrSize} height={qrSize} style={{ background: '#fff', borderRadius: 12, padding: 8 }} />
            <div style={{ display: 'flex', fontSize: 20, color: IVORY, marginTop: 10 }}>微信扫码报名</div>
          </div>
        ) : null}
      </div>
    ),
    {
      width: W,
      height: H,
      fonts,
      headers: {
        'Cache-Control': 'no-store',
        ...(sp.get('inline') ? {} : { 'Content-Disposition': `attachment; filename="poster-${size}-${e.slug}.png"` })
      }
    }
  );
});
