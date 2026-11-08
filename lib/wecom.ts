/**
 * 1.3 O：企业微信“联系我”渠道码。
 * - 小程序和网站里所有“加商会微信”的二维码，改为企业微信“联系我”码：每个入口一个码（state 带入口），
 *   登录用户按人生成（state 带会员编号），加好友后企业微信回调带回 state，自动关联到会员档案；没有 state 时用 unionid 兜底。
 * - 企业微信没配好（认证没过、接口权限不够、调用失败）时，一律回退到后台上传的个人微信二维码，不报错。
 * - 环境变量（只放在 Vercel 环境变量里，不写进代码）：
 *     WECOM_CORP_ID           企业 ID
 *     WECOM_CONTACT_SECRET    “客户联系”应用的 Secret
 *     WECOM_CALLBACK_TOKEN    回调 Token
 *     WECOM_CALLBACK_AES_KEY  回调 EncodingAESKey（43 位）
 *   接待的成员（企业微信 userid，逗号分隔）在后台“增长与设置”里填：wecom_userids。
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { getSetting } from '@/lib/crm/orders';

export const WECOM_PLACEMENTS = ['done', 'checkin', 'album', 'rooms', 'contact', 'home', 'intro', 'default'] as const;
export type Placement = (typeof WECOM_PLACEMENTS)[number];
export const PLACEMENT_LABEL: Record<Placement, string> = {
  done: '报名成功页', checkin: '签到成功页', album: '相册页', rooms: '会议室', contact: '联系商会', home: '首页', intro: '商会介绍页', default: '其他'
};
const P_CODE: Record<Placement, string> = { done: 'd', checkin: 'c', album: 'a', rooms: 'r', contact: 'k', home: 'h', intro: 'i', default: 'x' };
const CODE_P = Object.fromEntries(Object.entries(P_CODE).map(([k, v]) => [v, k])) as Record<string, Placement>;

export function wecomConfigured(): boolean {
  return !!(process.env.WECOM_CORP_ID && process.env.WECOM_CONTACT_SECRET);
}

let tokenCache: { token: string; exp: number } | null = null;
async function accessToken(): Promise<string> {
  if (tokenCache && tokenCache.exp > Date.now() + 60_000) return tokenCache.token;
  const u = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${encodeURIComponent(process.env.WECOM_CORP_ID!)}&corpsecret=${encodeURIComponent(process.env.WECOM_CONTACT_SECRET!)}`;
  const d = (await (await fetch(u)).json()) as { errcode?: number; access_token?: string; expires_in?: number };
  if (d.errcode || !d.access_token) throw new Error(`wecom gettoken ${d.errcode}`);
  tokenCache = { token: d.access_token, exp: Date.now() + (d.expires_in ?? 7200) * 1000 };
  return d.access_token;
}

async function api<T>(path: string, body?: unknown): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const tok = await accessToken();
    const res = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/${path}${path.includes('?') ? '&' : '?'}access_token=${tok}`, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined);
    const d = (await res.json()) as T & { errcode?: number };
    // access_token 失效：清缓存重来一次
    if (d.errcode === 40014 || d.errcode === 42001) { tokenCache = null; continue; }
    if (d.errcode) throw new Error(`wecom ${path.split('?')[0]} ${d.errcode}`);
    return d;
  }
  throw new Error('wecom token retry failed');
}

async function userIds(): Promise<string[]> {
  const v = await getSetting<string>(getPool(), 'wecom_userids', '');
  return String(v || '').split(/[,，\s]+/).map((x) => x.trim()).filter(Boolean).slice(0, 100);
}

/** 只用于日志：只记错误码 */
function logErr(e: unknown) {
  console.warn('[wecom]', String((e as Error)?.message ?? e).slice(0, 80));
}

/**
 * 某个入口的“加商会微信”二维码：企业微信可用 → “联系我”码（登录用户按人生成）；否则 → 后台上传的个人微信二维码。
 * 返回 null 表示两样都没有（页面显示“联系商会”）。
 */
