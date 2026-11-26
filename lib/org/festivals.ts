/**
 * 指令 83「智能海报排序」：节日日期表（迁移 0054 的 festivals / festival_dates）。
 * ------------------------------------------------------------------
 * - "今天"按洛杉矶时区。非正式环境（VERCEL_ENV !== 'production'）可以用 ?today=YYYY-MM-DD 拨日期给测试员用。
 * - 每个节日取"下一次"日期：festival_dates 里 date + show_until_offset ≥ 今天 的最早一天
 *   （节日当天、以及节后还在显示期的那几天，仍算这一次；过了显示期就算明年的）。
 * - 祝福窗口：今天 ∈ [D − show_before_days, D + show_until_offset]（含两端）。
 * - 后台「节日日期表」（/zh/staff/festivals）能改提前几天 / 显示到哪天 / 对应分类，能加节日、加删日期。全部记 crm_audit_log。
 */
import { getPool, withTransaction } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { audit } from '@/lib/crm/staff';
import type { Staff } from '@/lib/crm/auth';
import type { Db } from '@/lib/crm/profile';

export const TZ = 'America/Los_Angeles';
export type FestivalKind = 'cn' | 'us' | 'intl';
export const KIND_LABEL: Record<FestivalKind, string> = { cn: '中国', us: '美国', intl: '国际' };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** 'YYYY-MM-DD' 而且是真实存在的日期 */
export function parseDay(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!DATE.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : null;
}
/** 洛杉矶时间的今天 'YYYY-MM-DD' */
export function laToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
/** 接口用的"今天"：非正式环境可以带 ?today=YYYY-MM-DD */
export function requestToday(req: Request): string {
  if (process.env.VERCEL_ENV !== 'production') {
    const t = parseDay(new URL(req.url).searchParams.get('today'));
    if (t) return t;
  }
  return laToday();
}
const dayNo = (s: string) => Math.round(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000);
export const daysBetween = (from: string, to: string) => dayNo(to) - dayNo(from);

export type Festival = {
  key: string; name: string; kind: FestivalKind; show_before_days: number; show_until_offset: number;
  category_key: string | null; greet_category_key: string | null; sort: number; active: boolean;
};
export type FestivalAt = Festival & {
  /** 这一次（或下一次）的日期；表里没有以后的日期时 null */
  date: string | null;
  /** date − 今天（节后显示期里是负数） */
  days: number | null;
  /** 今天在祝福窗口 [D − 提前天数, D + 节后天数] 里 */
  inWindow: boolean;
};

const COLS = `f.key, f.name, f.kind, f.show_before_days, f.show_until_offset, f.category_key, f.greet_category_key, f.sort, f.active`;

/** 启用的节日 + 相对 today 的下一次日期（按 sort） */
export async function festivalsAt(today: string, db: Db = getPool()): Promise<FestivalAt[]> {
  const { rows } = await db.query<Festival & { date: string | null }>(
    `SELECT ${COLS},
            (SELECT to_char(min(d.date), 'YYYY-MM-DD') FROM festival_dates d
              WHERE d.festival_key = f.key AND d.date + f.show_until_offset >= $1::date) AS date
       FROM festivals f WHERE f.active ORDER BY f.sort, f.key`,
    [today]
  );
  return rows.map((f) => {
    const days = f.date ? daysBetween(today, f.date) : null;
    return { ...f, days, inWindow: days != null && days <= f.show_before_days && days >= -f.show_until_offset };
  });
}

// ── 后台 ─────────────────────────────────────────────────────────────
export async function staffFestivals() {
  const pool = getPool();
  const today = laToday();
  const list = await festivalsAt(today, pool).catch(() => [] as FestivalAt[]);
  const next = new Map(list.map((f) => [f.key, f]));
  const { rows: all } = await pool.query<Festival>(`SELECT ${COLS} FROM festivals f ORDER BY f.sort, f.key`);
  const { rows: dates } = await pool.query<{ festival_key: string; date: string }>(
    `SELECT festival_key, to_char(date, 'YYYY-MM-DD') AS date FROM festival_dates ORDER BY festival_key, date`
  );
  const { rows: cats } = await pool.query<{ key: string; name: string; purpose: string }>(
    `SELECT key, name, purpose FROM poster_categories ORDER BY purpose, tier, sort, key`
  );
  const by = new Map<string, string[]>();
  for (const d of dates) by.set(d.festival_key, [...(by.get(d.festival_key) ?? []), d.date]);
  return {
    today,
    festivals: all.map((f) => ({ ...f, next: next.get(f.key)?.date ?? null, inWindow: next.get(f.key)?.inWindow ?? false, dates: by.get(f.key) ?? [] })),
    categories: cats
  };
}

