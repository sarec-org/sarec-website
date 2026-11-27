/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text -- 这里的 <img> 是给 next/og 出图用的，不是网页 */
/**
 * 1.7.0 节日祝福（迁移 0054）。和海报模板库共用一个库：分类 / 模板 purpose = 'greeting' 的就是祝福图。
 * ------------------------------------------------------------------
 * - GET /api/v1/greetings（不登录）：上架的祝福分类和模板，按"离今天（洛杉矶时间）最近、还没过的节日"排前面。
 *   指令 83：日期从节日表（lib/org/festivals.ts）取这一次 / 下一次，不用每年手改；节后显示期（如春节到初七）里还算这一次。
 *   图片地址和模板库一样走本站 /api/v1/poster-img/<id>/<版本>/{t,l}.jpg。没有上架模板的分类不出现。
 * - GET /api/v1/greetings/me（登录）：落款用的名片资料（姓名、公司、职务、头像、公司标志；没有的给 null）+ 默认落款 defaultLine。
 *   头像 / 标志只用"别人看得到"的那张（contacts.avatar_url、member_cards.logo_url；还在检测中的新图不用）。名片被工作人员下架的，只用姓名和头像。
 * - GET /api/v1/greetings/<id>/render.png?style=plain|company|personal&line=…（登录）：next/og 出 1080×1620 PNG。
 *   底图 = 模板大图；落款排在模板的 sig_box 里（没有就用默认 [0.06,0.84,0.94,0.95] 并垫半透明深色底板、白字）。
 *   - plain 纯祝福：一行署名（line，没传用 defaultLine）
 *   - company 公司版：公司标志（白底圆角小方块）＋ 公司名 ＋ 一行署名（line，没传用「姓名 敬贺」）
 *   - personal 个人版：圆形头像 ＋ 姓名（大一号）＋ 职务 · 公司一行（line 传了就再加一行）
 *   名片里没有的就不画、不占位。右上角固定「AI 生成」标识（和活动海报同一个），落款位碰到它自动往下让。
 *   用户自己写的 line：最多 30 字，先过禁用词，再过微信文本检测（risky 拒收，400 中文提示）。
 */
import sharp from 'sharp';
import { ImageResponse } from 'next/og';
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { msgSecCheck } from '@/lib/crm/contentSec';
import { profileCompany } from '@/lib/crm/cards';
import { bannedWord } from './texts';
import { LARGE, fetchTemplateImage, getTemplate, imgUrl } from './posterTemplates';
import { dateLabel, daysBetween, festivalsAt, laToday, type FestivalAt } from './festivals';
import { AiBadge, AI_BADGE_DEFAULT, aiBadgeConfig, placeFor, planBadge, type AiBadgeCfg, boxLuminance, clean, font, ln, textWidth, wrap } from './posterRender';

const W = LARGE.w;
const H = LARGE.h;
/** 没有落款位的祝福图：画面最下面一条 */
export const DEFAULT_SIG_BOX: [number, number, number, number] = [0.06, 0.84, 0.94, 0.95];
export const LINE_MAX = 30;
/** V171-3：落款什么都没有（没名片、没改落款）时印这一行，免得画在底图里的落款框空着（以后可挪到后台设置） */
export const FALLBACK_LINE = '祝您节日快乐';
export const STYLES = ['plain', 'company', 'personal'] as const;
export type GreetStyle = (typeof STYLES)[number];

