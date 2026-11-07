/**
 * 1.3 M：活动筹备清单（只在网站后台，不进小程序）。
 * - 模板按活动类型建（内置「讲座」「私企面对面」，可增删、改字、调顺序、改提前时间和负责角色）。
 * - 生成清单时把模板整份拷进这场活动：之后改模板不影响已生成的清单。
 * - 截止时间按活动开始 / 结束时间倒推（anchor + offset_minutes）。
 * - 负责角色在本场分配到具体的人（姓名 + 手机或邮箱），一人可以多角色；一项多个角色用“、”分开。
 * - 提醒按规则发、不调 AI：截止前一天邮件提醒负责人；活动前 2 天给东哥一封“还没完成的事项”。
 * - 复盘：写下缺了什么、多余什么；“把这次的改动加进模板”一键同步（新增的项加进模板、删掉的项从模板删、改过字的同步）。
 */
import { getPool, withTransaction } from '@/lib/db/client';
import { CrmError } from './events';
import type { Db } from './profile';

export type TemplateItem = { id: number; sort_order: number; anchor: 'start' | 'end'; offset_minutes: number; when_label: string; title: string; role: string };
export type Template = { id: number; key: string; name: string; roles: string[]; shooting_list: string | null; settings: Record<string, unknown>; items: TemplateItem[] };
export type PrepItem = { id: number; sort_order: number; when_label: string; title: string; role: string; due_at: string; done_at: string | null; done_by: string | null; note: string | null; photo_url: string | null; from_template_item: number | null };

const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
export const rolesOf = (role: string) => role.split('、').map((r) => r.trim()).filter(Boolean);

// ── 模板 ───────────────────────────────────────────────────────────────

export async function listTemplates(db: Db = getPool()): Promise<Template[]> {
  const { rows } = await db.query<Omit<Template, 'items'>>(`SELECT id, key, name, roles, shooting_list, settings FROM prep_templates ORDER BY sort_order, id`);
  const { rows: items } = await db.query<TemplateItem & { template_id: number }>(
    `SELECT id, template_id, sort_order, anchor, offset_minutes, when_label, title, role FROM prep_template_items ORDER BY template_id, sort_order, id`
  );
  return rows.map((t) => ({ ...t, items: items.filter((i) => i.template_id === t.id) }));
}

export async function saveTemplate(b: { id?: unknown; key?: unknown; name?: unknown; roles?: unknown; shootingList?: unknown; settings?: unknown }) {
  const name = str(b.name, 60);
  if (!name) throw new CrmError('bad_request', '请填写模板名称');
  const roles = Array.isArray(b.roles) ? b.roles.map((r) => str(r, 30)).filter(Boolean).slice(0, 20) : [];
  const settings = b.settings && typeof b.settings === 'object' && !Array.isArray(b.settings) ? b.settings : {};
  if (b.id) {
    const { rows } = await getPool().query(
      `UPDATE prep_templates SET name = $2, roles = $3, shooting_list = $4, settings = $5, updated_at = now() WHERE id = $1 RETURNING id`,
      [Number(b.id), name, JSON.stringify(roles), str(b.shootingList, 4000) || null, JSON.stringify(settings)]
    );
    if (!rows[0]) throw new CrmError('not_found', '找不到这个模板');
    return { id: Number(b.id) };
  }
  const key = (str(b.key, 30) || `t${Date.now().toString(36)}`).toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const { rows } = await getPool().query<{ id: number }>(
    `INSERT INTO prep_templates (key, name, roles, shooting_list, settings, sort_order) VALUES ($1, $2, $3, $4, $5, 100) RETURNING id`,
    [key, name, JSON.stringify(roles), str(b.shootingList, 4000) || null, JSON.stringify(settings)]
  );
  return { id: rows[0].id };
}

export async function deleteTemplate(id: number) {
  await getPool().query(`DELETE FROM prep_templates WHERE id = $1`, [id]);
  return { ok: true };
}

