/**
 * 找工人 · 接活：开关和收费设置（存 crm_settings，改动记谁、什么时候，并写 crm_audit_log：谁、何时、改前改后）。
 * 指令 9 · D28：原来的「接活是否要求缴费会员」(jobs_require_paid_member) 扩成「接活儿收费方式」三选一 + 免费联系次数 + 非会员免费发活儿条数。
 *   - feeMode：all_free 全部免费 / free_quota 免费额度（默认）/ members_only 必须是会员
 *   - freeContacts：免费额度时，非会员免费看发布人电话几次（默认 2）
 *   - freePosts：非会员免费发活儿几次（null = 不限，默认不限）
 * 旧字段 requirePaid 保留兼容（= feeMode 是 members_only），旧版调用方照样能读；PATCH 旧字段 true → members_only，false → all_free。
 */
import { getPool } from '@/lib/db/client';
import { getSetting, setSetting } from '@/lib/crm/orders';
import type { Db } from '@/lib/crm/profile';

export type FeeMode = 'all_free' | 'free_quota' | 'members_only';
export const FEE_MODES: { key: FeeMode; label: string; hint: string }[] = [
  { key: 'all_free', label: '全部免费', hint: '核验通过就上列表、看发布人电话，不限次数，不要求会员。' },
  { key: 'free_quota', label: '免费额度', hint: '非会员核验通过就上列表；看发布人电话有免费次数，用完后成为商会会员可以继续。会员不限。' },
  { key: 'members_only', label: '必须是会员', hint: '核验通过并且是商会会员，才上列表、才能看发布人电话。' }
];

export type Switches = {
  find: boolean;
  work: boolean;
  /** 旧字段（兼容）：feeMode === 'members_only' */
  requirePaid: boolean;
  feeMode: FeeMode;
  freeContacts: number;
  freePosts: number | null;
};

const BOOL_KEYS = { find: 'jobs_find_on', work: 'jobs_work_on' } as const;
export const FEE_KEYS = { feeMode: 'jobs_work_fee_mode', freeContacts: 'jobs_free_contacts', freePosts: 'jobs_free_posts' } as const;
const OLD_PAID_KEY = 'jobs_require_paid_member';
export const DEFAULT_FREE_CONTACTS = 2;

const isMode = (v: unknown): v is FeeMode => v === 'all_free' || v === 'free_quota' || v === 'members_only';
const intOrNull = (v: unknown, max = 999): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.min(max, Math.floor(n)) : null;
};

/** 后台改设置用：只认 0..max 的整数（数字或数字字符串），别的一律 null（调用方报 400） */
function strictInt(v: unknown, max: number): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\s*\d+\s*$/.test(v) ? Number(v) : NaN;
  return Number.isInteger(n) && n >= 0 && n <= max ? n : null;
}

export async function getSwitches(db: Db = getPool()): Promise<Switches> {
  const find = await getSetting<unknown>(db, BOOL_KEYS.find, true);
  const work = await getSetting<unknown>(db, BOOL_KEYS.work, true);
  let mode = await getSetting<unknown>(db, FEE_KEYS.feeMode, null);
  if (!isMode(mode)) {
    // 还没跑到 D28 的库：从旧开关读（开 = 必须是会员；关 = 全部免费）；都没有就用新默认
    const old = await getSetting<unknown>(db, OLD_PAID_KEY, null);
    mode = old === true || old === 'true' ? 'members_only' : old === false || old === 'false' ? 'all_free' : 'free_quota';
  }
  const fc = intOrNull(await getSetting<unknown>(db, FEE_KEYS.freeContacts, DEFAULT_FREE_CONTACTS));
  const fp = intOrNull(await getSetting<unknown>(db, FEE_KEYS.freePosts, null));
  const feeMode = mode as FeeMode;
  return {
    find: find === true || find === 'true',
    work: work === true || work === 'true',
    requirePaid: feeMode === 'members_only',
    feeMode,
    freeContacts: fc ?? DEFAULT_FREE_CONTACTS,
    freePosts: fp
  };
}

type ChangeInfo = { updatedBy: string | null; updatedAt: Date } | null;