// ── 清单（不要求登录） ───────────────────────────────────────────────
export async function greetingList(base: string, today: string = laToday()) {
  const pool = getPool();
  // 指令 83：日期从节日表算（festivals.greet_category_key → 这一次 / 下一次的日期）；没挂到节日表的祝福分类才用老的 festival_date 列
  const { rows: cats } = await pool.query<{ key: string; name: string; date: string | null; tier: number; sort: number }>(
    `SELECT key, name, to_char(festival_date, 'YYYY-MM-DD') AS date, tier, sort FROM poster_categories
      WHERE active AND purpose = 'greeting' ORDER BY tier, sort, key`
  );
  const fests = await festivalsAt(today, pool);
  const fest = new Map<string, FestivalAt>();
  for (const f of fests) {
    if (!f.greet_category_key || f.date == null || f.days == null) continue;
    const had = fest.get(f.greet_category_key);
    if (!had || f.days < had.days!) fest.set(f.greet_category_key, f);
  }
  const { rows: tpls } = await pool.query<{ id: string; name: string; version: number; category_key: string }>(
    `SELECT t.id, t.name, t.version, t.category_key FROM poster_templates t JOIN poster_categories c ON c.key = t.category_key
      WHERE t.status = 'active' AND c.active AND t.purpose = 'greeting' AND c.purpose = 'greeting' ORDER BY t.sort, t.created_at`
  );
  // version：祝福模板、祝福分类、节日表最后一次改动的时间（毫秒），小程序用来判断要不要刷新（日期跟着 today 变，today 也一起给）
  const { rows: v } = await pool.query<{ ms: string | null }>(
    `SELECT (extract(epoch FROM greatest(
        (SELECT max(updated_at) FROM poster_templates WHERE purpose = 'greeting'),
        (SELECT max(updated_at) FROM poster_categories WHERE purpose = 'greeting'),
        (SELECT max(updated_at) FROM festivals))) * 1000)::bigint::text AS ms`
  );
  const by = new Map<string, typeof tpls>();
  for (const t of tpls) by.set(t.category_key, [...(by.get(t.category_key) ?? []), t]);
  // 排序：挂了节日表的按"这一次 / 下一次"日期从近到远（节后显示期里的还算这一次，排最前）；
  // 没挂的用老列：还没过的按日期在后，已过的、没日期的最后
  const rank = (c: (typeof cats)[number]) => {
    const f = fest.get(c.key);
    if (f) return [0, f.days!];
    if (c.date && c.date >= today) return [1, daysBetween(today, c.date)];
    if (c.date) return [2, daysBetween(today, c.date)];
    return [3, 0];
  };
  const order = new Map(cats.map((c, i) => [c.key, i]));
  const festivals = cats
      .filter((c) => by.get(c.key)?.length)
      .sort((a, b) => {
        const [ra, da] = rank(a);
        const [rb, db] = rank(b);
        return ra - rb || da - db || order.get(a.key)! - order.get(b.key)!;
      })
      .map((c) => {
        const f = fest.get(c.key);
        return {
          key: c.key, name: c.name, date: f?.date ?? c.date, dateLabel: dateLabel(today, f?.date ?? c.date), festival: f?.key ?? null, inWindow: f?.inWindow ?? false,
          inHome: f?.inHome ?? false,
          items: (by.get(c.key) ?? []).map((t) => ({ id: t.id, name: t.name, thumb: imgUrl(base, t.id, t.version, 't'), large: imgUrl(base, t.id, t.version, 'l') }))
        };
      });
  // 指令 86 首页栏目「★ 节日祝福」：只在节日的首页窗口 [D − home_before_days, D + 节后天数] 里出现（V171-2）；
  // 几个同时在窗口里取离今天最近的；都不在 → null（首页整栏不出）
  const first = festivals
    .filter((x) => x.inHome)
    .sort((a, b) => Math.abs(fest.get(a.key)!.days!) - Math.abs(fest.get(b.key)!.days!) || fest.get(a.key)!.days! - fest.get(b.key)!.days!)[0];
  const home = first
    ? { title: '节日祝福', festival: first.festival ?? first.key, category: first.key, festivalName: fest.get(first.key)?.name ?? first.name, date: first.date, dateLabel: first.dateLabel, items: first.items.slice(0, 4).map((x) => ({ id: x.id, thumb: x.thumb })) }
    : null;
  return { version: Number(v[0]?.ms ?? 0), today, festivals, home };
}

// ── 我的落款资料 ─────────────────────────────────────────────────────
export type GreetCard = { name: string | null; company: string | null; title: string | null; avatarUrl: string | null; logoUrl: string | null };

