/**
 * SAREC 1.2：电子名片 + 邀请海报素材
 * ------------------------------------------------------------------
 * - 名片：姓名、公司、职位、业务介绍、本人选择公开的联系方式，商会品牌底。
 *   只有有效缴费会员显示“SAREC 正式会员”+ 等级 + 有效期；其余显示“SAREC 注册用户”。
 *   扫名片码打开的页面实时查当前会员状态：过期了就显示已过期，旧截图不能一直代表有效会籍。
 * - 邀请海报：活动信息 + 本人头像、姓名 + 专属小程序码（scene 带推荐码）。注册用户也能生成。
 * - 小程序码：正式站调微信接口生成并缓存到 Blob；预览 / 本地没有 AppSecret 时生成普通二维码代替（仅测试用）。
 */
import { createHash } from 'node:crypto';
import { head, put } from '@vercel/blob';
import QRCode from 'qrcode';
import { getPool } from '@/lib/db/client';
import { CrmError } from './events';
import { memberStatus } from './membership';
import { getContactInfo } from './contactInfo';
import { findRoleSub } from './questionBank';
import { BLOB_PREFIX, blobConfigured } from './photos';
import { getSetting } from './orders';
import { cardCode, chamberInviteCode, inviteCode, wxConfigured } from './wechat';
import { msgSecCheck } from './contentSec';
import type { Db } from './profile';

export type CardStatus = { label: string; isMember: boolean; tierName: string | null; endDate: string | null; expired: boolean };

/** 1.3.1 真机修正 1：名片左上角的等级徽标（注册用户 / 会员 / 理事单位 / 常务理事 / 副会长 / 常务副会长 / 战略合作伙伴） */
export function tierBadge(st: Pick<CardStatus, 'isMember' | 'tierName'>): string {
  if (!st.isMember) return '注册用户';
  const t = st.tierName ?? '';
  if (!t) return '会员';
  if (t === '理事单位' || t === '战略合作伙伴' || t === '会员') return t;
  return t.replace(/单位$/, '');
}

async function statusOf(db: Db, contactId: string): Promise<CardStatus> {
  const ms = await memberStatus(db, contactId);
  if (ms.isMember) return { label: 'SAREC 正式会员', isMember: true, tierName: ms.tierName, endDate: ms.endDate, expired: false };
  if (ms.expired) return { label: 'SAREC 注册用户', isMember: false, tierName: null, endDate: ms.endDate, expired: true };
  return { label: 'SAREC 注册用户', isMember: false, tierName: null, endDate: null, expired: false };
}

async function ensureCard(db: Db, contactId: string) {
  await db.query(`INSERT INTO member_cards (contact_id) VALUES ($1) ON CONFLICT (contact_id) DO NOTHING`, [contactId]);
  const { rows } = await db.query<{
    token: string; company: string | null; title: string | null; intro: string | null; wechat_id: string | null;
    show_phone: boolean; show_email: boolean; show_wechat: boolean; hidden_at: Date | null; hidden_reason: string | null;
    template: string; name_en: string | null; company_en: string | null; title_en: string | null; industry: string | null; project_photo_url: string | null;
    website: string | null; show_website: boolean; show_region: boolean;
  }>(`SELECT token, company, title, intro, wechat_id, show_phone, show_email, show_wechat, hidden_at, hidden_reason,
             template, name_en, company_en, title_en, industry, project_photo_url, website, show_website, show_region FROM member_cards WHERE contact_id = $1`, [contactId]);
  return rows[0];
}

/** 名片资料：未填公司职位时，用资料题 Q12（公司和职位）的回答预填 */
async function profileCompany(db: Db, contactId: string): Promise<string | null> {
  const { rows } = await db.query<{ value: { text?: string } }>(
    `SELECT value FROM profile_answers WHERE contact_id = $1 AND item_code = 'Q12' AND status = 'current' AND NOT is_unknown`,
    [contactId]
  );
  return rows[0]?.value?.text ?? null;
}

async function profileIndustry(db: Db, contactId: string): Promise<string | null> {
  const { rows } = await db.query<{ v: string | null }>(
    `SELECT value->>'choice' AS v FROM profile_answers WHERE contact_id = $1 AND item_code = 'CK:profession' AND status = 'current' LIMIT 1`,
    [contactId]
  ).catch(() => ({ rows: [] as { v: string | null }[] }));
  return rows[0]?.v ?? null;
}

const TEMPLATE_KEYS = ['navy', 'white', 'bilingual', 'estate'];