export async function switchesDetail(db: Db = getPool()) {
  const keys = [...Object.values(BOOL_KEYS), ...Object.values(FEE_KEYS), OLD_PAID_KEY];
  const { rows } = await db.query<{ key: string; updated_by: string | null; updated_at: Date }>(
    `SELECT key, updated_by, updated_at FROM crm_settings WHERE key = ANY($1)`,
    [keys]
  );
  const by: Record<string, ChangeInfo> = Object.fromEntries(rows.map((r) => [r.key, { updatedBy: r.updated_by, updatedAt: r.updated_at }]));
  // 操作记录（谁、何时、改前改后），最近 30 条
  const { rows: log } = await db
    .query<{ actor: string; target_id: string; before_value: unknown; after_value: unknown; created_at: Date }>(
      `SELECT actor, target_id, before_value, after_value, created_at FROM crm_audit_log
        WHERE action = 'jobs_switch' ORDER BY created_at DESC LIMIT 30`
    )
    .catch(() => ({ rows: [] as { actor: string; target_id: string; before_value: unknown; after_value: unknown; created_at: Date }[] }));
  const NAME: Record<string, string> = {
    [BOOL_KEYS.find]: '「找工人／施工队」栏目', [BOOL_KEYS.work]: '「我要接活儿」栏目', [OLD_PAID_KEY]: '接活是否要求缴费会员（旧）',
    [FEE_KEYS.feeMode]: '接活儿收费方式', [FEE_KEYS.freeContacts]: '免费联系次数', [FEE_KEYS.freePosts]: '非会员免费发活儿条数'
  };
  const parse = (v: unknown) => {
    if (typeof v !== 'string') return v;
    try { return JSON.parse(v); } catch { return v; }
  };
  return {
    switches: await getSwitches(db),
    feeModes: FEE_MODES,
    changes: {
      find: by[BOOL_KEYS.find] ?? null,
      work: by[BOOL_KEYS.work] ?? null,
      requirePaid: by[FEE_KEYS.feeMode] ?? by[OLD_PAID_KEY] ?? null,
      feeMode: by[FEE_KEYS.feeMode] ?? null,
      freeContacts: by[FEE_KEYS.freeContacts] ?? null,
      freePosts: by[FEE_KEYS.freePosts] ?? null
    },
    log: log.map((r) => ({ key: r.target_id, name: NAME[r.target_id] ?? (r.target_id === 'jobs_*' ? '开关（一次改多项）' : r.target_id), actor: r.actor, at: r.created_at, before: parse(r.before_value), after: parse(r.after_value) }))
  };
}

async function audit(db: Db, actor: string, key: string, before: unknown, after: unknown) {
  await db.query(
    `INSERT INTO crm_audit_log (actor, action, target_type, target_id, before_value, after_value) VALUES ($1, 'jobs_switch', 'setting', $2, $3, $4)`,
    [actor, key, JSON.stringify(before), JSON.stringify(after)]
  );
}

/**
 * 改开关 / 收费设置：立即生效（每次请求都从库里读），每项改动记一条操作记录。
 * 收费方式变了（会影响谁上列表）→ 重新算所有人的“上不上列表”。
 */
export async function setSwitches(patch: Partial<Record<string, unknown>>, actor: string): Promise<Switches> {
  const pool = getPool();
  const before = await getSwitches(pool);
  for (const k of Object.keys(BOOL_KEYS) as (keyof typeof BOOL_KEYS)[]) {
    if (typeof patch[k] !== 'boolean' || patch[k] === before[k]) continue;
    await setSetting(pool, BOOL_KEYS[k], patch[k], actor);
    await audit(pool, actor, BOOL_KEYS[k], before[k], patch[k]);
  }
  // 旧字段兼容：requirePaid true → 必须是会员；false → 全部免费（新字段 feeMode 同时给了就以 feeMode 为准）
  let mode: unknown = patch.feeMode;
  if (mode === undefined && typeof patch.requirePaid === 'boolean') mode = patch.requirePaid ? 'members_only' : 'all_free';
  if (mode !== undefined) {
    const { CrmError } = await import('@/lib/crm/events');
    if (!isMode(mode)) throw new CrmError('bad_request', '收费方式只能是：全部免费、免费额度、必须是会员');
    if (mode !== before.feeMode) {
      await setSetting(pool, FEE_KEYS.feeMode, mode, actor);
      await audit(pool, actor, FEE_KEYS.feeMode, before.feeMode, mode);
    }
  }
  if (patch.freeContacts !== undefined) {
    const { CrmError } = await import('@/lib/crm/events');
    // J9-2：超出 0–99、负数、小数、不是数字一律 400 人话（不悄悄改成 99）
    const n = strictInt(patch.freeContacts, 99);
    if (n === null) throw new CrmError('bad_request', '免费联系次数请填 0 到 99 的整数');
    if (n !== before.freeContacts) {
      await setSetting(pool, FEE_KEYS.freeContacts, n, actor);
      await audit(pool, actor, FEE_KEYS.freeContacts, before.freeContacts, n);
    }
  }
  if (patch.freePosts !== undefined) {
    const { CrmError } = await import('@/lib/crm/events');
    const empty = patch.freePosts === null || patch.freePosts === '';
    const n = empty ? null : strictInt(patch.freePosts, 999);
    if (!empty && n === null) throw new CrmError('bad_request', '非会员免费发活儿条数请填 0 到 999 的整数，或者留空（不限）');
    if (n !== before.freePosts) {
      await setSetting(pool, FEE_KEYS.freePosts, n, actor);
      await audit(pool, actor, FEE_KEYS.freePosts, before.freePosts, n);
    }
  }
  const after = await getSwitches(pool);
  if (after.feeMode !== before.feeMode) {
    const { refreshAllListed } = await import('./pros');
    await refreshAllListed();
  }
  return after;
}