const orNull = (s: string | null | undefined) => clean(s) || null;
const httpsOrNull = (u: string | null | undefined) => (u && /^https:\/\//i.test(u.trim()) ? u.trim() : null);

export async function greetingCard(contactId: string): Promise<GreetCard> {
  const pool = getPool();
  const { rows } = await pool.query<{
    name: string | null; avatar_url: string | null; company: string | null; title: string | null; logo_url: string | null; hidden: boolean | null; has_card: boolean;
  }>(
    `SELECT c.name, c.avatar_url, m.company, m.title, to_jsonb(m)->>'logo_url' AS logo_url, m.hidden_at IS NOT NULL AS hidden, m.contact_id IS NOT NULL AS has_card
       FROM contacts c LEFT JOIN member_cards m ON m.contact_id = c.id WHERE c.id = $1`,
    [contactId]
  );
  const r = rows[0];
  if (!r) throw new CrmError('unauthorized', '请先登录');
  const name = r.name && r.name !== '微信用户' ? orNull(r.name) : null;
  // 名片被工作人员下架：公司 / 职务 / 标志都不用（只用姓名、头像）
  if (r.hidden) return { name, company: null, title: null, avatarUrl: httpsOrNull(r.avatar_url), logoUrl: null };
  // 公司和名片页一样：名片里没填时用资料题 Q12 的回答
  const company = orNull(r.company) ?? orNull(await profileCompany(pool, contactId).catch(() => null));
  return { name, company, title: orNull(r.title), avatarUrl: httpsOrNull(r.avatar_url), logoUrl: httpsOrNull(r.logo_url) };
}

/** 默认落款：有公司「XX公司 XXX 敬贺」；只有名字「XXX 敬贺」；只有公司「XX公司 敬贺」；什么都没有 null */
export function defaultLine(c: Pick<GreetCard, 'name' | 'company'>): string | null {
  const who = [c.company, c.name].filter(Boolean).join(' ');
  return who ? `${who} 敬贺` : null;
}

export async function greetingMe(contactId: string) {
  const card = await greetingCard(contactId);
  return { card, defaultLine: defaultLine(card) };
}

// ── 用户自己写的落款：长度、禁用词、微信文本检测 ─────────────────────
export async function checkLine(contactId: string, raw: string | null): Promise<string | null> {
  const line = clean(raw);
  if (!line) return null;
  if (Array.from(line).length > LINE_MAX) throw new CrmError('bad_request', `落款最多 ${LINE_MAX} 个字，请删短一点`);
  const bad = bannedWord(line);
  if (bad) throw new CrmError('bad_request', `落款里有不能用的字「${bad}」，请改一下`);
  const { rows } = await getPool().query<{ o: string | null }>(`SELECT wechat_openid AS o FROM contacts WHERE id = $1`, [contactId]);
  const o = rows[0]?.o ?? null;
  const r = await msgSecCheck(line, o && !o.startsWith('dev-openid-') ? o : null, 1);
  if (r === 'risky') throw new CrmError('bad_request', '落款没通过微信的内容检测，请改一下文字');
  return line;
}

// ── 出图 ─────────────────────────────────────────────────────────────
/** 取名片里的图（头像 / 标志），转成 PNG；取不到就当没有（不画、不占位） */
async function fetchPic(url: string | null, mode: 'cover' | 'contain', px: number): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const img = sharp(buf, { failOn: 'none' }).rotate();
    return await (mode === 'cover'
      ? img.resize(px, px, { fit: 'cover', position: 'centre' })
      : img.resize(px, px, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    ).png().toBuffer();
  } catch {
    return null;
  }
}

type Line = { text: string; k: number; dim?: boolean };

/** 一组行按同一个基准字号排：总高不超过 h、每行不超过 w；字号上限 max、下限 min（到下限还放不下的行截短加「…」） */
function fitLines(lines: Line[], w: number, h: number, max: number, min: number) {
  const lh = 1.3;
  let s = max;
  const fits = (sz: number) =>
    lines.reduce((a, l) => a + l.k * sz * lh, 0) <= h && lines.every((l) => textWidth(l.text, l.k * sz) <= w);
  while (s > min && !fits(s)) s -= 1;
  const out = lines.map((l) => {
    const size = Math.round(l.k * s);
    const text = textWidth(l.text, size) <= w ? l.text : wrap(l.text, size, w, 1)[0];
    return { ...l, size, text, width: Math.min(w, textWidth(text, size)) };
  });
  return { lines: out, lh };
}

