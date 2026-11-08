/**
 * 1.3 B：带一位朋友（同行人）
 * - 报名后可以替朋友登记：姓名 + 手机。朋友单独一条报名，单独占名额、单独签到，标记“由 XX 代报名”。
 * - 每份报名最多带几位：后台设置 companions_max（默认 2），不用改版本。
 * - 按手机号去重：这个手机号已经报了这场 → 不重复登记。
 * - 不替朋友建正式账号、不进营销名单：手机号查不到任何档案时，只建一份“占位档案”（is_placeholder，不能登录）。
 *   朋友第一次自己扫码 / 报名、填了同一个手机号时，占位档案并入他自己的档案（mergePlaceholderByPhone）。
 */
import type { PoolClient } from 'pg';
import { getPool, withTransaction } from '@/lib/db/client';
import { CrmError, normalizePhone, startRegistration } from './events';
import { requireEvent } from './flow';
import { getSetting } from './orders';
import { mergeContactInto } from './merge';
import type { Db } from './profile';

export async function companionsMax(db: Db = getPool()): Promise<number> {
  const n = Number(await getSetting<number>(db, 'companions_max', 2));
  return Number.isFinite(n) && n >= 0 ? Math.min(5, Math.floor(n)) : 2;
}

const mask = (p: string | null) => {
  if (!p) return null;
  const cc = p.startsWith('+1') && p.length === 12 ? '+1' : p.startsWith('+86') ? '+86' : (p.match(/^\+\d{1,3}/)?.[0] ?? '');
  return `${cc} ••• ${p.slice(-4)}`;
};

async function inviterRegistration(db: Db, slug: string, inviter: string) {
  const { rows } = await db.query<{ id: string; event_id: string; status: string }>(
    `SELECT r.id, r.event_id, r.status FROM registrations r JOIN events e ON e.id = r.event_id WHERE e.slug = $1 AND r.contact_id = $2`,
    [slug, inviter]
  );
  const r = rows[0];
  if (!r || r.status === 'cancelled') throw new CrmError('not_registered', '请先给自己报名，再带朋友');
  return r;
}

export type Companion = { id: string; name: string; phoneMasked: string | null; status: string; arrival: string };

export async function listCompanions(slug: string, inviter: string): Promise<{ max: number; companions: Companion[] }> {
  const pool = getPool();
  const { rows: own } = await pool.query<{ id: string }>(
    `SELECT r.id FROM registrations r JOIN events e ON e.id = r.event_id WHERE e.slug = $1 AND r.contact_id = $2`,
    [slug, inviter]
  );
  const max = await companionsMax(pool);
  if (!own[0]) return { max, companions: [] };
  // 只显示邀请人自己填的名字和号码，不回显档案里的真实姓名（测试 P1-5）
  const { rows } = await pool.query<{ id: string; name: string; phone: string | null; status: string; arrival_status: string }>(
    `SELECT r.id, COALESCE(r.companion_name, '朋友') AS name, r.companion_phone AS phone, r.status, r.arrival_status
       FROM registrations r
      WHERE r.companion_of = $1 AND r.status <> 'cancelled' ORDER BY r.created_at`,
    [own[0].id]
  );
  return { max, companions: rows.map((r) => ({ id: r.id, name: r.name, phoneMasked: mask(r.phone), status: r.status, arrival: r.arrival_status })) };
}