function parseItem(b: Record<string, unknown>) {
  const title = str(b.title, 300);
  const role = str(b.role, 120);
  const whenLabel = str(b.whenLabel, 30);
  if (!title) throw new CrmError('bad_request', '请填写事项内容');
  if (!role) throw new CrmError('bad_request', '请选择负责角色');
  const anchor = b.anchor === 'end' ? 'end' : 'start';
  const offset = Math.round(Number(b.offsetMinutes));
  if (!Number.isFinite(offset) || Math.abs(offset) > 60 * 24 * 120) throw new CrmError('bad_request', '提前时间不对');
  return { title, role, whenLabel: whenLabel || defaultLabel(anchor, offset), anchor, offset };
}

/** “14 天”“当天 −1 小时”“结束前 5 分钟”“会后 1 天” */
export function defaultLabel(anchor: 'start' | 'end', offset: number): string {
  const abs = Math.abs(offset);
  const span = abs >= 1440 && abs % 1440 === 0 ? `${abs / 1440} 天` : abs >= 60 && abs % 60 === 0 ? `${abs / 60} 小时` : `${abs} 分钟`;
  if (anchor === 'start') return offset === 0 ? '当天' : offset < 0 ? (abs >= 1440 ? `提前 ${span}` : `当天 −${span}`) : `开始后 ${span}`;
  return offset === 0 ? '结束时' : offset < 0 ? `结束前 ${span}` : `会后 ${span}`;
}

export async function saveTemplateItem(templateId: number, b: Record<string, unknown>) {
  const it = parseItem(b);
  if (b.id) {
    await getPool().query(
      `UPDATE prep_template_items SET title = $2, role = $3, when_label = $4, anchor = $5, offset_minutes = $6 WHERE id = $1 AND template_id = $7`,
      [Number(b.id), it.title, it.role, it.whenLabel, it.anchor, it.offset, templateId]
    );
    return { id: Number(b.id) };
  }
  const { rows } = await getPool().query<{ id: number }>(
    `INSERT INTO prep_template_items (template_id, sort_order, anchor, offset_minutes, when_label, title, role)
     VALUES ($1, COALESCE((SELECT max(sort_order) + 1 FROM prep_template_items WHERE template_id = $1), 1), $2, $3, $4, $5, $6) RETURNING id`,
    [templateId, it.anchor, it.offset, it.whenLabel, it.title, it.role]
  );
  return { id: rows[0].id };
}

export async function deleteTemplateItem(templateId: number, itemId: number) {
  await getPool().query(`DELETE FROM prep_template_items WHERE id = $1 AND template_id = $2`, [itemId, templateId]);
  return { ok: true };
}

/** 调顺序：传入这个模板全部项的 id，按新顺序 */
export async function reorderTemplateItems(templateId: number, ids: unknown) {
  if (!Array.isArray(ids)) throw new CrmError('bad_request', '格式不对');
  await withTransaction(async (db) => {
    for (let i = 0; i < ids.length; i++) await db.query(`UPDATE prep_template_items SET sort_order = $3 WHERE id = $1 AND template_id = $2`, [Number(ids[i]), templateId, i + 1]);
  });
  return { ok: true };
}

// ── 每场活动的清单 ─────────────────────────────────────────────────────

function dueAt(ev: { starts_at: Date; ends_at: Date | null }, anchor: string, offset: number): Date {
  const st = new Date(ev.starts_at).getTime();
  const en = ev.ends_at ? new Date(ev.ends_at).getTime() : st + 3 * 3600_000;
  return new Date((anchor === 'end' ? en : st) + offset * 60_000);
}