export type GreetRenderInput = {
  image: Buffer; sigBox: number[] | null; style: GreetStyle;
  card: GreetCard; line: string | null; avatar: Buffer | null; logo: Buffer | null; badge?: AiBadgeCfg; badgePos?: string | null;
};

/** 出图（不查库）：底图、落款 → PNG */
export async function renderGreeting(o: GreetRenderInput): Promise<Buffer> {
  const c = o.card;
  const badge = o.badge ?? AI_BADGE_DEFAULT;
  // 各版式要排的东西（没有的不出现）
  let pic: { buf: Buffer; round: boolean } | null = null;
  let lines: Line[] = [];
  if (o.style === 'plain') {
    const t = o.line ?? defaultLine(c);
    if (t) lines = [{ text: t, k: 1 }];
  } else if (o.style === 'company') {
    if (o.logo) pic = { buf: o.logo, round: false };
    const sig = o.line ?? (c.name ? `${c.name} 敬贺` : null);
    lines = [c.company ? { text: c.company, k: 1 } : null, sig ? { text: sig, k: c.company ? 0.7 : 1, dim: !!c.company } : null].filter(Boolean) as Line[];
  } else {
    if (o.avatar) pic = { buf: o.avatar, round: true };
    const sub = [c.title, c.company].filter(Boolean).join(' · ');
    lines = [
      c.name ? { text: c.name, k: 1 } : null,
      sub ? { text: sub, k: c.name ? 0.62 : 0.8, dim: !!c.name } : null,
      o.line ? { text: o.line, k: 0.62, dim: true } : null
    ].filter(Boolean) as Line[];
  }
  if (!pic && !lines.length) lines = [{ text: FALLBACK_LINE, k: 1 }];
  const empty = !pic && !lines.length;

  const plate = !o.sigBox;
  const box = [...(o.sigBox ?? DEFAULT_SIG_BOX)];
  // 「AI生成」标识：定位置、取色，落款位碰到就让开（box 原地改）；什么都不落款时没有条子，strip 退回右下角
  const bp = await planBadge({ cfg: badge, img: o.image, cw: W, ch: H, place: placeFor(badge, o.badgePos), box, bar: empty ? null : plate ? 'plate' : 'painted', plateBg: 'rgba(12,14,20,0.55)' });
  const bx = box[0] * W;
  const by = box[1] * H;
  const bw = (box[2] - box[0]) * W;
  const bh = (box[3] - box[1]) * H;
  const pad = plate ? Math.round(Math.min(bw, bh) * 0.12) : 0;
  const innerW = bw - pad * 2;
  const innerH = bh - pad * 2;
  const ink = plate ? '#FFFFFF' : (await boxLuminance(o.image, box)) > 0.55 ? '#1E1E1E' : '#FFFFFF';
  const shadow = ink === '#FFFFFF' && !plate ? '0 2px 6px rgba(0,0,0,0.5)' : undefined;

  // 图（头像 / 标志）：信息位高度的 90%，最多占宽度 30%
  const picSize = pic ? Math.round(Math.min(innerH * 0.9, innerW * 0.3, 240)) : 0;
  const gap = pic ? Math.round(Math.max(16, picSize * 0.18)) : 0;
  const textW = innerW - picSize - gap;
  // 基准字号：一行时最大 60，多行按行数分高度
  const fit = fitLines(lines, textW * 0.96, innerH, Math.min(60, Math.round(innerH * (lines.length > 1 ? 0.62 : 0.75))), 16);
  const colW = Math.ceil(Math.max(0, ...fit.lines.map((l) => l.width)) + 6);

  const bg = `data:image/jpeg;base64,${o.image.toString('base64')}`;
  const res = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', fontFamily: 'NotoSansSC' }}>
        <img src={bg} width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} />
        {plate && !empty && (
          <div style={{ position: 'absolute', left: bx, top: by, width: bw, height: bh, borderRadius: 24, background: 'rgba(12,14,20,0.55)', display: 'flex' }} />
        )}
        {!empty && (
          <div style={{ position: 'absolute', left: bx + pad, top: by + pad, width: innerW, height: innerH, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {pic && (
              <div
                style={{
                  display: 'flex', width: picSize, height: picSize, flexShrink: 0, marginRight: lines.length ? gap : 0,
                  borderRadius: pic.round ? picSize / 2 : 14, overflow: 'hidden',
                  background: pic.round ? 'transparent' : '#FFFFFF', padding: pic.round ? 0 : Math.round(picSize * 0.08),
                  border: pic.round ? `4px solid ${ink === '#FFFFFF' ? 'rgba(255,255,255,0.9)' : 'rgba(30,30,30,0.25)'}` : 'none'
                }}
              >
                <img
                  src={`data:image/png;base64,${pic.buf.toString('base64')}`}
                  width={pic.round ? picSize - 8 : picSize - Math.round(picSize * 0.16)}
                  height={pic.round ? picSize - 8 : picSize - Math.round(picSize * 0.16)}
                  style={{ borderRadius: pic.round ? picSize / 2 : 0 }}
                />
              </div>
            )}
            {!!lines.length && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: pic ? 'flex-start' : 'center', width: Math.min(textW, colW), color: ink, ...(shadow ? { textShadow: shadow } : {}) }}>
                {fit.lines.map((l, i) => (
                  <div key={i} style={{ fontSize: l.size, ...ln(l.size, fit.lh), whiteSpace: 'nowrap', opacity: l.dim ? 0.9 : 1 }}>{l.text}</div>
                ))}
              </div>
            )}
          </div>
        )}
        <AiBadge p={bp} />
      </div>
    ),
    { width: W, height: H, fonts: [{ name: 'NotoSansSC', data: await font(), weight: 700, style: 'normal' }] }
  );
  return Buffer.from(await res.arrayBuffer());
}