/** 我的名片（编辑用） */
export async function myCard(contactId: string) {
  const pool = getPool();
  const card = await ensureCard(pool, contactId);
  const { rows: c } = await pool.query<{ name: string; member_no: number; role_sub: string | null; avatar_url: string | null; region_self: string | null }>(
    `SELECT name, member_no::int AS member_no, role_sub, avatar_url, region_self FROM contacts WHERE id = $1`,
    [contactId]
  );
  const info = await getContactInfo(pool, contactId);
  const status = await statusOf(pool, contactId);
  return {
    token: card.token,
    name: c[0]?.name && c[0].name !== '微信用户' ? c[0].name : '',
    memberNo: c[0]?.member_no ?? null,
    avatarUrl: c[0]?.avatar_url ?? null,
    roleLabel: findRoleSub(c[0]?.role_sub)?.label ?? null,
    company: card.company ?? (await profileCompany(pool, contactId)),
    title: card.title,
    intro: card.intro,
    wechatId: card.wechat_id,
    showPhone: card.show_phone,
    showEmail: card.show_email,
    showWechat: card.show_wechat,
    // 1.3.1 真机修正 1：网站、地区（地区用本人在“我的”里选的常住地区）及公开开关
    website: card.website, showWebsite: card.show_website, region: c[0]?.region_self ?? null, showRegion: card.show_region,
    phone: info.phone?.value ?? null,
    email: info.email?.value ?? null,
    // 被工作人员下架时：本人仍可修改，别人打开显示“已下架”
    hidden: card.hidden_at ? { at: card.hidden_at, reason: card.hidden_reason } : null,
    status,
    badge: tierBadge(status),
    // 1.3.1 D：4 款模板 + 中英双语 + 行业 + 项目照片（行业没填时用签到时选的职业）
    template: card.template,
    nameEn: card.name_en, companyEn: card.company_en, titleEn: card.title_en,
    industry: card.industry ?? (await profileIndustry(pool, contactId)),
    projectPhotoUrl: card.project_photo_url
  };
}

/** 头像换了：名片重新进入待审核 */
export async function markCardContentChanged(contactId: string) {
  const pool = getPool();
  await ensureCard(pool, contactId);
  await pool.query(`UPDATE member_cards SET content_updated_at = now() WHERE contact_id = $1`, [contactId]);
}

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : undefined);

