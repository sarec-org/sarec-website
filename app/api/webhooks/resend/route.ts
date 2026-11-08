/**
 * POST /api/webhooks/resend —— Resend 退信通知（email.bounced）→ 该邮箱标“无效”，用户下次打开时提示修改。
 * ------------------------------------------------------------------
 * 签名：Resend 用 Svix 签名（svix-id / svix-timestamp / svix-signature），密钥 RESEND_WEBHOOK_SECRET（whsec_…）。
 * 未配置密钥 → 拒绝；签名不对或超过 5 分钟 → 拒绝。密钥只从环境变量读，不打日志。
 */
import { NextResponse } from 'next/server';
import { markEmailBounced } from '@/lib/crm/contactInfo';
import { verifySvix } from '@/lib/crm/svix';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false }, { status: 401 });
  const payload = await req.text();
  const ok = verifySvix(
    secret,
    req.headers.get('svix-id') ?? '',
    req.headers.get('svix-timestamp') ?? '',
    payload,
    req.headers.get('svix-signature') ?? ''
  );
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });
  let evt: { type?: string; data?: { email_id?: string; to?: string[] | string; bounce?: { type?: string; subType?: string; message?: string } } };
  try {
    evt = JSON.parse(payload);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  // 邮件通讯统计：送达 / 打开 / 点击 / 投诉（投诉自动停发）
  const toList = Array.isArray(evt.data?.to) ? evt.data!.to : evt.data?.to ? [evt.data.to] : [];
  if (evt.type && ['email.delivered', 'email.opened', 'email.clicked', 'email.complained'].includes(evt.type)) {
    const { recordEmailEvent } = await import('@/lib/crm/newsletter');
    await recordEmailEvent(evt.type, evt.data?.email_id ?? null, toList).catch(() => undefined);
    return NextResponse.json({ ok: true });
  }
  if (evt.type !== 'email.bounced') return NextResponse.json({ ok: true, ignored: true });
  // 只处理永久退信（地址不存在等）；临时退信（邮箱满、暂时不可达）不标无效
  const bt = (evt.data?.bounce?.type ?? '').toLowerCase();
  if (bt && bt !== 'permanent' && bt !== 'hard') return NextResponse.json({ ok: true, ignored: 'transient' });
  const to = Array.isArray(evt.data?.to) ? evt.data!.to : evt.data?.to ? [evt.data.to] : [];
  let n = 0;
  for (const addr of to) n += await markEmailBounced(addr, `退信${evt.data?.bounce?.subType ? `（${evt.data.bounce.subType}）` : ''}`);
  const { recordEmailEvent } = await import('@/lib/crm/newsletter');
  await recordEmailEvent('email.bounced', evt.data?.email_id ?? null, to).catch(() => undefined);
  return NextResponse.json({ ok: true, marked: n });
}