/** 接口用：查模板（必须是上架的祝福模板）、取名片、检查落款、出图 */
export async function greetingPng(contactId: string, tplId: string, styleRaw: string | null, lineRaw: string | null, base?: string): Promise<Buffer> {
  const style = (styleRaw || 'plain') as GreetStyle;
  if (!STYLES.includes(style)) throw new CrmError('bad_request', '版式不对，只能是 plain / company / personal');
  const pool = getPool();
  const tpl = await getTemplate(tplId, pool);
  if (!tpl || tpl.purpose !== 'greeting' || tpl.status !== 'active') throw new CrmError('not_found', '这张祝福图已经下架了，请换一张');
  const { rows: cat } = await pool.query<{ active: boolean; purpose: string }>(`SELECT active, purpose FROM poster_categories WHERE key = $1`, [tpl.category_key]);
  if (!cat[0]?.active || cat[0].purpose !== 'greeting') throw new CrmError('not_found', '这张祝福图已经下架了，请换一张');
  const card = await greetingCard(contactId);
  let line = await checkLine(contactId, lineRaw);
  // V171-1 兜底：老版小程序把默认落款（「公司 姓名 敬贺」）当 line 传；公司版 / 个人版收到它就按没传处理，免得公司名、名字印两遍
  if (line && style !== 'plain' && line === defaultLine(card)) line = null;
  const [image, avatar, logo] = await Promise.all([
    fetchTemplateImage(tpl, 'l', base),
    style === 'personal' ? fetchPic(card.avatarUrl, 'cover', 320) : Promise.resolve(null),
    style === 'company' ? fetchPic(card.logoUrl, 'contain', 320) : Promise.resolve(null)
  ]);
  return renderGreeting({ image, sigBox: tpl.sig_box, style, card, line, avatar, logo, badge: await aiBadgeConfig(), badgePos: tpl.badge_pos });
}
