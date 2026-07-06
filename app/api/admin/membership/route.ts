/**
 * POST /api/admin/membership —— 管理员手工操作（M6）。
 * ------------------------------------------------------------------
 * - 仅 POST（GET→405，不允许 GET 改状态）。
 * - token 从 Authorization: Bearer 头取，常量时间比对；失败 401。token 绝不入 URL、不打日志。
 * - body: { action, ...params }。按 action 分派到 lib/admin/actions。
 * - 记录 ip / user-agent 到 admin_audit_log（在各 action 内）。
 * - 只返回安全错误信息，不泄露 DB/secret；node runtime，force-dynamic。
 */
import { NextResponse } from 'next/server';
import { verifyAdminRequest, isAdminConfigured } from '@/lib/admin/auth';
import {
  AdminError,
  listApplications,
  markPaymentPaid,
  updateSecondPaymentDueDate,
  markSecondPaymentPaid,
  reviewApplication,
  updateDisplayStatus,
  listOperations,
  getApplicationDetail,
  setOperationsStatus,
  type AdminCtx
} from '@/lib/admin/actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'not configured' }, { status: 503 });
  }
  if (!isAdminConfigured()) {
    // 未配置 ADMIN_ACTION_TOKEN → 一律拒绝，不允许无鉴权。
    return NextResponse.json({ error: 'admin not configured' }, { status: 503 });
  }
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const ctx: AdminCtx = {
    ip:
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null,
    userAgent: req.headers.get('user-agent') || null
  };

  const action = typeof body.action === 'string' ? body.action : '';

  try {
    let result: unknown;
    switch (action) {
      case 'list':
        result = { ok: true, applications: await listApplications() };
        break;
      case 'mark_payment_paid':
        result = await markPaymentPaid(body, ctx);
        break;
      case 'update_second_payment_due_date':
        result = await updateSecondPaymentDueDate(body, ctx);
        break;
      case 'mark_second_payment_paid':
        result = await markSecondPaymentPaid(body, ctx);
        break;
      case 'review_application':
        result = await reviewApplication(body, ctx);
        break;
      case 'update_display_status':
        result = await updateDisplayStatus(body, ctx);
        break;
      case 'list_operations':
        result = {
          ok: true,
          applications: await listOperations(
            typeof body.operationsStatus === 'string' ? body.operationsStatus : null
          )
        };
        break;
      case 'application_detail': {
        const detail = await getApplicationDetail(
          typeof body.applicationId === 'string' ? body.applicationId : ''
        );
        if (!detail) return NextResponse.json({ error: 'application not found' }, { status: 404 });
        result = { ok: true, ...detail };
        break;
      }
      case 'set_operations_status':
        result = await setOperationsStatus(body, ctx);
        break;
      default:
        return NextResponse.json({ error: `unknown action: ${action || '(none)'}` }, { status: 400 });
    }
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof AdminError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[admin] action error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}

export async function GET(): Promise<Response> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