export async function wechatQrFor(placement: string | null | undefined, contactId: string | null): Promise<{ url: string; kind: 'wecom' | 'personal' } | null> {
  const p: Placement = (WECOM_PLACEMENTS as readonly string[]).includes(String(placement)) ? (placement as Placement) : 'default';
  const pool = getPool();
  const personal = (await getSetting<string>(pool, 'wechat_qr_url', '')) || null;
  if (!wecomConfigured() || (await getSetting<boolean>(pool, 'wecom_enabled', true)) === false) return personal ? { url: personal, kind: 'personal' } : null;
  try {
    const { rows } = await pool.query<{ qr_url: string }>(
      `SELECT qr_url FROM wecom_contact_ways WHERE placement = $1 AND contact_id IS NOT DISTINCT FROM $2`,
      [p, contactId]
    );
    if (rows[0]) return { url: rows[0].qr_url, kind: 'wecom' };
    const users = await userIds();
    if (!users.length) return personal ? { url: personal, kind: 'personal' } : null;
    let state = `p.${P_CODE[p]}`;
    if (contactId) {
      const { rows: c } = await pool.query<{ member_no: number }>(`SELECT member_no::int AS member_no FROM contacts WHERE id = $1`, [contactId]);
      if (c[0]?.member_no) state = `m${c[0].member_no}.${P_CODE[p]}`;
      else contactId = null;
    }
    const d = await api<{ config_id: string; qr_code: string }>('externalcontact/add_contact_way', {
      type: users.length > 1 ? 2 : 1, scene: 2, state, user: users, skip_verify: true, remark: `SAREC ${PLACEMENT_LABEL[p]}`
    });
    await pool.query(
      `INSERT INTO wecom_contact_ways (placement, contact_id, state, config_id, qr_url) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [p, contactId, state, d.config_id, d.qr_code]
    );
    return { url: d.qr_code, kind: 'wecom' };
  } catch (e) {
    logErr(e);
    return personal ? { url: personal, kind: 'personal' } : null;
  }
}

// ── 回调（加好友 / 删好友）──────────────────────────────────────────────

const sha1 = (s: string) => createHash('sha1').update(s).digest('hex');
export function signatureOk(token: string, timestamp: string, nonce: string, encrypt: string, signature: string): boolean {
  return sha1([token, timestamp, nonce, encrypt].sort().join('')) === signature;
}

function aesKey(): Buffer {
  return Buffer.from(`${process.env.WECOM_CALLBACK_AES_KEY}=`, 'base64');
}

/** 企业微信回调消息解密（AES-256-CBC，PKCS#7 32 字节补位；明文 = 16 字节随机 + 4 字节长度 + 消息 + CorpID） */
export function decrypt(encrypt: string, key = aesKey(), corpId = process.env.WECOM_CORP_ID ?? ''): string {
  const d = createDecipheriv('aes-256-cbc', key, key.subarray(0, 16));
  d.setAutoPadding(false);
  let buf = Buffer.concat([d.update(Buffer.from(encrypt, 'base64')), d.final()]);
  const pad = buf[buf.length - 1];
  buf = buf.subarray(0, buf.length - (pad >= 1 && pad <= 32 ? pad : 0));
  const len = buf.readUInt32BE(16);
  const msg = buf.subarray(20, 20 + len).toString('utf8');
  const tail = buf.subarray(20 + len).toString('utf8');
  if (corpId && tail !== corpId) throw new Error('wecom corp mismatch');
  return msg;
}

/** 测试用：按企业微信的规则加密（回调单元测试） */
export function encryptForTest(msg: string, key: Buffer, corpId: string): string {
  const body = Buffer.concat([randomBytes(16), Buffer.alloc(4), Buffer.from(msg), Buffer.from(corpId)]);
  body.writeUInt32BE(Buffer.byteLength(msg), 16);
  const pad = 32 - (body.length % 32);
  const c = createCipheriv('aes-256-cbc', key, key.subarray(0, 16));
  c.setAutoPadding(false);
  return Buffer.concat([c.update(Buffer.concat([body, Buffer.alloc(pad, pad)])), c.final()]).toString('base64');
}

export function xmlField(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))</${name}>`));
  return m ? (m[1] ?? m[2] ?? '').trim() : null;
}

