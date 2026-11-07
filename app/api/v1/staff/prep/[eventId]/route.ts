/** 1.3 M 某场活动的筹备清单（工作人员现场用手机打勾）
 *  GET —— 清单、负责人、拍摄清单、复盘
 *  POST { action: 'toggle'|'note'|'photo'|'edit'|'add'|'delete'|'assign'|'retro'|'applyRetro', … } */
import { addPrepItem, applyRetroToTemplate, assignRole, deletePrepItem, getEventPrep, saveRetro, updatePrepItem } from '@/lib/crm/prep';
import { CrmError } from '@/lib/crm/events';
import { actor } from '@/lib/crm/staff';
import { body, handler, ok, requireStaff, requireStaffAny } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { eventId: string } }) => {
  await requireStaffAny(req, ['ops', 'checkin']);
  return ok({ prep: await getEventPrep(params.eventId) });
});
export const POST = handler(async (req: Request, { params }: { params: { eventId: string } }) => {
  const s = await requireStaffAny(req, ['ops', 'checkin']);
  const b = await body<Record<string, unknown>>(req);
  const id = Number(b.itemId);
  // 现场签到账号只能打勾、写备注、传照片；改字、加删、分配、复盘只给运营（测试 P2）
  const isOps = s.roles.includes('ops') || s.roles.includes('admin');
  if (!isOps && !['toggle', 'note', 'photo'].includes(String(b.action))) throw new CrmError('forbidden', '这一步需要运营权限');
  switch (b.action) {
    case 'toggle': return ok(await updatePrepItem(params.eventId, id, s.name, { done: b.done === true }));
    case 'note': return ok(await updatePrepItem(params.eventId, id, s.name, { note: String(b.note ?? '') }));
    case 'photo': return ok(await updatePrepItem(params.eventId, id, s.name, { photoUrl: String(b.photoUrl ?? '') }));
    case 'edit': return ok(await updatePrepItem(params.eventId, id, s.name, { title: b.title, role: b.role }));
    case 'add': return ok(await addPrepItem(params.eventId, (b.item as Record<string, unknown>) ?? {}));
    case 'delete': return ok(await deletePrepItem(params.eventId, id));
    case 'assign': return ok(await assignRole(params.eventId, String(b.role ?? ''), { name: b.name, contact: b.contact }));
    case 'retro': return ok(await saveRetro(params.eventId, b.retro));
    case 'applyRetro': {
      if (!s.roles.includes('ops') && !s.roles.includes('admin')) throw new CrmError('forbidden', '只有运营可以改模板');
      return ok(await applyRetroToTemplate(params.eventId));
    }
    default: throw new CrmError('bad_request', '不支持的操作');
  }
});
void actor;
