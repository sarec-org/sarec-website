/**
 * 微信服务端接口：access_token（stable_token，进程内缓存）+ 小程序码。
 * 密钥只从环境变量 WX_APPID / WX_SECRET 读，不打日志、不返回给前端。
 */
import { createHash } from 'node:crypto';
import { CrmError } from './events';

/** 日志里只记凭证的指纹（sha256 前 8 位），用来看重试拿到的是不是同一个凭证；不记凭证本身 */
const fp = (t: string) => createHash('sha256').update(t).digest('hex').slice(0, 8);

let cachedToken: { token: string; exp: number } | null = null;

export function wxConfigured(): boolean {
  return !!(process.env.WX_APPID && process.env.WX_SECRET);
}

export async function wxAccessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.token;
  const old = cachedToken;
  if (forceRefresh) cachedToken = null;
  // 11/12 线上 42001：凭证请求一律不走 Next 数据缓存（排除一直拿到同一个已过期旧凭证、强刷也没用的可能）
  const res = await fetch('https://api.weixin.qq.com/cgi-bin/stable_token', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credential', appid: process.env.WX_APPID, secret: process.env.WX_SECRET, force_refresh: forceRefresh })
  });
  const d = (await res.json()) as { access_token?: string; expires_in?: number; errcode?: number };
  if (!d.access_token) {
    console.log(`[wx] stable_token force=${forceRefresh} errcode=${d.errcode ?? 'none'}`);
    throw new Error(`wechat token error ${d.errcode ?? ''}`);
  }
  console.log(`[wx] stable_token force=${forceRefresh} fp=${fp(d.access_token)} expires_in=${d.expires_in ?? 'none'} prev=${old ? fp(old.token) : 'none'}`);
  cachedToken = { token: d.access_token, exp: Date.now() + (d.expires_in ?? 7200) * 1000 };
  return d.access_token;
}

/** 微信说凭证无效 / 过期（40001、42001、40014）：强制刷新凭证后重试一次 */
export const WX_TOKEN_EXPIRED = new Set([40001, 40014, 42001]);
export async function withWxToken<T>(run: (token: string) => Promise<T>, errcodeOf: (r: T) => number | undefined): Promise<T> {
  const first = await run(await wxAccessToken());
  const code = errcodeOf(first);
  if (code === undefined || !WX_TOKEN_EXPIRED.has(code)) return first;
  console.log(`[wx] token errcode=${code}, force refresh and retry once`);
  return run(await wxAccessToken(true));
}

/** scene 只能 32 个可见字符，且限 [0-9a-zA-Z!#$&'()*+,/:;=?@-._~] */
export const SCENE_OK = /^[0-9A-Za-z!#$&'()*+,/:;=?@\-._~]{1,32}$/;

type CodeReq = { page: string; scene?: string; path?: string; tag: string; envVersion?: 'release' | 'trial' | 'develop'; checkPath?: boolean };

/**
 * 东哥 11/12 定：所有小程序码生成成功后永久存一份（Blob），以后同一个码直接用存好的（不再调微信、不占总量）；
 * 微信出错时也用存好的。都没有才报错。任何情况下都不换成网页码。
 */
const CODE_PREFIX = () => `${process.env.VERCEL_ENV === 'production' ? 'prod' : 'test'}/wxacode/all`;
function codeKey(r: CodeReq): string {
  return createHash('sha256').update(JSON.stringify([r.envVersion ?? 'release', r.page, r.scene ?? '', r.path ?? ''])).digest('hex').slice(0, 40);
}
async function storedCode(key: string): Promise<Buffer | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { head } = await import('@vercel/blob');
    const h = await head(`${CODE_PREFIX()}/${key}.png`);
    const res = await fetch(h.url, { cache: 'no-store' });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch { return null; }
}
async function storeCode(key: string, buf: Buffer) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    const { put } = await import('@vercel/blob');
    await put(`${CODE_PREFIX()}/${key}.png`, buf, { access: 'public', contentType: 'image/png', addRandomSuffix: false });
  } catch (e) { console.log('[wxacode] store failed', (e as Error).message); }
}
async function miniProgramCode(r: CodeReq): Promise<Buffer> {
  if (!wxConfigured()) throw new CrmError('wechat_unconfigured', '后台还没有配置小程序 AppID / AppSecret');
  const key = codeKey(r);
  const stored = await storedCode(key);
  if (stored) return stored;
  try {
    const buf = await freshCode(r);
    await storeCode(key, buf);
    return buf;
  } catch (e) {
    const again = await storedCode(key); // 并发时别的请求可能刚存好
    if (again) return again;
    throw e;
  }
}

