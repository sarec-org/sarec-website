/**
 * 1.3.1 D：名片图片（“存相册”、转发用）。4 款模板：深蓝金商务 / 简约白 / 中英双语 / 地产项目（可放一张项目照片）。
 * 只用名片公开的内容（本人没勾选公开的联系方式不出现）；会员状态实时查询。GET ?tpl= 可预览别的模板。
 */
import { ImageResponse } from 'next/og';
import { cardCodePng, publicCard } from '@/lib/crm/cards';
import { CrmError } from '@/lib/crm/events';
import { handler } from '@/lib/crm/http';
import { dataUri, ogFonts } from '@/lib/og/fonts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const W = 1050;
const H = 600;
const NAVY = '#0F1F33';
const GOLD = '#C9A567';
const IVORY = '#F2EAD6';

export const GET = handler(async (req: Request, { params }: { params: { token: string } }) => {
  const token = String(params.token);
  if (!/^[a-f0-9]{8,32}$/.test(token)) throw new CrmError('not_found', '名片不存在');
  const c = await publicCard(token);
  const q = new URL(req.url).searchParams.get('tpl');
  const tpl = q && ['navy', 'white', 'bilingual', 'estate'].includes(q) ? q : c.template || 'navy';
  const qr = `data:image/png;base64,${(await cardCodePng(token)).toString('base64')}`;
  const avatar = await dataUri(c.avatarUrl);
  const photo = tpl === 'estate' ? await dataUri(c.projectPhotoUrl) : null;
  const status = c.status.isMember ? `SAREC 正式会员${c.status.tierName ? ' · ' + c.status.tierName : ''}` : 'SAREC 注册用户';
  const role = [c.title, c.company].filter(Boolean).join(' · ') || c.industry || c.roleLabel || '';
  const roleEn = [c.titleEn, c.companyEn].filter(Boolean).join(' · ');
  const contacts = [c.phone, c.email, c.wechatId ? `微信 ${c.wechatId}` : null].filter(Boolean) as string[];
  const text = [c.name, c.nameEn, role, roleEn, c.intro, c.industry, status, contacts.join(' '), '中美房地产商会扫码存入名片夹'].join('');
  const fonts = await ogFonts(text);

  const dark = tpl !== 'white';
  const fg = dark ? IVORY : NAVY;
  const sub = dark ? 'rgba(242,234,214,0.72)' : '#5B6B7E';
  const bg =
    tpl === 'white' ? '#FFFFFF'
    : tpl === 'estate' ? NAVY
    : 'linear-gradient(135deg, #0F1F33 0%, #16304D 60%, #0B1A28 100%)';

  const body = (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: tpl === 'estate' ? '28px 48px 36px' : '48px 52px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', fontSize: 22, color: GOLD, letterSpacing: 2, fontFamily: 'Sans' }}>{status}</div>
        <div style={{ display: 'flex', fontSize: 24, color: dark ? 'rgba(242,234,214,0.8)' : NAVY, fontFamily: 'Serif', letterSpacing: 4 }}>SAREC 中美房地产商会</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginTop: tpl === 'estate' ? 20 : 44 }}>
        {avatar ? <img src={avatar} width={112} height={112} style={{ borderRadius: 56, border: `2px solid ${GOLD}`, marginRight: 28, objectFit: 'cover' }} /> : null}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <div style={{ fontSize: 60, color: fg, fontFamily: 'Serif', fontWeight: 700, letterSpacing: 6 }}>{c.name}</div>
            {tpl === 'bilingual' && c.nameEn ? <div style={{ fontSize: 30, color: GOLD, marginLeft: 20, fontFamily: 'Sans' }}>{c.nameEn}</div> : null}
          </div>
          {role ? <div style={{ display: 'flex', fontSize: 28, color: GOLD, marginTop: 6, fontFamily: 'Sans' }}>{role}</div> : null}
          {tpl === 'bilingual' && roleEn ? <div style={{ display: 'flex', fontSize: 24, color: sub, marginTop: 4, fontFamily: 'Sans' }}>{roleEn}</div> : null}
        </div>
      </div>
      {c.intro && tpl !== 'estate' ? <div style={{ display: 'flex', fontSize: 26, color: sub, marginTop: 26, lineHeight: 1.5, fontFamily: 'Sans', maxWidth: 760 }}>{c.intro}</div> : null}
      <div style={{ display: 'flex', flex: 1 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 24, color: sub, fontFamily: 'Sans' }}>
          {contacts.map((x) => <div key={x} style={{ display: 'flex', marginTop: 4 }}>{x}</div>)}
          {c.industry ? <div style={{ display: 'flex', marginTop: 4, color: GOLD }}>{c.industry}</div> : null}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={qr} width={tpl === 'estate' ? 120 : 140} height={tpl === 'estate' ? 120 : 140} style={{ background: '#fff', padding: 6, borderRadius: 8 }} />
          <div style={{ display: 'flex', fontSize: 18, color: sub, marginTop: 6, fontFamily: 'Sans' }}>扫码存入名片夹</div>
        </div>
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', background: bg, border: tpl === 'white' ? `6px solid ${GOLD}` : 'none', position: 'relative' }}>
        {tpl === 'white' ? <div style={{ position: 'absolute', left: 52, right: 52, top: 112, height: 2, background: GOLD, opacity: 0.5, display: 'flex' }} /> : null}
        {tpl !== 'white' && tpl !== 'estate' ? <div style={{ position: 'absolute', right: -160, top: -160, width: 520, height: 520, borderRadius: 260, border: '2px solid rgba(201,165,103,0.22)', display: 'flex' }} /> : null}
        {tpl === 'estate' ? (
          <div style={{ display: 'flex', height: 210, width: W, position: 'relative', background: '#16304D' }}>
            {photo ? <img src={photo} width={W} height={210} style={{ objectFit: 'cover' }} /> : null}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120, display: 'flex', background: 'linear-gradient(180deg, rgba(15,31,51,0) 0%, rgba(15,31,51,0.95) 100%)' }} />
            {c.intro ? <div style={{ position: 'absolute', left: 48, bottom: 16, right: 48, display: 'flex', fontSize: 26, color: IVORY, fontFamily: 'Sans' }}>{c.intro}</div> : null}
          </div>
        ) : null}
        {body}
      </div>
    ),
    { width: W, height: H, fonts, headers: { 'Cache-Control': 'no-store' } }
  );
});