export async function updateMyCard(contactId: string, b: Record<string, unknown>) {
  const pool = getPool();
  await ensureCard(pool, contactId);
  const wechat = clip(b.wechatId, 40);
  if (wechat && !/^[A-Za-z][-_A-Za-z0-9]{5,19}$|^1\d{10}$|^\+?\d{8,15}$/.test(wechat)) {
    throw new CrmError('bad_wechat', '微信号格式不对（6–20 位字母、数字、下划线或减号，以字母开头；也可以填手机号）');
  }
  // 内容审核：姓名、公司、职位、业务介绍、微信号有变化时，先过微信内容安全，再记“待审核”
  const { rows: cur } = await pool.query<{ company: string | null; title: string | null; intro: string | null; wechat_id: string | null; name: string; openid: string | null }>(
    `SELECT m.company, m.title, m.intro, m.wechat_id, c.name, c.wechat_openid AS openid FROM member_cards m JOIN contacts c ON c.id = m.contact_id WHERE m.contact_id = $1`,
    [contactId]
  );
  const before = cur[0];
  const next = {
    company: b.company !== undefined ? clip(b.company, 80) || null : before?.company ?? null,
    title: b.title !== undefined ? clip(b.title, 60) || null : before?.title ?? null,
    intro: b.intro !== undefined ? clip(b.intro, 200) || null : before?.intro ?? null,
    wechat: b.wechatId !== undefined ? wechat || null : before?.wechat_id ?? null,
    name: typeof b.name === 'string' && b.name.trim() ? b.name.trim().slice(0, 100) : before?.name ?? ''
  };
  // 1.3.1 D：模板、英文、行业也走内容安全
  const website = clip(b.website, 120);
  if (website && !/^(https?:\/\/)?[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+(\/\S*)?$/.test(website)) throw new CrmError('bad_request', '网站格式不对，例如 www.example.com');
  const extra = [clip(b.nameEn, 60), clip(b.companyEn, 100), clip(b.titleEn, 60), clip(b.industry, 20), website].filter(Boolean).join('\n');
  if (extra) {
    const r0 = await msgSecCheck(extra, before?.openid ?? null, 1);
    if (r0 === 'risky') throw new CrmError('content_risky', '名片内容未通过内容安全检查，请修改后再保存');
  }
  if (b.template !== undefined && !TEMPLATE_KEYS.includes(String(b.template))) throw new CrmError('bad_request', '请选择名片模板');
  if (b.projectPhotoUrl !== undefined && b.projectPhotoUrl !== null && !/^https:\/\/[a-z0-9.-]+\.(public\.blob\.vercel-storage\.com|vercel-storage\.com)\//i.test(String(b.projectPhotoUrl))) {
    throw new CrmError('bad_request', '项目照片请在名片页上传');
  }
  await pool.query(
    `UPDATE member_cards SET
       template = coalesce($2, template),
       name_en = CASE WHEN $3::boolean THEN $4 ELSE name_en END,
       company_en = CASE WHEN $5::boolean THEN $6 ELSE company_en END,
       title_en = CASE WHEN $7::boolean THEN $8 ELSE title_en END,
       industry = CASE WHEN $9::boolean THEN $10 ELSE industry END,
       project_photo_url = CASE WHEN $11::boolean THEN $12 ELSE project_photo_url END,
       content_updated_at = CASE WHEN $13::boolean THEN now() ELSE content_updated_at END,
       website = CASE WHEN $14::boolean THEN $15 ELSE website END,
       show_website = COALESCE($16, show_website), show_region = COALESCE($17, show_region)
     WHERE contact_id = $1`,
    [
      contactId, b.template !== undefined ? String(b.template) : null,
      b.nameEn !== undefined, clip(b.nameEn, 60) || null,
      b.companyEn !== undefined, clip(b.companyEn, 100) || null,
      b.titleEn !== undefined, clip(b.titleEn, 60) || null,
      b.industry !== undefined, clip(b.industry, 20) || null,
      b.projectPhotoUrl !== undefined, (b.projectPhotoUrl as string | null) || null,
      !!extra || b.projectPhotoUrl !== undefined,
      b.website !== undefined, website || null,
      typeof b.showWebsite === 'boolean' ? b.showWebsite : null,
      typeof b.showRegion === 'boolean' ? b.showRegion : null
    ]
  );
  const changed =
    !before || next.company !== before.company || next.title !== before.title || next.intro !== before.intro || next.wechat !== before.wechat_id || next.name !== before.name;
  let sec: string | null = null;
  if (changed) {
    const r = await msgSecCheck([next.name, next.company, next.title, next.intro, next.wechat].filter(Boolean).join('\n'), before?.openid ?? null, 1);
    if (r === 'risky') throw new CrmError('content_risky', '名片内容未通过内容安全检查，请修改后再保存');
    sec = r;
  }
  await pool.query(
    `UPDATE member_cards SET
       content_updated_at = CASE WHEN $13::boolean THEN now() ELSE content_updated_at END,
       sec_check = CASE WHEN $13::boolean THEN $14 ELSE sec_check END,
       company = CASE WHEN $2::boolean THEN $3 ELSE company END,
       title = CASE WHEN $4::boolean THEN $5 ELSE title END,
       intro = CASE WHEN $6::boolean THEN $7 ELSE intro END,
       wechat_id = CASE WHEN $8::boolean THEN $9 ELSE wechat_id END,
       show_phone = COALESCE($10, show_phone), show_email = COALESCE($11, show_email), show_wechat = COALESCE($12, show_wechat),
       updated_at = now()
     WHERE contact_id = $1`,
    [
      contactId,
      b.company !== undefined, clip(b.company, 80) || null,
      b.title !== undefined, clip(b.title, 60) || null,
      b.intro !== undefined, clip(b.intro, 200) || null,
      b.wechatId !== undefined, wechat || null,
      typeof b.showPhone === 'boolean' ? b.showPhone : null,
      typeof b.showEmail === 'boolean' ? b.showEmail : null,
      typeof b.showWechat === 'boolean' ? b.showWechat : null,
      changed,
      sec
    ]
  );
  if (typeof b.name === 'string' && b.name.trim()) {
    await pool.query(`UPDATE contacts SET name = $2, updated_at = now() WHERE id = $1`, [contactId, b.name.trim().slice(0, 100)]);
  }
  return myCard(contactId);
}

/** 扫名片码 / 打开分享的名片：公开信息 + 实时会员状态（只给本人选择公开的联系方式） */
export async function publicCard(token: string) {
  if (!/^[a-f0-9]{8,32}$/.test(token)) throw new CrmError('not_found', '名片不存在');
  const pool = getPool();
  const { rows } = await pool.query<{
    contact_id: string; company: string | null; title: string | null; intro: string | null; wechat_id: string | null;
    show_phone: boolean; show_email: boolean; show_wechat: boolean; name: string; avatar_url: string | null; role_sub: string | null; member_no: number; hidden_at: Date | null;
    template: string; name_en: string | null; company_en: string | null; title_en: string | null; industry: string | null; project_photo_url: string | null;
    website: string | null; show_website: boolean; show_region: boolean; region_self: string | null;
  }>(
    `SELECT m.contact_id, m.company, m.title, m.intro, m.wechat_id, m.show_phone, m.show_email, m.show_wechat,
            m.template, m.name_en, m.company_en, m.title_en, m.industry, m.project_photo_url, m.website, m.show_website, m.show_region,
            c.name, c.avatar_url, c.role_sub, c.member_no::int AS member_no, c.region_self, m.hidden_at
       FROM member_cards m JOIN contacts c ON c.id = m.contact_id WHERE m.token = $1`,
    [token]
  );
  const r = rows[0];
  if (!r) throw new CrmError('not_found', '名片不存在或已停用');
  // 工作人员下架后，别人打开只显示“已下架”，不展示任何名片内容
  if (r.hidden_at) throw new CrmError('not_found', '这张名片已下架');
  const info = await getContactInfo(pool, r.contact_id);
  const st = await statusOf(pool, r.contact_id);
  return {
    token,
    ref: r.member_no,
    name: r.name !== '微信用户' ? r.name : 'SAREC 用户',
    avatarUrl: r.avatar_url,
    roleLabel: findRoleSub(r.role_sub)?.label ?? null,
    company: r.company ?? (await profileCompany(pool, r.contact_id)),
    title: r.title,
    intro: r.intro,
    phone: r.show_phone ? info.phone?.value ?? null : null,
    email: r.show_email ? info.email?.value ?? null : null,
    wechatId: r.show_wechat ? r.wechat_id : null,
    website: r.show_website ? r.website : null,
    region: r.show_region ? r.region_self : null,
    status: st,
    badge: tierBadge(st),
    template: r.template, nameEn: r.name_en, companyEn: r.company_en, titleEn: r.title_en, industry: r.industry, projectPhotoUrl: r.project_photo_url,
    checkedAt: new Date().toISOString()
  };
}

// ── 小程序码（海报 / 名片）──────────────────────────────────────────────

const ENV_VERSION = (process.env.WX_CODE_ENV_VERSION as 'release' | 'trial' | 'develop' | undefined) ?? 'release';

async function cached(key: string, make: () => Promise<Buffer>): Promise<Buffer> {
  if (!blobConfigured()) return make();
  const pathname = `${BLOB_PREFIX}/codes/${createHash('sha256').update(key).digest('hex').slice(0, 32)}.png`;
  try {
    const h = await head(pathname);
    const res = await fetch(h.url);
    if (res.ok) return Buffer.from(await res.arrayBuffer());
  } catch {
    /* 没有缓存 */
  }
  const buf = await make();
  await put(pathname, buf, { access: 'public', contentType: 'image/png', addRandomSuffix: false }).catch(() => undefined);
  return buf;
}

/** 测试环境没有 AppSecret：生成普通二维码（内容是对应的小程序路径说明），保证海报、名片能完整测试 */
function testCode(text: string): Promise<Buffer> {
  return QRCode.toBuffer(`SAREC-TEST:${text}`, { margin: 1, width: 600, color: { dark: '#06111E', light: '#F2EAD6' } });
}

export async function inviteCodePng(slug: string, memberNo: number): Promise<Buffer> {
  if (!wxConfigured()) return testCode(`pages/event/event?slug=${slug}&ref=${memberNo}&channel=poster`);
  return cached(`invite:${ENV_VERSION}:${slug}:${memberNo}`, () => inviteCode(slug, memberNo, ENV_VERSION));
}

export async function chamberCodePng(memberNo: number): Promise<Buffer> {
  if (!wxConfigured()) return testCode(`pages/intro/intro?ref=${memberNo}&channel=invite_card`);
  return cached(`chamber:${ENV_VERSION}:${memberNo}`, () => chamberInviteCode(memberNo, ENV_VERSION));
}

/** 1.3 P-2 “认识商会”邀请卡素材：邀请人姓名、公司（名片里公开的）、专属码、文案（后台可改，不含金额） */
export async function chamberInviteData(contactId: string, base: string) {
  const pool = getPool();
  const { rows: c } = await pool.query<{ name: string; member_no: number; avatar_url: string | null }>(`SELECT name, member_no::int AS member_no, avatar_url FROM contacts WHERE id = $1`, [contactId]);
  const card = await ensureCard(pool, contactId);
  const st = await statusOf(pool, contactId);
  const texts = await getSetting<Record<string, string>>(pool, 'invite_card_text', {});
  const b = base.replace(/\/$/, '');
  const proxied = (u: string | null) => (u ? `${b}/_next/image?url=${encodeURIComponent(u)}&w=1080&q=80` : null);
  return {
    inviter: {
      name: c[0]?.name && c[0].name !== '微信用户' ? c[0].name : '',
      memberNo: c[0]?.member_no,
      avatarUrl: proxied(c[0]?.avatar_url ?? null),
      company: card.company ?? null,
      label: `${st.isMember ? 'SAREC 会员' : 'SAREC 注册用户'}${card.company ? ' · ' + card.company : ''}${card.title ? ' · ' + card.title : ''}`
    },
    title: texts.title?.trim() || '邀请你认识中美房地产商会',
    intro: texts.intro?.trim() || '连接中美资本，重构房地产项目协作。商会定期举办讲座和企业家交流活动，扫码了解商会和近期活动。',
    codeUrl: `${b}/api/v1/codes/chamber/${c[0]?.member_no}.png`,
    isTestCode: !wxConfigured()
  };
}

export async function cardCodePng(token: string): Promise<Buffer> {
  if (!wxConfigured()) return testCode(`pages/card/card?t=${token}`);
  return cached(`card:${ENV_VERSION}:${token}`, () => cardCode(token, ENV_VERSION));
}

/** 邀请海报素材：活动信息、邀请人、码图地址（同域，小程序 canvas 可直接下载） */
export async function posterData(contactId: string, slug: string, base: string) {
  const pool = getPool();
  const { rows: ev } = await pool.query<{
    slug: string; title: string; starts_at: Date; ends_at: Date | null; location_name: string | null; address: string | null;
    fee_cents: number; cover_url: string | null; event_status: string; topic_tags: string[];
  }>(`SELECT slug, title, starts_at, ends_at, timezone, location_name, address, fee_cents, cover_url, event_status, topic_tags FROM events WHERE slug = $1`, [slug]);
  if (!ev[0]) throw new CrmError('not_found', '找不到这场活动');
  // 1.2 线上问题 P-1/P-2：已结束的活动不能再邀请
  const end = ev[0].ends_at ?? new Date(new Date(ev[0].starts_at).getTime() + 3 * 3600_000);
  if (ev[0].event_status !== 'scheduled' || new Date(end).getTime() <= Date.now()) throw new CrmError('event_closed', '这场活动已经结束了。下一场活动发布后，就可以邀请朋友一起参加');
  const { rows: c } = await pool.query<{ name: string; member_no: number; avatar_url: string | null }>(
    `SELECT name, member_no::int AS member_no, avatar_url FROM contacts WHERE id = $1`,
    [contactId]
  );
  const card = await ensureCard(pool, contactId);
  const st = await statusOf(pool, contactId);
  const b = base.replace(/\/$/, '');
  const proxied = (u: string | null) => (u ? `${b}/_next/image?url=${encodeURIComponent(u)}&w=1080&q=80` : null);
  return {
    event: {
      slug: ev[0].slug,
      title: ev[0].title,
      startsAt: ev[0].starts_at,
      timezone: (ev[0] as { timezone?: string }).timezone ?? 'America/Los_Angeles',
      endsAt: ev[0].ends_at,
      locationName: ev[0].location_name,
      address: ev[0].address,
      feeCents: ev[0].fee_cents,
      coverUrl: proxied(ev[0].cover_url)
    },
    inviter: {
      name: c[0]?.name && c[0].name !== '微信用户' ? c[0].name : '',
      memberNo: c[0]?.member_no,
      avatarUrl: proxied(c[0]?.avatar_url ?? null),
      // 1.3 D：海报同时展示本人在名片里公开的公司、职位（名片本身就是对外展示的资料）
      label: `${st.isMember ? 'SAREC 会员' : 'SAREC 注册用户'}${card.company ? ' · ' + card.company : ''}${card.title ? ' · ' + card.title : ''}`
    },
    codeUrl: `${b}/api/v1/codes/invite/${encodeURIComponent(ev[0].slug)}/${c[0]?.member_no}.png`,
    isTestCode: !wxConfigured()
  };
}
