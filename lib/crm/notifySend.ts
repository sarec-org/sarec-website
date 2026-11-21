/**
 * 后台综合优化（子任务 C）：真正的发送函数（短信 / 邮件 / 企业微信），全部经 B 的总闸 lib/crm/notifyGate.ts 的 gateSend。
 * 不改 notifyGate 的任何签名，只在它外面包一层：
 *   gatedSend(m) = gateSend(m, () => sendVia(m))
 * - 没配置的渠道自动不用：sendVia 抛错 → 总闸记 failed，调用方可改用别的渠道。
 * - 企业微信“应用消息”需要 WECOM_CORP_ID + WECOM_AGENT_ID + WECOM_AGENT_SECRET；现在没配，自动不用（不新增 Vercel 变量）。
 * - 测试里可以换成假的发送（setTransportForTest），检查“真发了什么”。
 */
import { getPool } from '@/lib/db/client';
import { gateSend, type NotifyMessage, type NotifyStatus } from './notifyGate';
import { setSetting } from './orders';

export function wecomAppConfigured(): boolean {
  return !!(process.env.WECOM_CORP_ID && process.env.WECOM_AGENT_ID && process.env.WECOM_AGENT_SECRET);
}

type Transport = (m: NotifyMessage) => Promise<void>;

const realTransport: Transport = async (m) => {
  if (m.channel === 'sms') {
    const { smsSend } = await import('./payLinks');
    if (!(await smsSend(m.to, m.text))) throw new Error('短信没发出去（短信服务未配置或号码有误）');
    return;
  }
  if (m.channel === 'email') {
    const { getResend, getFromAddress, isEmailConfigured } = await import('@/lib/email/resend-client');
    if (!isEmailConfigured()) throw new Error('邮件服务未配置');
    const res = await getResend().emails.send({ from: getFromAddress(), to: m.to, subject: m.subject || 'SAREC 通知', text: m.text });
    if (res.error) throw new Error('邮件没发出去');
    return;
  }
  if (!wecomAppConfigured()) throw new Error('企业微信应用消息没配置');
  const tok = (await (await fetch(`https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${encodeURIComponent(process.env.WECOM_CORP_ID!)}&corpsecret=${encodeURIComponent(process.env.WECOM_AGENT_SECRET!)}`)).json()) as { access_token?: string };
  if (!tok.access_token) throw new Error('企业微信取令牌失败');
  const d = (await (await fetch(`https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${tok.access_token}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ touser: m.to, msgtype: 'text', agentid: Number(process.env.WECOM_AGENT_ID), text: { content: m.text } })
  })).json()) as { errcode?: number };
  if (d.errcode) throw new Error(`企业微信发送失败（${d.errcode}）`);
};

let transport: Transport = realTransport;
/** 测试用：换成假的发送；传 null 恢复 */
export function setTransportForTest(t: Transport | null) {
  transport = t ?? realTransport;
}

/** 过总闸发一条（C 的所有对外发送都走这里） */
export async function gatedSend(m: NotifyMessage): Promise<{ status: NotifyStatus }> {
  return gateSend(m, () => transport(m));
}

/** 状态的人话 */
export const GATE_STATUS_TEXT: Record<NotifyStatus, string> = {
  sent: '已发出',
  held: '只记录没发（通知总闸关着）',
  blocked: '只记录没发（测试站只发测试身份）',
  failed: '没发出去',
  duplicate: '同一件事已经发过 / 记过'
};

/** 管理员在「手机通知」页开关总闸（打开要东哥点头）。B 的 notifyGate 只读，这里写同一个设置 notify_live */
export async function setNotifyLive(on: boolean, by: string): Promise<void> {
  await setSetting(getPool(), 'notify_live', !!on, by);
}

/** 后台“发送记录”：最近的（收件人已打码） */
export async function recentNotifyLog(limit = 100) {
  const { rows } = await getPool().query(
    `SELECT id, kind, channel, to_masked, subject, body, status, error, created_at FROM notify_log ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
}
