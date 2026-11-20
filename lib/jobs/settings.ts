/** 找工人 · 接活：三个开关（存 crm_settings，改动记谁、什么时候，并写 crm_audit_log） */
import { getPool } from '@/lib/db/client';
import { getSetting, setSetting } from '@/lib/crm/orders';
import type { Db } from '@/lib/crm/profile';

export type Switches = { find: boolean; work: boolean; requirePaid: boolean };
const KEYS = { find: 'jobs_find_on', work: 'jobs_work_on', requirePaid: 'jobs_require_paid_member' } as const;
const DEFAULTS: Switches = { find: false, work: false, requirePaid: true };

export async function getSwitches(db: Db = getPool()): Promise<Switches> {
  const out = { ...DEFAULTS };
  for (const k of Object.keys(KEYS) as (keyof Switches)[]) {
    const v = await getSetting<unknown>(db, KEYS[k], DEFAULTS[k]);
    out[k] = v === true || v === 'true';
  }
  return out;
}

export async function switchesDetail(db: Db = getPool()) {
  const { rows } = await db.query<{ key: string; updated_by: string | null; updated_at: Date }>(
    `SELECT key, updated_by, updated_at FROM crm_settings WHERE key = ANY($1)`,
    [Object.values(KEYS)]
  );
  const by = Object.fromEntries(rows.map((r) => [r.key, { updatedBy: r.updated_by, updatedAt: r.updated_at }]));
  return {
    switches: await getSwitches(db),
    changes: {
      find: by[KEYS.find] ?? null,
      work: by[KEYS.work] ?? null,
      requirePaid: by[KEYS.requirePaid] ?? null
    }
  };
}

export async function setSwitches(patch: Partial<Record<keyof Switches, unknown>>, actor: string): Promise<Switches> {
  const pool = getPool();
  const before = await getSwitches(pool);
  for (const k of Object.keys(KEYS) as (keyof Switches)[]) {
    if (typeof patch[k] !== 'boolean' || patch[k] === before[k]) continue;
    await setSetting(pool, KEYS[k], patch[k], actor);
    await pool.query(
      `INSERT INTO crm_audit_log (actor, action, target_type, target_id, before_value, after_value) VALUES ($1, 'jobs_switch', 'setting', $2, $3, $4)`,
      [actor, KEYS[k], JSON.stringify(before[k]), JSON.stringify(patch[k])]
    );
  }
  const after = await getSwitches(pool);
  if (after.requirePaid !== before.requirePaid) {
    const { refreshAllListed } = await import('./pros');
    await refreshAllListed();
  }
  return after;
}