const txt = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const intIn = (v: unknown, lo: number, hi: number, label: string) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < lo || n > hi) throw new CrmError('bad_request', `${label}要填 ${lo}–${hi} 的整数`);
  return n;
};

async function categoryOk(db: Db, key: string | null, purpose: 'event' | 'greeting', label: string) {
  if (!key) return null;
  const { rows } = await db.query<{ purpose: string }>(`SELECT purpose FROM poster_categories WHERE key = $1`, [key]);
  if (!rows[0]) throw new CrmError('bad_request', `${label}「${key}」不存在`);
  if (rows[0].purpose !== purpose) throw new CrmError('bad_request', `${label}「${key}」用途不对（要选${purpose === 'event' ? '办活动' : '节日祝福'}的分类）`);
  return key;
}

/**
 * POST 动作：
 * - { action:'save', key, name, kind, showBeforeDays, showUntilOffset, categoryKey, greetCategoryKey, sort, active, create? }（create=true 新加节日）
 * - { action:'add_date', key, date } / { action:'del_date', key, date }
 */
export async function staffFestivalAction(s: Staff, b: Record<string, unknown>) {
  const action = String(b.action ?? '');
  const key = txt(b.key, 40);
  return withTransaction(async (db) => {
    const { rows: cur } = await db.query<Festival>(`SELECT ${COLS} FROM festivals f WHERE f.key = $1 FOR UPDATE`, [key]);
    const f = cur[0];
    if (action === 'save') {
      const create = b.create === true;
      if (create && f) throw new CrmError('bad_request', `已经有「${key}」这个节日了`);
      if (!create && !f) throw new CrmError('not_found', '找不到这个节日');
      if (!/^[a-z0-9_]{2,40}$/.test(key)) throw new CrmError('bad_request', '节日编号只能用小写英文、数字、下划线（如 lunar_new_year）');
      const name = txt(b.name, 20);
      if (!name) throw new CrmError('bad_request', '请填节日名字（20 字以内）');
      const kind = b.kind === 'cn' || b.kind === 'us' || b.kind === 'intl' ? b.kind : null;
      if (!kind) throw new CrmError('bad_request', '请选中国 / 美国 / 国际');
      const before = intIn(b.showBeforeDays, 0, 60, '提前几天');
      const until = intIn(b.showUntilOffset, 0, 60, '节后再显示几天');
      const sort = b.sort == null || b.sort === '' ? (f?.sort ?? 999) : intIn(b.sort, 0, 9999, '排序');
      const cat = await categoryOk(db, txt(b.categoryKey, 40) || null, 'event', '办活动分类');
      const greet = await categoryOk(db, txt(b.greetCategoryKey, 40) || null, 'greeting', '祝福分类');
      const active = b.active !== false;
      const after = { key, name, kind, show_before_days: before, show_until_offset: until, category_key: cat, greet_category_key: greet, sort, active };
      if (create) {
        await db.query(
          `INSERT INTO festivals (key, name, kind, show_before_days, show_until_offset, category_key, greet_category_key, sort, active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [key, name, kind, before, until, cat, greet, sort, active]
        );
      } else {
        await db.query(
          `UPDATE festivals SET name=$2, kind=$3, show_before_days=$4, show_until_offset=$5, category_key=$6, greet_category_key=$7, sort=$8, active=$9, updated_at=now() WHERE key=$1`,
          [key, name, kind, before, until, cat, greet, sort, active]
        );
      }
      await audit(db, s, create ? 'festival_add' : 'festival_save', 'festival', key, { before: f ?? null, after });
      return { message: create ? `已加节日「${name}」，记得给它加日期` : `已保存「${name}」` };
    }
    if (action === 'add_date' || action === 'del_date') {
      if (!f) throw new CrmError('not_found', '找不到这个节日');
      const date = parseDay(b.date);
      if (!date) throw new CrmError('bad_request', '日期格式不对，请按 2027-02-06 这样写');
      if (action === 'add_date') {
        const r = await db.query(`INSERT INTO festival_dates (festival_key, date) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [key, date]);
        if (!r.rowCount) return { message: `「${f.name}」已经有 ${date} 了` };
      } else {
        const r = await db.query(`DELETE FROM festival_dates WHERE festival_key = $1 AND date = $2`, [key, date]);
        if (!r.rowCount) return { message: `「${f.name}」没有 ${date} 这一天` };
      }
      await db.query(`UPDATE festivals SET updated_at = now() WHERE key = $1`, [key]);
      await audit(db, s, action === 'add_date' ? 'festival_date_add' : 'festival_date_del', 'festival', key, { after: date });
      return { message: action === 'add_date' ? `已给「${f.name}」加上 ${date}` : `已删掉「${f.name}」的 ${date}` };
    }
    throw new CrmError('bad_request', '请选择操作');
  });
}