/** 按模板为这场活动生成清单（已经有清单就不重复生成） */
export async function createEventPrep(eventId: string, templateKey: string) {
  return withTransaction(async (db) => {
    const { rows: evr } = await db.query<{ id: string; starts_at: Date; ends_at: Date | null }>(`SELECT id, starts_at, ends_at FROM events WHERE id = $1`, [eventId]);
    if (!evr[0]) throw new CrmError('not_found', '找不到这场活动');
    const { rows: ex } = await db.query(`SELECT 1 FROM event_prep WHERE event_id = $1`, [eventId]);
    if (ex[0]) return { created: false };
    const t = (await listTemplates(db)).find((x) => x.key === templateKey);
    if (!t) throw new CrmError('not_found', '找不到这个活动类型的模板');
    await db.query(
      `INSERT INTO event_prep (event_id, template_id, template_key, roles, shooting_list, settings) VALUES ($1, $2, $3, $4, $5, $6)`,
      [eventId, t.id, t.key, JSON.stringify(t.roles), t.shooting_list, JSON.stringify(t.settings)]
    );
    for (const it of t.items) {
      await db.query(
        `INSERT INTO event_prep_items (event_id, sort_order, when_label, title, role, due_at, from_template_item) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [eventId, it.sort_order, it.when_label, it.title, it.role, dueAt(evr[0], it.anchor, it.offset_minutes), it.id]
      );
    }
    return { created: true, items: t.items.length };
  });
}

export async function getEventPrep(eventId: string) {
  const pool = getPool();
  const { rows } = await pool.query<{ event_id: string; template_id: number | null; template_key: string | null; roles: string[]; assignees: Record<string, { name: string; contact: string }>; shooting_list: string | null; settings: Record<string, unknown>; retro: string | null; retro_applied_at: Date | null; title: string; slug: string; starts_at: Date; ends_at: Date | null; fee_cents: number }>(
    `SELECT p.*, e.title, e.slug, e.starts_at, e.ends_at, e.fee_cents FROM event_prep p JOIN events e ON e.id = p.event_id WHERE p.event_id = $1`,
    [eventId]
  );
  if (!rows[0]) return null;
  const { rows: items } = await pool.query<PrepItem>(
    `SELECT id, sort_order, when_label, title, role, due_at, done_at, done_by, note, photo_url, from_template_item FROM event_prep_items WHERE event_id = $1 ORDER BY due_at, sort_order, id`,
    [eventId]
  );
  return { ...rows[0], items };
}

export async function listEventPreps() {
  const { rows } = await getPool().query(
    `SELECT e.id AS event_id, e.title, e.starts_at, p.template_key,
            (SELECT count(*)::int FROM event_prep_items i WHERE i.event_id = e.id) AS total,
            (SELECT count(*)::int FROM event_prep_items i WHERE i.event_id = e.id AND i.done_at IS NOT NULL) AS done,
            (SELECT count(*)::int FROM event_prep_items i WHERE i.event_id = e.id AND i.done_at IS NULL AND i.due_at < now()) AS overdue
       FROM event_prep p JOIN events e ON e.id = p.event_id
      ORDER BY (e.starts_at < now() - interval '3 days'), e.starts_at LIMIT 60`
  );
  return rows;
}

export async function assignRole(eventId: string, role: string, who: { name?: unknown; contact?: unknown }) {
  const r = str(role, 30);
  if (!r) throw new CrmError('bad_request', '角色不对');
  const name = str(who.name, 40);
  const contact = str(who.contact, 80);
  await getPool().query(
    `UPDATE event_prep SET assignees = CASE WHEN $3 = '' THEN assignees - $2 ELSE jsonb_set(assignees, ARRAY[$2], jsonb_build_object('name', $3::text, 'contact', $4::text)) END WHERE event_id = $1`,
    [eventId, r, name, contact]
  );
  return { ok: true };
}

export async function updatePrepItem(eventId: string, itemId: number, actor: string, b: { done?: unknown; note?: unknown; photoUrl?: unknown; title?: unknown; role?: unknown; dueAt?: unknown }) {
  const pool = getPool();
  if (typeof b.done === 'boolean') {
    await pool.query(
      `UPDATE event_prep_items SET done_at = CASE WHEN $3 THEN now() ELSE NULL END, done_by = CASE WHEN $3 THEN $4 ELSE NULL END WHERE id = $1 AND event_id = $2`,
      [itemId, eventId, b.done, actor]
    );
  }
  if (typeof b.note === 'string') await pool.query(`UPDATE event_prep_items SET note = NULLIF($3, '') WHERE id = $1 AND event_id = $2`, [itemId, eventId, b.note.slice(0, 1000)]);
  if (typeof b.photoUrl === 'string' && /^https:\/\//.test(b.photoUrl)) await pool.query(`UPDATE event_prep_items SET photo_url = $3 WHERE id = $1 AND event_id = $2`, [itemId, eventId, b.photoUrl]);
  if (typeof b.title === 'string' && b.title.trim()) await pool.query(`UPDATE event_prep_items SET title = $3 WHERE id = $1 AND event_id = $2`, [itemId, eventId, b.title.trim().slice(0, 300)]);
  if (typeof b.role === 'string' && b.role.trim()) await pool.query(`UPDATE event_prep_items SET role = $3 WHERE id = $1 AND event_id = $2`, [itemId, eventId, b.role.trim().slice(0, 120)]);
  return { ok: true };
}

/** 这场临时加一项（复盘时可以一键加进模板） */
export async function addPrepItem(eventId: string, b: Record<string, unknown>) {
  const it = parseItem(b);
  const pool = getPool();
  const { rows: evr } = await pool.query<{ starts_at: Date; ends_at: Date | null }>(`SELECT starts_at, ends_at FROM events WHERE id = $1`, [eventId]);
  if (!evr[0]) throw new CrmError('not_found', '找不到这场活动');
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO event_prep_items (event_id, sort_order, when_label, title, role, due_at) VALUES ($1, 999, $2, $3, $4, $5) RETURNING id`,
    [eventId, it.whenLabel, it.title, it.role, dueAt(evr[0], it.anchor, it.offset)]
  );
  // 记下 anchor / offset，复盘加进模板时用
  await pool.query(`UPDATE event_prep_items SET note = COALESCE(note, '') WHERE id = $1`, [rows[0].id]);
  await pool.query(
    `UPDATE event_prep SET settings = jsonb_set(settings, '{newItems}', COALESCE(settings->'newItems', '{}'::jsonb) || jsonb_build_object($2::text, jsonb_build_object('anchor', $3::text, 'offset', $4::int))) WHERE event_id = $1`,
    [eventId, String(rows[0].id), it.anchor, it.offset]
  );
  return { id: rows[0].id };
}

export async function deletePrepItem(eventId: string, itemId: number) {
  const pool = getPool();
  const { rows } = await pool.query<{ from_template_item: number | null }>(`DELETE FROM event_prep_items WHERE id = $1 AND event_id = $2 RETURNING from_template_item`, [itemId, eventId]);
  // 记下“这场删掉了模板里的哪一项”，复盘时可以一键从模板删
  if (rows[0]?.from_template_item) {
    await pool.query(
      `UPDATE event_prep SET settings = jsonb_set(settings, '{removedTemplateItems}', COALESCE(settings->'removedTemplateItems', '[]'::jsonb) || to_jsonb($2::bigint)) WHERE event_id = $1`,
      [eventId, rows[0].from_template_item]
    );
  }
  return { ok: true };
}

export async function saveRetro(eventId: string, retro: unknown) {
  await getPool().query(`UPDATE event_prep SET retro = $2 WHERE event_id = $1`, [eventId, str(retro, 4000) || null]);
  return { ok: true };
}

/** 复盘：把这场的改动一键加进模板（新增的项、删掉的项、改过字或负责人的项） */
export async function applyRetroToTemplate(eventId: string) {
  return withTransaction(async (db) => {
    const { rows: pr } = await db.query<{ template_id: number | null; settings: { newItems?: Record<string, { anchor: string; offset: number }>; removedTemplateItems?: number[] } }>(
      `SELECT template_id, settings FROM event_prep WHERE event_id = $1`,
      [eventId]
    );
    const p = pr[0];
    if (!p?.template_id) throw new CrmError('not_found', '这场的模板已经不存在了');
    const { rows: items } = await db.query<PrepItem>(`SELECT id, when_label, title, role, from_template_item FROM event_prep_items WHERE event_id = $1`, [eventId]);
    let added = 0, removed = 0, edited = 0;
    for (const it of items) {
      if (it.from_template_item) {
        const r = await db.query(
          `UPDATE prep_template_items SET title = $2, role = $3 WHERE id = $1 AND template_id = $4 AND (title <> $2 OR role <> $3)`,
          [it.from_template_item, it.title, it.role, p.template_id]
        );
        edited += r.rowCount ?? 0;
      } else {
        const meta = p.settings?.newItems?.[String(it.id)];
        if (!meta) continue;
        const { rows: ins } = await db.query<{ id: number }>(
          `INSERT INTO prep_template_items (template_id, sort_order, anchor, offset_minutes, when_label, title, role)
           VALUES ($1, COALESCE((SELECT max(sort_order) + 1 FROM prep_template_items WHERE template_id = $1), 1), $2, $3, $4, $5, $6) RETURNING id`,
          [p.template_id, meta.anchor === 'end' ? 'end' : 'start', Number(meta.offset) || 0, it.when_label, it.title, it.role]
        );
        await db.query(`UPDATE event_prep_items SET from_template_item = $2 WHERE id = $1`, [it.id, ins[0].id]);
        added++;
      }
    }
    for (const tid of p.settings?.removedTemplateItems ?? []) {
      const r = await db.query(`DELETE FROM prep_template_items WHERE id = $1 AND template_id = $2`, [tid, p.template_id]);
      removed += r.rowCount ?? 0;
    }
    await db.query(
      `UPDATE event_prep SET retro_applied_at = now(), settings = (settings - 'newItems') - 'removedTemplateItems' WHERE event_id = $1`,
      [eventId]
    );
    await db.query(`UPDATE prep_templates SET updated_at = now() WHERE id = $1`, [p.template_id]);
    return { added, removed, edited };
  });
}

// ── 提醒（每天的定时任务调用；按规则发，不调 AI）──────────────────────────

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function runPrepReminders(now: Date = new Date()): Promise<{ reminded: number; summaries: number; skippedNoEmail: number }> {
  const { getResend, getFromAddress, isEmailConfigured } = await import('@/lib/email/resend-client');
  const { digestEmail } = await import('@/lib/agent/config');
  if (!isEmailConfigured()) return { reminded: 0, summaries: 0, skippedNoEmail: 0 };
  const pool = getPool();
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://sinoamericanrec.org').replace(/\/$/, '');
  const fmt = (d: Date) => new Intl.DateTimeFormat('zh-CN', { timeZone: 'America/Los_Angeles', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(d));

  // 1) 截止前一天：明天（24–48 小时内）到期、还没完成、还没提醒过的项 → 按负责人合并成一封
  const { rows: due } = await pool.query<{ id: number; event_id: string; title: string; role: string; due_at: Date; event_title: string; assignees: Record<string, { name: string; contact: string }> }>(
    `SELECT i.id, i.event_id, i.title, i.role, i.due_at, e.title AS event_title, p.assignees
       FROM event_prep_items i JOIN event_prep p ON p.event_id = i.event_id JOIN events e ON e.id = i.event_id
      WHERE i.done_at IS NULL AND i.reminded_at IS NULL AND i.due_at > $1::timestamptz AND i.due_at <= $1::timestamptz + interval '48 hours'
        AND e.event_status <> 'cancelled'`,
    [now]
  );
  const byPerson = new Map<string, { name: string; lines: string[]; ids: number[]; eventId: string }>();
  let skippedNoEmail = 0;
  for (const it of due) {
    for (const role of rolesOf(it.role)) {
      const a = it.assignees?.[role];
      if (!a?.contact || !isEmail(a.contact)) { skippedNoEmail++; continue; }
      const k = `${a.contact.toLowerCase()}|${it.event_id}`;
      const v = byPerson.get(k) ?? { name: a.name, lines: [], ids: [], eventId: it.event_id };
      v.lines.push(`· ${fmt(it.due_at)} 前：${it.title}（${role}）`);
      v.ids.push(it.id);
      byPerson.set(k, v);
    }
  }
  let reminded = 0;
  for (const [k, v] of Array.from(byPerson.entries())) {
    const to = k.split('|')[0];
    const title = due.find((x) => x.event_id === v.eventId)?.event_title ?? '';
    const res = await getResend().emails.send({
      from: getFromAddress(), to,
      subject: `【SAREC 活动筹备】${title}：明天要完成的事`,
      text: `${v.name || ''}您好，\n\n「${title}」这几件事明天到期，还没打勾：\n${v.lines.join('\n')}\n\n做完请在手机上打开清单打勾：${base}/zh/staff/prep/${v.eventId}\n\n（本邮件由系统按清单自动发出。）`
    });
    if (!res.error) {
      await pool.query(`UPDATE event_prep_items SET reminded_at = now() WHERE id = ANY($1::bigint[])`, [v.ids]);
      reminded++;
    }
  }
  // 没有邮箱的负责人：也标记已处理，免得每天重复计数（汇总里会列出）
  await pool.query(`UPDATE event_prep_items SET reminded_at = now() WHERE id = ANY($1::bigint[]) AND reminded_at IS NULL`, [due.map((d) => d.id)]);

  // 2) 活动前 2 天：给东哥一封“还没完成的事项”汇总（每场一次）
  const to = digestEmail();
  let summaries = 0;
  if (to) {
    const { rows: evs } = await pool.query<{ event_id: string; title: string; starts_at: Date }>(
      `SELECT p.event_id, e.title, e.starts_at FROM event_prep p JOIN events e ON e.id = p.event_id
        WHERE p.summary_sent_at IS NULL AND e.event_status <> 'cancelled'
          AND e.starts_at > $1::timestamptz AND e.starts_at <= $1::timestamptz + interval '2 days 12 hours'`,
      [now]
    );
    for (const ev of evs) {
      const { rows: open } = await pool.query<{ title: string; role: string; due_at: Date }>(
        `SELECT title, role, due_at FROM event_prep_items WHERE event_id = $1 AND done_at IS NULL AND due_at <= $2 ORDER BY due_at`,
        [ev.event_id, ev.starts_at]
      );
      const { rows: pr } = await pool.query<{ assignees: Record<string, { name: string }> }>(`SELECT assignees FROM event_prep WHERE event_id = $1`, [ev.event_id]);
      const who = (role: string) => rolesOf(role).map((r) => `${r}${pr[0]?.assignees?.[r]?.name ? '：' + pr[0].assignees[r].name : '（还没分配人）'}`).join('、');
      const text = open.length
        ? `「${ev.title}」${fmt(ev.starts_at)} 开始，还有 ${open.length} 件事没打勾：\n\n${open.map((o) => `· ${fmt(o.due_at)} 前：${o.title} —— ${who(o.role)}`).join('\n')}\n\n清单：${base}/zh/staff/prep/${ev.event_id}`
        : `「${ev.title}」${fmt(ev.starts_at)} 开始，活动前的事项都已完成。\n\n清单：${base}/zh/staff/prep/${ev.event_id}`;
      const res = await getResend().emails.send({ from: getFromAddress(), to, subject: `【SAREC 活动筹备】${ev.title}：${open.length ? `还有 ${open.length} 件没完成` : '都已完成'}`, text: `${text}\n\n（本邮件由系统按清单自动发出，未调用 AI。）` });
      if (!res.error) {
        await pool.query(`UPDATE event_prep SET summary_sent_at = now() WHERE event_id = $1`, [ev.event_id]);
        summaries++;
      }
    }
  }
  return { reminded, summaries, skippedNoEmail };
}