/** 把一次“加好友”记下来，并按 state（会员编号）或 unionid 关联到会员档案 */
export async function recordAdd(ev: { externalUserId: string; userId: string | null; state: string | null }, fetchDetail = true) {
  const pool = getPool();
  let name: string | null = null;
  let unionid: string | null = null;
  if (fetchDetail && wecomConfigured()) {
    try {
      const d = await api<{ external_contact?: { name?: string; unionid?: string } }>(`externalcontact/get?external_userid=${encodeURIComponent(ev.externalUserId)}`);
      name = d.external_contact?.name ?? null;
      unionid = d.external_contact?.unionid ?? null;
    } catch (e) {
      logErr(e);
    }
  }
  const st = ev.state ?? '';
  const m = st.match(/^(?:m(\d+)|p)\.([a-z])$/);
  const placement = m ? CODE_P[m[2]] ?? 'default' : null;
  let contactId: string | null = null;
  let matchedBy: string | null = null;
  if (m?.[1]) {
    const { rows } = await pool.query<{ id: string }>(`SELECT id FROM contacts WHERE member_no = $1`, [Number(m[1])]);
    if (rows[0]) { contactId = rows[0].id; matchedBy = 'state'; }
  }
  if (!contactId && unionid) {
    const { rows } = await pool.query<{ id: string }>(`SELECT id FROM contacts WHERE wechat_unionid = $1 LIMIT 1`, [unionid]);
    if (rows[0]) { contactId = rows[0].id; matchedBy = 'unionid'; }
  }
  await pool.query(
    `INSERT INTO wecom_external_contacts (external_userid, contact_id, follow_userid, state, placement, name, unionid, matched_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (external_userid) DO UPDATE SET
       contact_id = COALESCE(EXCLUDED.contact_id, wecom_external_contacts.contact_id),
       follow_userid = EXCLUDED.follow_userid, state = COALESCE(EXCLUDED.state, wecom_external_contacts.state),
       placement = COALESCE(EXCLUDED.placement, wecom_external_contacts.placement), name = COALESCE(EXCLUDED.name, wecom_external_contacts.name),
       unionid = COALESCE(EXCLUDED.unionid, wecom_external_contacts.unionid), matched_by = COALESCE(EXCLUDED.matched_by, wecom_external_contacts.matched_by),
       removed_at = NULL`,
    [ev.externalUserId, contactId, ev.userId, ev.state, placement, name, unionid, matchedBy]
  );
  // 来源计入统计（功能排行 / 渠道口径）：一次加好友 = 一条 wecom_add 记录
  await pool.query(
    `INSERT INTO track_events (name, client, contact_id, target, channel, meta) VALUES ('wecom_add', 'wecom', $1, $2, $3, $4)`,
    [contactId, placement ?? 'unknown', placement ? `wecom-${placement}` : null, JSON.stringify({ matchedBy })]
  ).catch(() => undefined);
  if (!contactId) {
    const { recordException } = await import('@/lib/crm/followups');
    await recordException('wecom_unmatched', `wecom:${ev.externalUserId}`, ev.externalUserId, `企业微信新好友${name ? `「${name}」` : ''}没能自动关联到会员档案（来源：${placement ? PLACEMENT_LABEL[placement] : '未知'}），可以在会员档案里手动核对`).catch(() => undefined);
  }
  return { contactId, matchedBy, placement };
}

export async function recordRemove(externalUserId: string) {
  await getPool().query(`UPDATE wecom_external_contacts SET removed_at = now() WHERE external_userid = $1`, [externalUserId]);
}

/** 后台“增长与设置”里显示：企业微信是否可用、每个入口加了多少好友、关联上多少 */
export async function wecomStatus() {
  const pool = getPool();
  const configured = wecomConfigured();
  const callback = !!(process.env.WECOM_CALLBACK_TOKEN && process.env.WECOM_CALLBACK_AES_KEY);
  const { rows } = await pool
    .query<{ placement: string | null; adds: number; matched: number }>(
      `SELECT placement, count(*)::int AS adds, count(contact_id)::int AS matched FROM wecom_external_contacts WHERE removed_at IS NULL GROUP BY placement ORDER BY adds DESC`
    )
    .catch(() => ({ rows: [] as { placement: string | null; adds: number; matched: number }[] }));
  let working = false;
  if (configured) {
    try {
      await accessToken();
      working = true;
    } catch (e) {
      logErr(e);
    }
  }
  return {
    configured, callback, working,
    byPlacement: rows.map((r) => ({ placement: r.placement, label: r.placement ? PLACEMENT_LABEL[r.placement as Placement] ?? r.placement : '未知', adds: r.adds, matched: r.matched }))
  };
}
