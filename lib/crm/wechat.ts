/**
 * 微信服务端接口：access_token（stable_token，进程内缓存）+ 小程序码。
 * 密钥只从环境变量 WX_APPID / WX_SECRET 读，不打日志、不返回给前端。
 */
import { CrmError } from './events';

let cachedToken: { token: string; exp: number } | null = null;

export function wxConfigured(): boolean {
  return !!(process.env.WX_APPID && process.env.WX_SECRET);
}

export async function wxAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.token;
  const res = await fetch('https://api.weixin.qq.com/cgi-bin/stable_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credential', appid: process.env.WX_APPID, secret: process.env.WX_SECRET })
  });
  const d = (await res.json()) as { access_token?: string; expires_in?: number; errcode?: number };
  if (!d.access_token) throw new Error(`wechat token error ${d.errcode ?? ''}`);
  cachedToken = { token: d.access_token, exp: Date.now() + (d.expires_in ?? 7200) * 1000 };
  return d.access_token;
}

/** scene 只能 32 个可见字符，且限 [0-9a-zA-Z!#$&'()*+,/:;=?@-._~] */
const SCENE_OK = /^[0-9A-Za-z!#$&'()*+,/:;=?@\-._~]{1,32}$/;

type CodeReq = { page: string; scene?: string; path?: string; tag: string };

/** 调微信生成正式版小程序码：有 scene 用 wxacode.getUnlimited（数量不限），否则 wxacode.get（带完整 path，总量有限） */
async function miniProgramCode(r: CodeReq): Promise<Buffer> {
  if (!wxConfigured()) throw new CrmError('wechat_unconfigured', '后台还没有配置小程序 AppID / AppSecret');
  const token = await wxAccessToken();
  const common = { width: 1280, auto_color: false, line_color: { r: 4, g: 20, b: 33 }, is_hyaline: false, env_version: 'release' };
  const [url, payload] = r.scene
    ? [`https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${token}`, { ...common, scene: r.scene, page: r.page, check_path: true }]
    : [`https://api.weixin.qq.com/wxa/getwxacode?access_token=${token}`, { ...common, path: r.path }];
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const buf = Buffer.from(await res.arrayBuffer());
  // 出错时微信返回 JSON；成功是图片
  if ((res.headers.get('content-type') || '').includes('json') || buf[0] === 0x7b) {
    let code: number | string = 'unknown';
    try { code = (JSON.parse(buf.toString('utf8')) as { errcode?: number }).errcode ?? 'unknown'; } catch { /* ignore */ }
    console.log(`[wxacode] ${r.tag} errcode=${code}`);
    throw new CrmError('wx_error', `生成小程序码失败（微信返回 ${code}），请稍后再试`);
  }
  return buf;
}

/** 活动报名小程序码（正式版），扫码进 pages/event/event（scene = slug） */
export function eventRegisterCode(slug: string): Promise<Buffer> {
  return miniProgramCode(
    SCENE_OK.test(slug)
      ? { page: 'pages/event/event', scene: slug, tag: `register slug=${slug}` }
      : { page: 'pages/event/event', path: `pages/event/event?slug=${encodeURIComponent(slug)}`, tag: `register slug=${slug}` }
  );
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
