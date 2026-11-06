/**
 * 微信内容安全：文本检查（security.msgSecCheck v2）。
 * - 需要用户的小程序 openid（2 小时内访问过小程序）；没有 openid、没配 AppSecret 时返回 skipped，交给人工审核。
 * - suggest = risky：拒绝保存；review：照常保存，标“需人工复核”；pass：通过。
 * - 接口出错不阻断保存（返回 error），同样交给人工审核。
 */
import { wxAccessToken, wxConfigured } from './wechat';

export type SecResult = 'pass' | 'review' | 'risky' | 'skipped' | 'error';

/** scene：1 资料 2 评论 3 论坛 4 社交日志 */
export async function msgSecCheck(content: string, openid: string | null, scene: 1 | 2 | 3 | 4 = 1): Promise<SecResult> {
  const text = content.trim();
  if (!text) return 'pass';
  if (!openid || !wxConfigured()) return 'skipped';
  try {
    const token = await wxAccessToken();
    const res = await fetch(`https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text.slice(0, 2500), version: 2, scene, openid }),
      cache: 'no-store'
    });
    const d = (await res.json()) as { errcode?: number; result?: { suggest?: string } };
    if (d.errcode && d.errcode !== 0) return 'error';
    const s = d.result?.suggest;
    return s === 'risky' ? 'risky' : s === 'review' ? 'review' : 'pass';
  } catch {
    return 'error';
  }
}
