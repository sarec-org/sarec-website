/**
 * 1.3 O：企业微信“客户联系”回调。
 * GET  —— 企业微信后台填回调地址时的校验（解密 echostr 原样返回）
 * POST —— 加好友 / 删好友事件：按 state（会员编号 + 入口）或 unionid 关联会员档案
 * 日志只记错误码，不记消息内容。
 */
import { decrypt, recordAdd, recordRemove, signatureOk, xmlField } from '@/lib/wecom';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cfgOk() {
  return !!(process.env.WECOM_CALLBACK_TOKEN && process.env.WECOM_CALLBACK_AES_KEY && process.env.WECOM_CORP_ID);
}

export async function GET(req: Request) {
  if (!cfgOk()) return new Response('not configured', { status: 503 });
  const u = new URL(req.url);
  const sig = u.searchParams.get('msg_signature') ?? '';
  const ts = u.searchParams.get('timestamp') ?? '';
  const nonce = u.searchParams.get('nonce') ?? '';
  const echo = u.searchParams.get('echostr') ?? '';
  if (!signatureOk(process.env.WECOM_CALLBACK_TOKEN!, ts, nonce, echo, sig)) return new Response('bad signature', { status: 401 });
  try {
    return new Response(decrypt(echo), { headers: { 'content-type': 'text/plain' } });
  } catch {
    return new Response('bad echostr', { status: 400 });
  }
}

export async function POST(req: Request) {
  if (!cfgOk()) return new Response('not configured', { status: 503 });
  const u = new URL(req.url);
  const raw = await req.text();
  const encrypt = xmlField(raw, 'Encrypt') ?? '';
  if (!signatureOk(process.env.WECOM_CALLBACK_TOKEN!, u.searchParams.get('timestamp') ?? '', u.searchParams.get('nonce') ?? '', encrypt, u.searchParams.get('msg_signature') ?? '')) {
    return new Response('bad signature', { status: 401 });
  }
  try {
    const xml = decrypt(encrypt);
    const event = xmlField(xml, 'Event');
    const change = xmlField(xml, 'ChangeType');
    const ext = xmlField(xml, 'ExternalUserID');
    if (event === 'change_external_contact' && ext) {
      if (change === 'add_external_contact' || change === 'add_half_external_contact') {
        await recordAdd({ externalUserId: ext, userId: xmlField(xml, 'UserID'), state: xmlField(xml, 'State') });
      } else if (change === 'del_follow_user' || change === 'del_external_contact') {
        await recordRemove(ext);
      }
    }
  } catch (e) {
    console.warn('[wecom-callback]', String((e as Error)?.message ?? e).slice(0, 60));
  }
  // 企业微信要求 5 秒内回 success，否则会重试
  return new Response('success', { headers: { 'content-type': 'text/plain' } });
}