/** 调微信生成正式版小程序码：有 scene 用 wxacode.getUnlimited（数量不限），否则 wxacode.get（带完整 path，总量有限） */
async function freshCode(r: CodeReq): Promise<Buffer> {
  const env = r.envVersion ?? 'release';
  const common = { width: 1280, auto_color: false, line_color: { r: 4, g: 20, b: 33 }, is_hyaline: false, env_version: env };
  const jsonCode = (b: { buf: Buffer; json: boolean }) => {
    if (!b.json) return undefined;
    try { return (JSON.parse(b.buf.toString('utf8')) as { errcode?: number }).errcode; } catch { return undefined; }
  };
  const { buf, json } = await withWxToken(async (token) => {
    const [url, payload] = r.scene
      ? [`https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${token}`, { ...common, scene: r.scene, page: r.page, check_path: env === 'release' && r.checkPath !== false }]
      : [`https://api.weixin.qq.com/wxa/getwxacode?access_token=${token}`, { ...common, path: r.path }];
    const res = await fetch(url, { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const b = Buffer.from(await res.arrayBuffer());
    return { buf: b, json: (res.headers.get('content-type') || '').includes('json') || b[0] === 0x7b };
  }, jsonCode);
  // 出错时微信返回 JSON；成功是图片
  if (json) {
    let code: number | string = 'unknown';
    try { code = (JSON.parse(buf.toString('utf8')) as { errcode?: number }).errcode ?? 'unknown'; } catch { /* ignore */ }
    console.log(`[wxacode] ${r.tag} errcode=${code}`);
    throw new CrmError('wx_error', `生成小程序码失败（微信返回 ${code}），请稍后再试`);
  }
  return buf;
}

/** 1.3：任意页面 + 参数的小程序码（wxacode.get，带完整 path；渠道码等用） */
export function miniProgramPathCode(path: string, tag: string): Promise<Buffer> {
  return miniProgramCode({ page: path.split('?')[0], path, tag });
}

/** 活动报名小程序码（正式版），扫码进 pages/event/event（scene = slug） */
export function eventRegisterCode(slug: string): Promise<Buffer> {
  return miniProgramCode(
    SCENE_OK.test(slug)
      ? { page: 'pages/event/event', scene: slug, tag: `register slug=${slug}` }
      : { page: 'pages/event/event', path: `pages/event/event?slug=${encodeURIComponent(slug)}`, tag: `register slug=${slug}` }
  );
}

/**
 * 1.2 邀请海报码：扫码进活动页并带上推荐人（scene = “slug|r会员编号”，活动页解析 r 开头的第二段为推荐码）。
 * 新页面上线前（体验版 / 开发版测试）可用 envVersion 生成对应版本的码。
 */
export function inviteCode(slug: string, memberNo: number, envVersion: 'release' | 'trial' | 'develop' = 'release'): Promise<Buffer> {
  const scene = `${slug}|r${memberNo}`;
  return miniProgramCode(
    SCENE_OK.test(scene)
      ? { page: 'pages/event/event', scene, tag: `invite slug=${slug}`, envVersion }
      : { page: 'pages/event/event', path: `pages/event/event?slug=${encodeURIComponent(slug)}&ref=${memberNo}&channel=poster`, tag: `invite slug=${slug}`, envVersion }
  );
}

/** 1.3 P-2 商会邀请卡专属码：扫码打开“商会介绍页”，带邀请人推荐码 */
export function chamberInviteCode(memberNo: number, envVersion: 'release' | 'trial' | 'develop' = 'release'): Promise<Buffer> {
  // 1.3 新页面：正式版发布前（体验版、审核期间）也能生成；发布后同一个码照常能用
  return miniProgramCode({ page: 'pages/intro/intro', scene: `r${memberNo}`, tag: 'chamber_invite', envVersion, checkPath: false });
}

/** 1.3 N 工作人员绑定小程序码：工作人员在网站后台点“在小程序里用工作台”生成，用自己的微信扫一次（scene = “sb=绑定码”） */
export function staffBindCode(code: string, envVersion: 'release' | 'trial' | 'develop' = 'release'): Promise<Buffer> {
  return miniProgramCode({ page: 'pages/staff/bind', scene: `sb=${code}`, tag: 'staff_bind', envVersion, checkPath: false });
}

/** 1.2 电子名片码：扫码打开名片页（scene = “c|名片编号”），页面实时显示当前会员状态 */
export function cardCode(token: string, envVersion: 'release' | 'trial' | 'develop' = 'release'): Promise<Buffer> {
  // “|” 不在 scene 允许的字符里（微信返回 40129），改用带完整 path 的 wxacode.get；名片页读 ?t=
  // 名片码按 token 缓存在 Blob，每张名片只生成一次，wxacode.get 的总量上限够用
  return miniProgramCode({ page: 'pages/card/card', path: `pages/card/card?t=${encodeURIComponent(token)}`, tag: 'card', envVersion });
}

/** 签到码里最少带几位签到密钥（密钥是 32 位十六进制） */
export const CHECKIN_KEY_MIN = 8;

/**
 * 现场签到小程序码（正式版），微信扫一扫直接进 pages/checkin/checkin。
 * scene = “slug|签到密钥前 N 位”，凑满 32 字符（小程序 1.1.0 起签到页就按 slug|k 解析 scene）；
 * slug 太长放不下足够位数时，退回 wxacode.get 带完整 slug 和密钥。
 */
export function eventCheckinCode(slug: string, secret: string): Promise<Buffer> {
  const n = 32 - slug.length - 1;
  const scene = `${slug}|${secret.slice(0, n)}`;
  return miniProgramCode(
    n >= CHECKIN_KEY_MIN && SCENE_OK.test(scene)
      ? { page: 'pages/checkin/checkin', scene, tag: `checkin slug=${slug}` }
      : { page: 'pages/checkin/checkin', path: `pages/checkin/checkin?slug=${encodeURIComponent(slug)}&k=${secret}`, tag: `checkin slug=${slug}` }
  );
}

/** 签到密钥校验：完整密钥，或签到小程序码里带的前缀（≥ 8 位） */
export function checkinKeyOk(k: string | undefined, secret: string | undefined): boolean {
  if (!k || !secret) return false;
  if (k === secret) return true;
  return k.length >= CHECKIN_KEY_MIN && k.length < secret.length && secret.startsWith(k);
}