export async function addCompanion(slug: string, inviter: string, input: { name?: unknown; phone?: unknown; cc?: unknown }) {
  const name = typeof input.name === 'string' ? input.name.trim().slice(0, 60) : '';
  const raw = typeof input.phone === 'string' ? input.phone : '';
  const phone = raw.trim().startsWith('+') ? normalizePhone(raw) : normalizePhone(raw, input.cc === '+86' ? '+86' : '+1');
  if (!name) throw new CrmError('bad_request', '请填写朋友的姓名');
  if (!phone) throw new CrmError('bad_phone', '朋友的手机号好像不对，请检查一下（美国号码 10 位）');
  return withTransaction(async (db) => {
    const ev = await requireEvent(db, slug);
    const own = await inviterRegistration(db, slug, inviter);
    const max = await companionsMax(db);
    const { rows: cnt } = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM registrations WHERE companion_of = $1 AND status <> 'cancelled'`, [own.id]);
    if ((cnt[0]?.n ?? 0) >= max) throw new CrmError('too_many', `每人最多带 ${max} 位朋友`);
    // 自己的号码：档案手机号或联系方式里的手机号（小程序用户的号码多半在 contact_methods 里）
    const { rows: mine } = await db.query(
      `SELECT 1 FROM contacts c WHERE c.id = $1 AND (c.phone_e164 = $2 OR EXISTS (SELECT 1 FROM contact_methods m WHERE m.contact_id = c.id AND m.kind = 'phone' AND m.value = $2))`,
      [inviter, phone]
    );
    if (mine[0]) throw new CrmError('bad_phone', '这是您自己的手机号，请填朋友的');

    // 同一个号码已经被代报过这场：不重复登记（不透露是谁）
    const { rows: dupe } = await db.query(
      `SELECT 1 FROM registrations r WHERE r.event_id = $1 AND r.companion_phone = $2 AND r.status <> 'cancelled' LIMIT 1`,
      [ev.id, phone]
    );
    if (dupe[0]) return { added: false, already: true, message: '这个手机号已经登记过了，不用再登记' };

    // 只匹配占位档案；号码属于正式会员时不碰那份档案（不回显姓名、不替他报名），另建一份不带号码的占位档案，
    // 号码记在这条报名上，朋友本人扫码签到时再并入他自己的档案
    const { rows: ph } = await db.query<{ id: string }>(`SELECT id FROM contacts WHERE is_placeholder AND phone_e164 = $1 LIMIT 1`, [phone]);
    let contactId = ph[0]?.id ?? null;
    if (contactId) {
      const { rows: reg } = await db.query<{ status: string }>(`SELECT status FROM registrations WHERE event_id = $1 AND contact_id = $2`, [ev.id, contactId]);
      if (reg[0] && reg[0].status !== 'cancelled') return { added: false, already: true, message: '这个手机号已经登记过了，不用再登记' };
    } else {
      const { rows: owned } = await db.query(
        `SELECT 1 FROM contacts c WHERE c.phone_e164 = $1 OR EXISTS (SELECT 1 FROM contact_methods m WHERE m.contact_id = c.id AND m.kind = 'phone' AND m.value = $1 AND m.is_current) LIMIT 1`,
        [phone]
      );
      const { rows: ins } = await db.query<{ id: string }>(
        `INSERT INTO contacts (name, phone_e164, acquisition_source, is_placeholder) VALUES ($1, $2, 'companion', true) RETURNING id`,
        [name, owned[0] ? null : phone]
      );
      contactId = ins[0].id;
    }
    const out = await startRegistration(db as PoolClient, ev, contactId, { source: 'companion', refContactId: inviter });
    await db.query(
      `UPDATE registrations SET companion_of = $2, added_by = $3, source = 'companion', companion_name = $4, companion_phone = $5, updated_at = now() WHERE id = $1`,
      [out.registration.id, own.id, inviter, name, phone]
    );
    const waitlisted = out.registration.status === 'waitlisted';
    return {
      added: true,
      already: false,
      status: out.registration.status,
      message: waitlisted ? `已为 ${name} 登记，本场已满，${name} 在候补名单里` : `已为 ${name} 报名。到场时 ${name} 用自己的微信扫门口签到码，填这个手机号就能签到`
    };
  });
}

export async function removeCompanion(slug: string, inviter: string, companionRegId: string) {
  return withTransaction(async (db) => {
    const own = await inviterRegistration(db, slug, inviter);
    const { rows } = await db.query<{ arrival_status: string }>(
      `UPDATE registrations SET status = 'cancelled', cancelled_at = now(), updated_at = now()
        WHERE id = $1 AND companion_of = $2 AND arrival_status = 'none' AND status <> 'cancelled' RETURNING arrival_status`,
      [companionRegId, own.id]
    );
    if (!rows[0]) throw new CrmError('not_found', '找不到这位朋友的报名，或已经签到了不能取消');
    return { removed: true };
  });
}

/**
 * 朋友自己来了：手机号对上一份占位档案时，把占位档案（含代报名记录）并入他自己的档案。
 * 在报名 / 签到填了手机号之后调用；必须在事务里。
 */
export async function mergePlaceholderByPhone(db: Db, contactId: string, phone: string | null | undefined): Promise<boolean> {
  if (!phone) return false;
  const { rows } = await db.query<{ id: string }>(
    `SELECT c.id FROM contacts c
      WHERE c.is_placeholder AND c.id <> $2
        AND (c.phone_e164 = $1 OR EXISTS (SELECT 1 FROM registrations r WHERE r.contact_id = c.id AND r.companion_phone = $1 AND r.status <> 'cancelled'))
      ORDER BY c.created_at LIMIT 1`,
    [phone, contactId]
  );
  if (!rows[0]) return false;
  await mergeContactInto(db, rows[0].id, contactId);
  return true;
}
