/**
 * 客户资料：任务、答案、结算、积分（数据库层）
 * ------------------------------------------------------------------
 * 题库 V1.1 第一、五、六、八部分的落地：
 * - 每次新填写只归入一个任务；从哪场活动开始就属于那场活动；否则归入资料中心持续任务。
 * - 每人每题唯一一条结算记录：第一次回答锁定位置；前 3 个名额 0 分，之后 +10，终身一次。
 * - 本人确认的答案以确认时间最新为准；工作人员记录 / AI 推测不覆盖本人确认的信息。
 */
import type { PoolClient } from 'pg';
import { textLooksReal } from './engine';
import {
  QUESTION_BY_CODE,
  isUnknownAnswer,
  type AnswerValue,
  type ProfileView
} from './questionBank';

export type Db = Pick<PoolClient, 'query'>;

export const PROFILE_POINTS = 10;
export const UNREWARDED_SLOTS = 3;
const SELF_SOURCES = ['self_select', 'self_text', 'ai_confirmed'];

export type Task = {
  id: string;
  contact_id: string;
  kind: 'event' | 'profile_center' | 'member_application';
  event_id: string | null;
  unrewarded_slots: number;
  new_items_count: number;
  status: 'open' | 'closed';
  closes_at: string | null;
};

export type SettlementState = 'done_0' | 'done_10' | 'pending_0' | 'pending_reward';

// ── 任务 ───────────────────────────────────────────────────────────────

export async function openEventTask(db: Db, contactId: string, eventId: string, eventEndsAt: Date): Promise<Task> {
  const closes = new Date(eventEndsAt.getTime() + 7 * 24 * 3600 * 1000);
  const { rows } = await db.query<Task>(
    `INSERT INTO profile_tasks (contact_id, kind, event_id, unrewarded_slots, closes_at)
     VALUES ($1, 'event', $2, $3, $4)
     ON CONFLICT (contact_id, event_id) WHERE kind = 'event' DO UPDATE SET contact_id = EXCLUDED.contact_id
     RETURNING *`,
    [contactId, eventId, UNREWARDED_SLOTS, closes]
  );
  return rows[0];
}

export async function profileCenterTask(db: Db, contactId: string): Promise<Task> {
  const { rows } = await db.query<Task>(
    `INSERT INTO profile_tasks (contact_id, kind, unrewarded_slots)
     VALUES ($1, 'profile_center', $2)
     ON CONFLICT (contact_id) WHERE kind = 'profile_center' DO UPDATE SET contact_id = EXCLUDED.contact_id
     RETURNING *`,
    [contactId, UNREWARDED_SLOTS]
  );
  return rows[0];
}

/**
 * 第八部分判断顺序：会员当前正在填写的活动任务（未关闭）优先；
 * 否则一律归入资料中心持续任务，不自动挑“最近一场”。
 */
export async function resolveTask(db: Db, contactId: string, activeTaskId?: string | null): Promise<Task> {
  if (activeTaskId) {
    const { rows } = await db.query<Task>(
      `SELECT * FROM profile_tasks
        WHERE id = $1 AND contact_id = $2 AND status = 'open'
          AND (closes_at IS NULL OR closes_at > now())`,
      [activeTaskId, contactId]
    );
    if (rows[0]) return rows[0];
  }
  return profileCenterTask(db, contactId);
}

// ── 资料视图 ───────────────────────────────────────────────────────────

