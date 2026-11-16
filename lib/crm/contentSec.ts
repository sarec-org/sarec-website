/**
 * 微信内容安全：文本检查（security.msgSecCheck v2）。
 * - 需要用户的小程序 openid（2 小时内访问过小程序）；没有 openid、没配 AppSecret 时返回 skipped，交给人工审核。
 * - suggest = risky：拒绝保存；review：照常保存，标“需人工复核”；pass：通过。
 * - 接口出错不阻断保存（返回 error），同样交给人工审核。
 */
import { withWxToken, wxConfigured } from './wechat';

export type SecResult = 'pass' | 'review' | 'risky' | 'skipped' | 'error';

/** scene：1 资料 2 评论 3 论坛 4 社交日志 */
export async function msgSecCheck(content: string, openid: string | null, scene: 1 | 2 | 3 | 4 = 1): Promise<SecResult> {
  const text = content.trim();
  if (!text) return 'pass';
  if (!openid || !wxConfigured()) return 'skipped';
  try {
    const d = await withWxToken(async (token) => {
      const res = await fetch(`https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text.slice(0, 2500), version: 2, scene, openid }),
        cache: 'no-store'
      });
      return (await res.json()) as { errcode?: number; result?: { suggest?: string } };
    }, (r) => r.errcode);
    if (d.errcode && d.errcode !== 0) return 'error';
    const s = d.result?.suggest;
    return s === 'risky' ? 'risky' : s === 'review' ? 'review' : 'pass';
  } catch {
    return 'error';
  }
}

/**
 * 1.5.0 微信图片内容安全检测（异步 media_check_async v2）：先提交、照常显示；结果由微信推到 /api/v1/wx/push，
 * 不通过的自动撤下并告诉本人。没配 AppSecret / 没有 openid 时返回 null（就是纯事后管理）。
 * 需要东哥在小程序后台「开发管理 → 开发设置 → 消息推送」配好服务器地址和 Token（见《待东哥过目》）。
 */
export async function mediaCheckAsync(mediaUrl: string, openid: string | null, scene: 1 | 2 | 3 | 4 = 1): Promise<string | null> {
  if (!openid || !wxConfigured() || !/^https:\/\//.test(mediaUrl)) return null;
  try {
    const d = await withWxToken(async (token) => {
      const res = await fetch(`https://api.weixin.qq.com/wxa/media_check_async?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_url: mediaUrl, media_type: 2, version: 2, scene, openid }),
        cache: 'no-store'
      });
      return (await res.json()) as { errcode?: number; trace_id?: string };
    }, (r) => r.errcode);
    return d.errcode ? null : d.trace_id ?? null;
  } catch {
    return null;
  }
}
