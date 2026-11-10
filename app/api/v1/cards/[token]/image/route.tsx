/**
 * 1.3.1 D / 真机修正 1：电子名片卡面图片（名片页显示、“存相册”、转发都用这一张）。
 * 卡面 1.7:1，四个模板（深蓝金商务 / 简约白 / 中英双语 / 地产项目）信息结构完全一致，只换底色、字体色和装饰：
 *   左上 SAREC + 等级徽标（金色）；右上 商会名（中英双语模板用英文）；
 *   中部 姓名（有中文名：中文在上、英文在下；英文名用衬线体）→ 职务 · 公司 → 行业（灰金小字）；
 *   金色细分隔线；底部左 联系方式（图标 + 文字，最多 4 行，只显示本人填了且公开的）；底部右 小程序码 + “扫码存入名片夹”。
 * GET ?tpl= 预览别的模板；?own=1 本人看（资料没填时卡面中部显示引导）；?fmt=share 转发用 5:4 图（卡面居中）。
 * 二维码：微信返回的小程序码先转成标准 PNG 再画（真机白方块的修正）；生成失败时画提示，不留白块。
 */
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { cardCodePng, publicCard } from '@/lib/crm/cards';
import { CrmError } from '@/lib/crm/events';
import { handler } from '@/lib/crm/http';
import { cardImage } from '@/lib/cardtpl/serve';
import { dataUri, ogFonts } from '@/lib/og/fonts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CW = 1020; // 卡面 1.7:1
const CH = 600;
const GOLD = '#C9A567';
const GOLD_DEEP = '#9C7A3C'; // 白底上的金色（对比度够）
const IVORY = '#F2EAD6';
const NAVY = '#0F1F33';

type Theme = { bg: string; fg: string; sub: string; gold: string; line: string; org: string; frame?: string };
const THEMES: Record<string, Theme> = {
  navy: { bg: 'linear-gradient(135deg, #0F1F33 0%, #16304D 60%, #0B1A28 100%)', fg: IVORY, sub: 'rgba(242,234,214,0.78)', gold: GOLD, line: 'rgba(201,165,103,0.7)', org: 'SAREC 中美房地产商会' },
  white: { bg: '#FFFFFF', fg: NAVY, sub: '#5B6B7F', gold: GOLD_DEEP, line: 'rgba(156,122,60,0.6)', org: 'SAREC 中美房地产商会', frame: GOLD },
  bilingual: { bg: 'linear-gradient(135deg, #0B2E35 0%, #0F4A52 55%, #0B1A28 100%)', fg: IVORY, sub: 'rgba(242,234,214,0.78)', gold: GOLD, line: 'rgba(201,165,103,0.7)', org: 'Sino-American Real Estate Chamber' },
  estate: { bg: '#0F1F33', fg: IVORY, sub: 'rgba(242,234,214,0.8)', gold: GOLD, line: 'rgba(201,165,103,0.7)', org: 'SAREC 中美房地产商会' }
};

const hasCjk = (s: string | null | undefined) => !!s && /[㐀-鿿]/.test(s);