export async function loadProfile(
  db: Db,
  contactId: string
): Promise<{ view: ProfileView; answered: Set<string>; settled: Set<string>; cooling: Set<string> }> {
  // 同一事务连接上按顺序查询（pg 不支持同一连接并发查询）
  const { rows: c } = await db.query<{ role_category: string | null; role_sub: string | null }>(
    `SELECT role_category, role_sub FROM contacts WHERE id = $1`,
    [contactId]
  );
  const { rows: ans } = await db.query<{ item_code: string; value: AnswerValue; is_unknown: boolean; created_at: Date }>(
    `SELECT item_code, value, is_unknown, created_at FROM profile_answers
      WHERE contact_id = $1 AND status = 'current' AND (expires_at IS NULL OR expires_at > now())`,
    [contactId]
  );
  const { rows: st } = await db.query<{ item_code: string; state: SettlementState }>(
    `SELECT item_code, state FROM profile_settlements WHERE contact_id = $1`,
    [contactId]
  );
  // 冷却：两个不同任务都跳过 → 180 天；回答“暂不方便提供” → 365 天
  const { rows: sk } = await db.query<{ item_code: string }>(
    `SELECT item_code FROM profile_skips
      WHERE contact_id = $1 AND skipped_at > now() - interval '180 days'
      GROUP BY item_code HAVING count(DISTINCT task_id) >= 2`,
    [contactId]
  );
  const answers: ProfileView['answers'] = {};
  const answered = new Set<string>();
  const cooling = new Set(sk.map((r) => r.item_code));
  for (const a of ans) {
    answers[a.item_code] = a.value;
    if (!a.is_unknown) answered.add(a.item_code);
    else if (a.created_at > new Date(Date.now() - 365 * 24 * 3600 * 1000)) cooling.add(a.item_code);
  }
  const q04 = answers.Q04 as { choices?: string[] } | undefined;
  const view: ProfileView = {
    roleCategory: c[0]?.role_category ?? null,
    roleSub: c[0]?.role_sub ?? null,
    otherRoleSubs: (q04?.choices ?? []).filter((x) => x !== '没有其他角色'),
    answers
  };
  return { view, answered, settled: new Set(st.map((r) => r.item_code)), cooling };
}

export async function skippedInTask(db: Db, contactId: string, taskId: string): Promise<Set<string>> {
  const { rows } = await db.query<{ item_code: string }>(
    `SELECT item_code FROM profile_skips WHERE contact_id = $1 AND task_id = $2`,
    [contactId, taskId]
  );
  return new Set(rows.map((r) => r.item_code));
}

