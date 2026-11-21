/** 找工人 · 接活：谁在看（登录、工作人员、小程序）、开关把门、小程序不碰活儿（D1） */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { staffFor } from '@/lib/crm/auth';
import { isMiniProgramRequest, optionalContact } from '@/lib/crm/http';
import type { Db } from '@/lib/crm/profile';
import { getSwitches, type Switches } from './settings';
import { CLOSED_TEXT } from './constants';

export type Viewer = { contactId: string | null; staff: boolean; staffName: string | null; mp: boolean; switches: Switches };

export async function viewer(req: Request): Promise<Viewer> {
  const contactId = await optionalContact(req);
  const s = contactId ? await staffFor(contactId) : null;
  return { contactId, staff: !!s, staffName: s?.name ?? s?.email ?? null, mp: await isMiniProgramRequest(req), switches: await getSwitches() };
}

/** 开关关着：工作人员照样能用（D3），其他人看到“这个功能还没开放” */
export function requireSide(v: Viewer, side: 'find' | 'work'): void {
  if (v.staff) return;
  if (!v.switches[side]) throw new CrmError('not_open', CLOSED_TEXT);
}

/** 小程序（版本头 mp-、servicewechat 来源、小程序会话）调用活儿相关接口一律 404（D1：活儿只在网站） */
export async function denyMpPosts(req: Request): Promise<void> {
  if (await isMiniProgramRequest(req)) throw new CrmError('not_found', '活儿在商会网站发布和查看');
}

export function requireLogin(v: Viewer): string {
  if (!v.contactId) throw new CrmError('unauthorized', '请先登录（用邮箱或手机号收验证码即可）');
  return v.contactId;
}

/** 已验证的手机号（档案上的或联系方式里确认过的） */
export async function verifiedPhone(db: Db, contactId: string): Promise<string | null> {
  const { rows } = await db.query<{ phone: string | null }>(
    `SELECT CASE WHEN c.phone_verified_at IS NOT NULL THEN c.phone_e164 END AS phone FROM contacts c WHERE c.id = $1
     UNION ALL
     SELECT m.value FROM contact_methods m WHERE m.contact_id = $1 AND m.kind = 'phone' AND m.status = 'confirmed' AND m.is_current`,
    [contactId]
  ).catch(() => getPool().query<{ phone: string | null }>(`SELECT CASE WHEN phone_verified_at IS NOT NULL THEN phone_e164 END AS phone FROM contacts WHERE id = $1`, [contactId]));
  return rows.find((r) => r.phone)?.phone ?? null;
}

/** 任意手机号（发通知用；没验证的也算） */
export async function anyPhone(db: Db, contactId: string): Promise<string | null> {
  return (await verifiedPhone(db, contactId)) ?? (await db.query<{ p: string | null }>(`SELECT phone_e164 AS p FROM contacts WHERE id = $1`, [contactId])).rows[0]?.p ?? null;
}