/** 联系方式小图标（线条，颜色跟模板） */
function Icon({ kind, color, size }: { kind: string; color: string; size: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (kind === 'phone') return <svg {...p}><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M10.5 18.5h3" /></svg>;
  if (kind === 'wechat') return <svg {...p}><path d="M9.5 4C5.4 4 2.5 6.6 2.5 9.8c0 1.8 1 3.4 2.6 4.4L4.5 16.5l2.7-1.4c.7.2 1.5.3 2.3.3" /><path d="M15.5 9.5c3.3 0 6 2.2 6 5 0 1.5-.8 2.8-2.1 3.7l.5 1.8-2.1-1.1c-.7.2-1.5.3-2.3.3-3.3 0-6-2.2-6-5s2.7-4.7 6-4.7z" /></svg>;
  if (kind === 'email') return <svg {...p}><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M3 6.5l9 6.5 9-6.5" /></svg>;
  if (kind === 'web') return <svg {...p}><circle cx="12" cy="12" r="9.5" /><path d="M2.5 12h19M12 2.5c2.6 2.8 3.9 6 3.9 9.5S14.6 18.7 12 21.5C9.4 18.7 8.1 15.5 8.1 12S9.4 5.3 12 2.5z" /></svg>;
  return <svg {...p}><path d="M12 21.5s-7-6.2-7-11.5a7 7 0 0 1 14 0c0 5.3-7 11.5-7 11.5z" /><circle cx="12" cy="10" r="2.5" /></svg>;
}

async function qrDataUri(token: string): Promise<string | null> {
  try {
    const raw = await cardCodePng(token);
    // 微信小程序码转成 8 位 RGB 标准 PNG、白底，避免卡面里解不出来变成白块
    const png = await sharp(raw).flatten({ background: '#FFFFFF' }).resize(480, 480, { fit: 'contain', background: '#FFFFFF' }).png({ palette: false }).toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch (e) {
    console.log(`[card-image] qr failed token=${token.slice(0, 6)} ${(e as Error).message}`);
    return null;
  }
}

// 名片模板库上线后：默认走服务器出图（105 款）；出图失败时退回下面原来的画法，保证名片总能显示
export const GET = handler(async (req: Request, ctx: { params: { token: string } }) => {
  const token = String(ctx.params.token);
  if (!/^[a-f0-9]{8,32}$/.test(token)) throw new CrmError('not_found', '名片不存在');
  const sp = new URL(req.url).searchParams;
  try {
    const r = await cardImage(token, { tpl: sp.get('tpl'), own: sp.get('own') === '1', share: sp.get('fmt') === 'share', thumb: sp.get('thumb') === '1' });
    return new Response(new Uint8Array(r.buf), {
      headers: { 'Content-Type': r.type, 'Cache-Control': 'no-store', 'X-Card-Tpl': String(r.tpl), 'X-Card-Cache': r.cached ? 'hit' : 'miss', ...(r.fit && !r.fit.ok ? { 'X-Card-Fit': 'overflow' } : {}) }
    });
  } catch (e) {
    if (e instanceof CrmError) throw e;
    console.log(`[card-image] render failed, legacy fallback: ${(e as Error).message}`);
    return legacyGet(req, ctx);
  }
});

const legacyGet = handler(async (req: Request, { params }: { params: { token: string } }) => {
  const token = String(params.token);
  if (!/^[a-f0-9]{8,32}$/.test(token)) throw new CrmError('not_found', '名片不存在');
  const c = await publicCard(token);
  const sp = new URL(req.url).searchParams;
  const q = sp.get('tpl');
  const tpl = q && THEMES[q] ? q : THEMES[c.template] ? c.template : 'navy';
  const own = sp.get('own') === '1';
  const share = sp.get('fmt') === 'share';
  const t = THEMES[tpl];
  const [qr, photo] = await Promise.all([qrDataUri(token), tpl === 'estate' ? dataUri(c.projectPhotoUrl) : Promise.resolve(null)]);

  // 姓名：有中文名则中文在上、英文在下；只有英文名就用衬线体
  const cn = hasCjk(c.name) ? c.name : null;
  const en = cn ? c.nameEn || null : c.name;
  const role = [c.title, c.company].filter(Boolean).join(' · ');
  const industry = c.industry || c.roleLabel || '';
  const all: [string, string | null][] = [
    ['phone', c.phone],
    ['wechat', c.wechatId],
    ['email', c.email],
    ['web', c.website],
    ['pin', c.region]
  ];
  const contacts = all.filter((x): x is [string, string] => !!x[1]).slice(0, 4);
  // 地区来自“我的”里选的常住地区，不算本人在名片上填过的资料
  const empty = !c.company && !c.title && !contacts.some(([kind]) => kind !== 'pin');
  const guide = own && empty ? '点右上角「编辑资料」填写公司、职务和联系方式' : '';
  const text = ['SAREC', c.badge, t.org, cn, en, role, industry, contacts.map((x) => x[1]).join(''), guide, '扫码存入名片夹二维码生成中请稍后刷新'].join('');
  const fonts = await ogFonts(text);

  const k = share ? 0.9 : 1; // 转发图里卡面缩到 90%
  const z = (n: number) => Math.round(n * k);
  const W = z(CW);
  const H = z(CH);
  const PX = z(60); // 左右内边距（≈ 40rpx），文字离边缘都 ≥ 32rpx
  const PY = z(48);
  const QR = z(222); // ≈ 150rpx

  const card = (
    <div style={{ width: W, height: H, display: 'flex', position: 'relative', background: t.bg, borderRadius: share ? z(20) : 0, overflow: 'hidden', border: t.frame ? `${z(4)}px solid ${t.frame}` : 'none', boxShadow: share ? '0 20px 50px rgba(0,0,0,0.35)' : 'none' }}>
      {/* 装饰：只有这部分随模板变 */}
      {tpl === 'navy' ? <div style={{ position: 'absolute', right: z(-180), top: z(-200), width: z(560), height: z(560), borderRadius: z(280), border: `${z(2)}px solid rgba(201,165,103,0.2)`, display: 'flex' }} /> : null}
      {tpl === 'bilingual' ? <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: z(12), background: GOLD, display: 'flex' }} /> : null}
      {tpl === 'estate' && photo ? <img src={photo} width={z(520)} height={H} style={{ position: 'absolute', right: 0, top: 0, objectFit: 'cover', opacity: 0.38 }} /> : null}
      {tpl === 'estate' && photo ? <div style={{ position: 'absolute', right: 0, top: 0, width: z(560), height: H, display: 'flex', background: 'linear-gradient(90deg, #0F1F33 0%, rgba(15,31,51,0.55) 45%, rgba(15,31,51,0.2) 100%)' }} /> : null}
      {tpl === 'estate' ? <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: z(10), background: GOLD, display: 'flex' }} /> : null}

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: `${PY}px ${PX}px`, position: 'relative' }}>
        {/* 上：SAREC + 等级 | 商会名 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', fontSize: z(26), color: t.fg, fontFamily: 'Serif', letterSpacing: z(6) }}>SAREC</div>
            <div style={{ display: 'flex', marginLeft: z(16), padding: `${z(4)}px ${z(16)}px`, border: `${z(2)}px solid ${t.gold}`, borderRadius: z(30), fontSize: z(22), color: t.gold, fontFamily: 'Sans', letterSpacing: z(2) }}>{c.badge}</div>
          </div>
          <div style={{ display: 'flex', fontSize: z(tpl === 'bilingual' ? 22 : 24), color: t.sub, fontFamily: tpl === 'bilingual' ? 'Serif' : 'Sans', letterSpacing: z(tpl === 'bilingual' ? 1 : 3) }}>{t.org}</div>
        </div>

        {/* 中 + 下：左栏文字，右栏二维码 */}
        <div style={{ display: 'flex', flex: 1, marginTop: z(20) }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: contacts.length ? 'flex-start' : 'center', paddingRight: z(28) }}>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: contacts.length ? z(14) : 0 }}>
              {cn ? <div style={{ display: 'flex', fontSize: z(72), color: t.fg, fontFamily: 'Serif', fontWeight: 700, letterSpacing: z(6), lineHeight: 1.1 }}>{cn}</div> : null}
              {en ? <div style={{ display: 'flex', fontSize: z(cn ? 36 : 68), color: cn ? t.gold : t.fg, fontFamily: 'Serif', letterSpacing: z(cn ? 2 : 1), marginTop: z(cn ? 4 : 0), lineHeight: 1.15 }}>{en}</div> : null}
              {role ? <div style={{ display: 'flex', fontSize: z(32), color: t.fg, fontFamily: 'Sans', marginTop: z(14) }}>{role}</div> : null}
              {industry ? <div style={{ display: 'flex', fontSize: z(26), color: t.gold, opacity: 0.85, fontFamily: 'Sans', marginTop: z(6) }}>{industry}</div> : null}
              {guide ? <div style={{ display: 'flex', fontSize: z(26), color: t.sub, fontFamily: 'Sans', marginTop: z(18) }}>{guide}</div> : null}
            </div>
            {contacts.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
                <div style={{ display: 'flex', height: z(2), width: '100%', background: t.line, marginBottom: z(14) }} />
                {contacts.map(([kind, v]) => (
                  <div key={kind} style={{ display: 'flex', alignItems: 'center', height: z(38) }}>
                    <Icon kind={kind} color={t.gold} size={z(24)} />
                    <div style={{ display: 'flex', marginLeft: z(12), fontSize: z(25), color: t.sub, fontFamily: 'Sans' }}>{v}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', height: z(2), width: '70%', background: t.line, marginTop: z(22) }} />
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
            {qr ? (
              <div style={{ display: 'flex', background: '#FFFFFF', padding: z(8), borderRadius: z(10) }}>
                <img src={qr} width={QR - z(16)} height={QR - z(16)} />
              </div>
            ) : (
              <div style={{ display: 'flex', width: QR, height: QR, borderRadius: z(10), border: `${z(2)}px dashed ${t.line}`, alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: z(22), color: t.sub, fontFamily: 'Sans', padding: z(20) }}>二维码生成中，请稍后刷新</div>
            )}
            <div style={{ display: 'flex', fontSize: z(22), color: t.sub, marginTop: z(8), fontFamily: 'Sans' }}>扫码存入名片夹</div>
          </div>
        </div>
      </div>
    </div>
  );

  if (share) {
    const SW = 1000;
    const SH = 800; // 5:4
    return new ImageResponse(
      (
        <div style={{ width: SW, height: SH, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tpl === 'white' ? 'linear-gradient(160deg, #F4F1EA 0%, #E6EBF0 100%)' : 'linear-gradient(160deg, #0B1A28 0%, #16304D 100%)' }}>
          {card}
        </div>
      ),
      { width: SW, height: SH, fonts, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  return new ImageResponse(card, { width: CW, height: CH, fonts, headers: { 'Cache-Control': 'no-store' } });
});