export async function recordSkip(db: Db, contactId: string, taskId: string, itemCode: string): Promise<void> {
  await db.query(
    `INSERT INTO profile_skips (contact_id, item_code, task_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [contactId, itemCode, taskId]
  );
}

// ── 答案与结算 ─────────────────────────────────────────────────────────

export type AnswerSource = 'self_select' | 'self_text' | 'ai_confirmed' | 'staff' | 'behavior' | 'ai_guess';

export type AnswerResult = {
  stored: 'current' | 'pending_confirm';
  settlement: SettlementState | null;
  pointsAwarded: number;
  needsMoreText: boolean;
};

function passesContentCheck(code: string, value: AnswerValue): boolean {
  const q = QUESTION_BY_CODE[code];
  if (!q) return false;
  if ((q.input === 'free_text' || q.input === 'text') && 'text' in value) return textLooksReal(value.text);
  return true;
}

/**
 * 写入一条答案并结算。必须在事务内调用（withTransaction）。
 * settle=false：AI 从自我介绍提取并确认、同公司带入等，只写答案并记 0 分结算，防止日后重复得分。
 */
export async function recordAnswer(
  db: Db,
  args: {
    contactId: string;
    task: Task;
    itemCode: string;
    value: AnswerValue;
    source: AnswerSource;
    recordedBy?: string;
    settle?: boolean;
  }
): Promise<AnswerResult> {
  const { contactId, itemCode, value, source } = args;
  const q = QUESTION_BY_CODE[itemCode];
  if (!q) throw new Error(`unknown item ${itemCode}`);
  const unknown = isUnknownAnswer(value);
  const isSelf = SELF_SOURCES.includes(source);

  // 1. 答案：本人确认的直接成为当前值；工作人员/行为/推测不覆盖本人确认的当前值
  const { rows: cur } = await db.query<{ id: string; source: string }>(
    `SELECT id, source FROM profile_answers WHERE contact_id = $1 AND item_code = $2 AND status = 'current' FOR UPDATE`,
    [contactId, itemCode]
  );
  let stored: AnswerResult['stored'] = 'current';
  if (!isSelf && cur[0] && SELF_SOURCES.includes(cur[0].source)) {
    stored = 'pending_confirm';
  } else if (cur[0]) {
    await db.query(`UPDATE profile_answers SET status = 'history' WHERE id = $1`, [cur[0].id]);
  }
  const expires = q.confirmDays && q.confirmDays <= 180 ? new Date(Date.now() + q.confirmDays * 864e5) : null;
  await db.query(
    `INSERT INTO profile_answers (contact_id, item_code, value, is_unknown, source, status, task_id, recorded_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [contactId, itemCode, JSON.stringify(value), unknown, source, stored, args.task.id, args.recordedBy ?? 'self', expires]
  );

  // 2. 结算：只有本人回答参与；工作人员补录、行为、推测一律不发分
  if (!isSelf) return { stored, settlement: null, pointsAwarded: 0, needsMoreText: false };

  const valid = !unknown && passesContentCheck(itemCode, value);
  const { rows: ex } = await db.query<{ state: SettlementState }>(
    `SELECT state FROM profile_settlements WHERE contact_id = $1 AND item_code = $2 FOR UPDATE`,
    [contactId, itemCode]
  );

  let state: SettlementState;
  let award = 0;
  if (!ex[0]) {
    if (args.settle === false) {
      await db.query(
        `INSERT INTO profile_settlements (contact_id, item_code, task_id, position, state, settled_at)
         VALUES ($1, $2, $3, 0, 'done_0', now())`,
        [contactId, itemCode, args.task.id]
      );
      await applyDerived(db, contactId, itemCode, value);
      return { stored, settlement: 'done_0', pointsAwarded: 0, needsMoreText: false };
    }
    // 锁任务行，分配位置
    const { rows: t } = await db.query<{ new_items_count: number; unrewarded_slots: number }>(
      `UPDATE profile_tasks SET new_items_count = new_items_count + 1 WHERE id = $1
       RETURNING new_items_count, unrewarded_slots`,
      [args.task.id]
    );
    const position = t[0].new_items_count;
    const eligible = position > t[0].unrewarded_slots;
    state = valid ? (eligible ? 'done_10' : 'done_0') : eligible ? 'pending_reward' : 'pending_0';
    award = state === 'done_10' ? PROFILE_POINTS : 0;
    await db.query(
      `INSERT INTO profile_settlements (contact_id, item_code, task_id, position, state, points, settled_at)
       VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $5 IN ('done_0','done_10') THEN now() END)`,
      [contactId, itemCode, args.task.id, position, state, award]
    );
  } else {
    state = ex[0].state;
    if (valid && (state === 'pending_reward' || state === 'pending_0')) {
      const next: SettlementState = state === 'pending_reward' ? 'done_10' : 'done_0';
      award = next === 'done_10' ? PROFILE_POINTS : 0;
      await db.query(
        `UPDATE profile_settlements SET state = $3, points = $4, settled_at = now()
          WHERE contact_id = $1 AND item_code = $2`,
        [contactId, itemCode, next, award]
      );
      state = next;
    }
  }

  if (award > 0) {
    const { rowCount } = await db.query(
      `INSERT INTO points_ledger (contact_id, category, points, event_key, reason)
       VALUES ($1, 'profile', $2, $3, $4) ON CONFLICT (event_key) DO NOTHING`,
      [contactId, award, `profile:${contactId}:${itemCode}`, `资料完善 ${itemCode}`]
    );
    if (!rowCount) award = 0; // 唯一校验拦截：绝不重复发分
  }

  if (stored === 'current' && !unknown) await applyDerived(db, contactId, itemCode, value);
  return {
    stored,
    settlement: state,
    pointsAwarded: award,
    needsMoreText: !valid && !unknown
  };
}

/** 把答案同步到档案主字段与标签 */
async function applyDerived(db: Db, contactId: string, code: string, value: AnswerValue): Promise<void> {
  if (code === 'Q01' && 'text' in value) {
    await db.query(`UPDATE contacts SET name = $2, updated_at = now() WHERE id = $1`, [contactId, value.text.trim()]);
  }
  if (code === 'Q03' && 'category' in value) {
    await db.query(`UPDATE contacts SET role_category = $2, role_sub = $3, updated_at = now() WHERE id = $1`, [
      contactId,
      value.category,
      value.sub
    ]);
  }
  const TAG_PREFIX: Record<string, string> = {
    Q03: '行业', Q04: '角色', Q06: '往返', Q07: '区域', Q08: '主题', Q09: '需求', Q10: '可提供'
  };
  const prefix = TAG_PREFIX[code];
  if (!prefix) return;
  const vals =
    'choices' in value ? value.choices : 'choice' in value ? [value.choice] : 'sub' in value ? [value.sub] : [];
  for (const v of vals) {
    await db.query(
      `INSERT INTO contact_tags (contact_id, tag, source) VALUES ($1, $2, 'self_select') ON CONFLICT DO NOTHING`,
      [contactId, `${prefix}:${v}`]
    );
  }
}

export async function pointsBalance(db: Db, contactId: string): Promise<number> {
  const { rows } = await db.query<{ total: string | null }>(
    `SELECT sum(points)::text AS total FROM points_ledger WHERE contact_id = $1`,
    [contactId]
  );
  return Number(rows[0]?.total ?? 0);
}
