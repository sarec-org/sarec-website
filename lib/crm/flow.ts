/**
 * 会员端业务流程（网站页面与小程序共用，都经 /api/v1 调用）
 * ------------------------------------------------------------------
 * 报名预览 / 报名提交 / 下一道选填题 / 答题 / 跳过 / 我的总览。
 * 规则全部来自 engine.ts / profile.ts / events.ts（题库 V1.1），这里只做编排与校验。
 */
import { getPool, withTransaction } from '@/lib/db/client';
import { afterRequiredMessage, completeness, itemBadge, pickOptional } from './engine';
import { CrmError, getEventBySlug, startRegistration, submitAnswers, type EventRow } from './events';
import { getContactInfo, parseContactInput, saveContactInput, sendConfirmEmailSafe, type ContactInfo } from './contactInfo';
import { memberStatus, pendingMembershipOrder } from './membership';
import { PURPOSE_LABEL, STATUS_LABEL } from './orders';
import { loadProfile, pointsBalance, recordAnswer, resolveTask, skippedInTask, type Db, type Task } from './profile';
import {
  QUESTION_BY_CODE,
  ROLE_CATEGORIES,
  UNKNOWN_OPTIONS,
  findRoleSub,
  type AnswerValue,
  type Question
} from './questionBank';
import { mergePlaceholderByPhone } from './companions';

export type QuestionDTO = {
  code: string;
  prompt: string;
  input: Question['input'];
  options: string[];
  maxChoices: number | null;
  /** 页面上每道题的提示（与实际发分一致） */
  badge: { label: string; points: number } | null;
};

export function toDTO(q: Question, badge: QuestionDTO['badge'] = null): QuestionDTO {
  let options = q.options ?? [];
  if (q.code === 'Q04') {
    options = [...ROLE_CATEGORIES.flatMap((c) => c.subs.filter((s) => s.key !== 'other').map((s) => s.label)), '没有其他角色'];
  }
  // 每道题都有真实出口（题库总规则第 8 条）
  if ((q.input === 'single' || q.input === 'multi') && !options.some((o) => (UNKNOWN_OPTIONS as readonly string[]).includes(o))) {
    options = [...options, '暂不方便提供'];
  }
  return { code: q.code, prompt: q.prompt, input: q.input, options, maxChoices: q.maxChoices ?? null, badge };
}

/** Q04 页面上显示中文标签，存储为细分行业 key（便于分支题判断）。 */
function q04ToKeys(labels: string[]): string[] {
  return labels.map((l) => {
    for (const c of ROLE_CATEGORIES) {
      const s = c.subs.find((x) => x.label === l);
      if (s) return s.key;
    }
    return l;
  });
}

/** 服务端校验答案格式与选项，防止乱传。 */
export function validateAnswer(code: string, raw: unknown): AnswerValue {
  const q = QUESTION_BY_CODE[code];
  if (!q || q.layer === 'A') throw new CrmError('bad_answer', '题目编号不对');
  const v = (raw ?? {}) as Record<string, unknown>;
  const dto = toDTO(q);
  const allowed = new Set(dto.options);
  const detail = typeof v.detail === 'string' ? v.detail.trim().slice(0, 200) : undefined;
  switch (q.input) {
    case 'single': {
      const c = String(v.choice ?? '');
      if (!allowed.has(c)) throw new CrmError('bad_answer', '请选择一个选项');
      return detail ? { choice: c, detail } : { choice: c };
    }
    case 'multi': {
      const arr = Array.isArray(v.choices) ? v.choices.map(String) : [];
      if (!arr.length || arr.some((c) => !allowed.has(c))) throw new CrmError('bad_answer', '请至少选一项');
      if (q.maxChoices && arr.length > q.maxChoices) throw new CrmError('bad_answer', `最多选 ${q.maxChoices} 项`);
      const choices = q.code === 'Q04' ? q04ToKeys(arr) : arr;
      return detail ? { choices, detail } : { choices };
    }
    case 'text':
    case 'free_text': {
      const t = String(v.text ?? '').trim().slice(0, 2000);
      if (!t) throw new CrmError('bad_answer', '请填写内容，或点“跳过”');
      return { text: t };
    }
    case 'month_day': {
      if (v.choice === '不想填写') return { choice: '不想填写' };
      const m = Number(v.month), d = Number(v.day);
      if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) throw new CrmError('bad_answer', '请选择月和日');
      return { month: m, day: d };
    }
    default:
      throw new CrmError('bad_answer', '这道题不能在这里回答');
  }
}

/** 活动是否已结束（按时间算：结束时间，没填结束时间按开始后 3 小时） */
export function isEventOver(e: { starts_at: Date | string; ends_at?: Date | string | null; event_status?: string }): boolean {
  if (e.event_status === 'completed') return true;
  const end = e.ends_at ? new Date(e.ends_at) : new Date(new Date(e.starts_at).getTime() + 3 * 3600_000);
  return end.getTime() <= Date.now();
}

export function publicEvent(e: EventRow & Record<string, unknown>) {
  // 1.2 线上问题 P-1：已结束的活动一律显示“已结束”，不能报名、不能邀请（小程序 1.2 按 status / registrationOpen 隐藏按钮）
  const over = e.event_status === 'scheduled' && isEventOver(e);
  return {
    slug: e.slug,
    title: e.title,
    summary: (e.summary as string | null) ?? null,
    startsAt: e.starts_at,
    endsAt: e.ends_at,
    timezone: (e.timezone as string) ?? 'America/Los_Angeles',
    locationName: (e.location_name as string | null) ?? null,
    address: (e.address as string | null) ?? null,
    capacity: e.capacity,
    feeCents: e.fee_cents,
    topicTags: e.topic_tags,
    registrationOpen: e.registration_open && !over,
    status: over ? 'completed' : e.event_status,
    ended: over || e.event_status === 'completed',
    coverUrl: (e.cover_url as string | null) ?? null,
    recap: (e.recap as string | null) ?? null,
    albumPublished: !!e.album_published_at
  };
}

export async function listEvents(includePast = false) {
  const { rows } = await getPool().query(
    `SELECT e.*, (SELECT count(*)::int FROM registrations r WHERE r.event_id = e.id AND r.status = 'registered') AS registered
       FROM events e
      WHERE e.event_status <> 'cancelled' AND e.is_listed
        AND (CASE WHEN $1 THEN coalesce(e.ends_at, e.starts_at + interval '3 hours') <= now()
                  ELSE coalesce(e.ends_at, e.starts_at + interval '3 hours') > now() AND e.event_status = 'scheduled' END)
      ORDER BY e.starts_at ${includePast ? 'DESC' : 'ASC'} LIMIT 100`,
    [includePast]
  );
  return rows.map((e) => ({ ...publicEvent(e), registered: e.registered as number }));
}

export async function requireEvent(db: Db, slug: string): Promise<EventRow> {
  const e = await getEventBySlug(db, slug);
  if (!e) throw new CrmError('not_found', '找不到这场活动，可能链接有误');
  return e;
}

/** 在一个总是回滚的事务里试跑报名，算出这次要答哪几题（不写任何数据）。 */
async function dryRun<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    return await fn(client);
  } finally {
    await client.query('ROLLBACK').catch(() => undefined);
    client.release();
  }
}

export type RegisterPreview = {
  event: ReturnType<typeof publicEvent>;
  loggedIn: boolean;
  firstTime: boolean;
  alreadyRegistered: boolean;
  registrationStatus: string | null;
  /** 到场状态：none / checked_in / arrived_pending_payment（已签到的人不显示“取消报名”） */
  arrivalStatus: string | null;
  required: QuestionDTO[];
  name: string | null;
  identity: { email: string | null; phone: string | null };
  /** 当前联系方式（报名表预填；未登录为 null） */
  contactInfo: ContactInfo | null;
  /** 1.2 一步报名：老用户资料已齐（姓名、手机、行业），点报名直接成功 */
  oneStepReady: boolean;
  /** 1.2 新用户只填三项：姓名、手机、行业 */
  profile: { name: string | null; phoneMasked: string | null; roleLabel: string | null } | null;
  photoConsent: boolean;
  registrationId: string | null;
  /** 1.3：收费活动已付款（报名结果页显示“已确认”，不再显示“收费待确认”） */
  feeConfirmed?: boolean;
  /** 1.3 私企面对面：报名后请本人填“一句话介绍我和我的业务”（写进电子名片），名片里已有就不问 */
  collectIntro?: boolean;
  /** 1.3：会后电子名册已生成、本人到场（可以查看） */
  rosterReady?: boolean;
};

export async function previewRegistration(slug: string, contactId: string | null): Promise<RegisterPreview> {
  const pool = getPool();
  const ev = await requireEvent(pool, slug);
  if (!contactId) {
    return { event: publicEvent(ev), loggedIn: false, firstTime: true, alreadyRegistered: false, registrationStatus: null, arrivalStatus: null, required: [], name: null, identity: { email: null, phone: null }, contactInfo: null, oneStepReady: false, profile: null, photoConsent: false, registrationId: null };
  }
  const { rows: c } = await pool.query<{ name: string; email: string | null; phone_e164: string | null; role_sub: string | null }>(
    `SELECT name, email, phone_e164, role_sub FROM contacts WHERE id = $1`,
    [contactId]
  );
  const { rows: reg } = await pool.query<{ id: string; status: string; arrival_status: string; photo_consent: boolean }>(
    `SELECT id, status, arrival_status, photo_consent FROM registrations WHERE event_id = $1 AND contact_id = $2`,
    [ev.id, contactId]
  );
  const alreadyRegistered = !!reg[0] && reg[0].status !== 'cancelled';
  let required: QuestionDTO[] = [];
  let firstTime = true;
  if (ev.event_status === 'scheduled') {
    const out = await dryRun(async (db) => {
      const { answered } = await loadProfile(db, contactId);
      if (!answered.has('Q03')) return { first: true, req: [] as Question[] };
      const o = await startRegistration(db, ev, contactId);
      return { first: false, req: o.required };
    }).catch((e) => {
      if (e instanceof CrmError) return { first: false, req: [] as Question[] };
      throw e;
    });
    firstTime = out.first;
    required = out.req.map((q) => toDTO(q, null));
  }
  const contactInfo = await getContactInfo(pool, contactId);
  const name = c[0]?.name && c[0].name !== '微信用户' ? c[0].name : null;
  const phoneKnown = !!(contactInfo.phone?.value || c[0]?.phone_e164);
  const role = findRoleSub(c[0]?.role_sub);
  const { rows: extra } = await pool.query<{ paid: boolean; collect: boolean; has_intro: boolean; roster: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM orders o WHERE o.contact_id = $1 AND o.related_id = $2 AND o.purpose = 'event_fee' AND o.status = 'paid') AS paid,
            COALESCE((SELECT (p.settings->>'collectIntro')::boolean FROM event_prep p WHERE p.event_id = $2), false) AS collect,
            EXISTS (SELECT 1 FROM member_cards m WHERE m.contact_id = $1 AND coalesce(m.intro, '') <> '') AS has_intro,
            EXISTS (SELECT 1 FROM event_rosters r WHERE r.event_id = $2) AS roster`,
    [contactId, ev.id]
  );
  return {
    event: publicEvent(ev),
    feeConfirmed: !!extra[0]?.paid,
    collectIntro: !!extra[0]?.collect && !extra[0]?.has_intro && !!reg[0] && reg[0].status !== 'cancelled' && new Date(ev.ends_at ?? new Date(new Date(ev.starts_at).getTime() + 3 * 3600e3)).getTime() > Date.now(),
    rosterReady: !!extra[0]?.roster && reg[0]?.arrival_status === 'checked_in',
    loggedIn: true,
    firstTime,
    alreadyRegistered,
    registrationStatus: reg[0]?.status ?? null,
    arrivalStatus: reg[0] && reg[0].status !== 'cancelled' ? reg[0].arrival_status : null,
    required,
    name,
    identity: { email: c[0]?.email ?? null, phone: c[0]?.phone_e164 ?? null },
    contactInfo,
    oneStepReady: !firstTime && !!name && phoneKnown,
    profile: { name, phoneMasked: contactInfo.phone?.masked ?? null, roleLabel: role?.label ?? null },
    photoConsent: !!reg[0]?.photo_consent,
    registrationId: reg[0] && reg[0].status !== 'cancelled' ? reg[0].id : null
  };
}

export type RegisterInput = {
  /** 首次报名：姓名与主要角色（联系方式即本次验证过的身份） */
  name?: string;
  nameAlt?: string;
  roleSub?: string;
  roleOther?: string;
  /** 再次报名：必答题答案 */
  answers?: { code: string; value: unknown }[];
  ref?: string | null;
  channel?: string | null;
  /** 联系方式（2026-11 起报名必填；只检查格式，不发验证码）。旧版小程序不传时不强制。 */
  phone?: string;
  email?: string;
  /** 1.2：一步报名。老用户不再答必答题（改为事后渐进补）；新用户只要姓名、手机、行业（邮箱选填）。 */
  oneStep?: boolean;
  /** 1.3 门口签到：没报名的人只填姓名、手机两项，行业以后再补（不在门口问） */
  allowNoRole?: boolean;
};

export async function register(slug: string, contactId: string, input: RegisterInput, opts: { base?: string } = {}) {
  const wantsContact = (input.phone !== undefined && input.phone !== '') || (input.email !== undefined && input.email !== '');
  // 旧版（1.1.x）：手机号、邮箱都必填；1.2 一步报名：新用户手机必填、邮箱选填，老用户不必再填
  const given = wantsContact ? parseContactInput(input, input.oneStep ? { phone: false, email: false } : { phone: true, email: true }) : null;
  const out = await withTransaction(async (db) => {
    const ev = await requireEvent(db, slug);
    if (given) await saveContactInput(db, contactId, given, 'registration');
    // 1.3：朋友之前被人“带一位朋友”代报过名（占位档案），现在自己来报名 / 签到：手机号对上就并进来
    {
      const { rows: ph } = await db.query<{ p: string | null }>(`SELECT phone_e164 AS p FROM contacts WHERE id = $1`, [contactId]);
      await mergePlaceholderByPhone(db, contactId, given?.phone ?? ph[0]?.p ?? null);
    }
    const { answered } = await loadProfile(db, contactId);
    const firstTime = !answered.has('Q03');
    let refContactId: string | null = null;
    if (input.ref && /^\d+$/.test(input.ref)) {
      const { rows } = await db.query<{ id: string }>(`SELECT id FROM contacts WHERE member_no = $1`, [Number(input.ref)]);
      // 自己推荐自己不算
      refContactId = rows[0]?.id && rows[0].id !== contactId ? rows[0].id : null;
    }
    if (firstTime && input.oneStep) {
      if (!given?.phone) {
        const { rows: ph } = await db.query<{ p: string | null }>(
          `SELECT COALESCE(phone_e164, (SELECT value FROM contact_methods m WHERE m.contact_id = c.id AND m.kind = 'phone' AND m.is_current)) AS p FROM contacts c WHERE id = $1`,
          [contactId]
        );
        if (!ph[0]?.p) throw new CrmError('bad_phone', '请填写手机号');
      }
    }
    const out = await startRegistration(db, ev, contactId, {
      refContactId,
      channelCode: input.channel ?? null,
      source: input.channel === 'onsite' ? 'onsite' : 'online'
    });
    // 1.3：首次来源（渠道 / 功能）只写一次；本次（最后一次）来源在报名记录的 channel_code 上
    if (input.channel && input.channel !== 'onsite') {
      await db.query(`UPDATE contacts SET first_channel = $2 WHERE id = $1 AND first_channel IS NULL`, [contactId, String(input.channel).slice(0, 40)]);
    }
    // 首次推荐人：第一次报名时记下，之后不再改（本次活动来源另存在报名记录里）
    if (refContactId && !out.alreadyRegistered) {
      await db.query(
        `UPDATE contacts SET referred_by = $2, referred_channel = $3, referred_at = now(), updated_at = now()
          WHERE id = $1 AND referred_by IS NULL
            AND NOT EXISTS (SELECT 1 FROM registrations r WHERE r.contact_id = $1 AND r.event_id <> $4 AND r.status <> 'cancelled')`,
        [contactId, refContactId, input.channel ?? null, ev.id]
      );
    }
    let pointsAwarded = 0;
    if (firstTime) {
      const name = (input.name ?? '').trim();
      const role = findRoleSub(input.roleSub);
      if (!name) throw new CrmError('answers_required', '请填写怎么称呼您');
      if (!role && !input.allowNoRole) throw new CrmError('answers_required', '请选择您的主要行业');
      const { rows: c } = await db.query<{ email: string | null; phone_e164: string | null }>(`SELECT email, phone_e164 FROM contacts WHERE id = $1`, [contactId]);
      const ph = c[0]?.phone_e164 ?? given?.phone ?? null;
      const contact = ph ? { phone: ph } : { email: c[0]?.email ?? given?.email ?? '' };
      if (input.nameAlt?.trim()) await db.query(`UPDATE contacts SET name_alt = $2 WHERE id = $1`, [contactId, input.nameAlt.trim().slice(0, 100)]);
      const r = await submitAnswers(db, contactId, out.task, [
        { code: 'Q01', value: { text: name.slice(0, 100) } },
        { code: 'Q02', value: contact },
        ...(role ? [{ code: 'Q03', value: { category: role.category, sub: role.key } }] : [])
      ]);
      if (role && role.key === 'other' && input.roleOther?.trim()) {
        await db.query(`UPDATE profile_answers SET note = $3 WHERE contact_id = $1 AND item_code = 'Q03' AND status = 'current' AND task_id = $2`, [
          contactId,
          out.task.id,
          input.roleOther.trim().slice(0, 100)
        ]);
      }
      pointsAwarded += r.pointsAwarded;
    } else {
      const given = new Map((input.answers ?? []).map((a) => [a.code, a.value]));
      // 1.2 一步报名：不在报名时答题，报名后在成功页按渐进式规则补
      const required = input.oneStep ? [] : out.required;
      const missing = required.filter((q) => !given.has(q.code));
      if (missing.length) {
        throw new CrmError('answers_required', `还需回答 ${missing.length} 题即可完成报名`);
      }
      const answers = required.map((q) => ({ code: q.code, value: validateAnswer(q.code, given.get(q.code)) }));
      pointsAwarded += (await submitAnswers(db, contactId, out.task, answers)).pointsAwarded;
    }
    const { rows: t } = await db.query<Task>(`SELECT * FROM profile_tasks WHERE id = $1`, [out.task.id]);
    return {
      eventId: ev.id,
      registrationId: out.registration.id,
      feeCents: ev.fee_cents,
      status: out.registration.status,
      alreadyRegistered: out.alreadyRegistered,
      orderNo: out.orderNo,
      taskId: out.task.id,
      message: out.registration.status === 'waitlisted' ? '本场已满员，您已进入候补名单，有空位会通知您' : afterRequiredMessage(t[0]),
      pointsAwarded
    };
  });
  // 报名成功：发确认邮件（含“确认邮箱”按钮）；失败不影响报名
  if (!out.alreadyRegistered && opts.base) await sendConfirmEmailSafe(contactId, opts.base, out.eventId);
  const info = await getContactInfo(getPool(), contactId);
  const { eventId: _e, ...rest } = out;
  void _e;
  return {
    ...rest,
    /** 报名成功页：“活动通知将发送到：手机（打码）、邮箱（打码）” */
    notify: { phone: info.phone?.masked ?? null, email: info.email?.masked ?? null, phoneStatus: info.phone?.status ?? null, emailStatus: info.email?.status ?? null }
  };
}

/** 选填题：下一道 + 提示；同时返回本任务已得积分与完成度。 */
export async function nextQuestion(contactId: string, taskId?: string | null, opts: { eventSlug?: string | null } = {}) {
  const pool = getPool();
  if (!taskId && opts.eventSlug) {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT t.id FROM profile_tasks t JOIN events e ON e.id = t.event_id WHERE t.contact_id = $1 AND e.slug = $2 AND t.kind = 'event'`,
      [contactId, opts.eventSlug]
    );
    taskId = rows[0]?.id ?? null;
  }
  const task = await withTransaction((db) => resolveTask(db, contactId, taskId));
  const { view, answered, settled, cooling } = await loadProfile(pool, contactId);
  let topics: string[] = [];
  if (task.event_id) {
    const { rows } = await pool.query<{ topic_tags: string[] }>(`SELECT topic_tags FROM events WHERE id = $1`, [task.event_id]);
    topics = rows[0]?.topic_tags ?? [];
  }
  const skipped = await skippedInTask(pool, contactId, task.id);
  const list = pickOptional(view, { answered, cooling, skippedInTask: skipped }, topics);
  const q = list[0];
  const { rows: earned } = await pool.query<{ n: string | null }>(
    `SELECT sum(s.points)::text AS n FROM profile_settlements s WHERE s.contact_id = $1 AND s.task_id = $2`,
    [contactId, task.id]
  );
  const s01Done = answered.has('S01') || cooling.has('S01');
  return {
    taskId: task.id,
    taskKind: task.kind,
    question: q ? toDTO(q, itemBadge(task, settled.has(q.code))) : null,
    remaining: list.length,
    s01: s01Done ? null : toDTO(QUESTION_BY_CODE.S01, itemBadge(task, settled.has('S01'))),
    earnedThisTask: Number(earned[0]?.n ?? 0),
    completeness: completeness(view, answered),
    eventSlug: opts.eventSlug ?? null
  };
}

export async function answerQuestion(contactId: string, taskId: string | null, code: string, raw: unknown) {
  const value = validateAnswer(code, raw);
  return withTransaction(async (db) => {
    const task = await resolveTask(db, contactId, taskId);
    const r = await recordAnswer(db, {
      contactId,
      task,
      itemCode: code,
      value,
      source: 'text' in value ? 'self_text' : 'self_select'
    });
    return {
      taskId: task.id,
      pointsAwarded: r.pointsAwarded,
      needsMoreText: r.needsMoreText,
      message: r.needsMoreText ? '内容太短，补充后可获得积分' : r.pointsAwarded ? `+${r.pointsAwarded} 积分` : '已保存'
    };
  });
}

export async function skipQuestion(contactId: string, taskId: string | null, code: string) {
  if (!QUESTION_BY_CODE[code]) throw new CrmError('bad_answer', '题目编号不对');
  return withTransaction(async (db) => {
    const task = await resolveTask(db, contactId, taskId);
    await db.query(`INSERT INTO profile_skips (contact_id, item_code, task_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [contactId, code, task.id]);
    return { taskId: task.id };
  });
}

/**
 * 1.2 小程序“我的”：不含订单、金额、付款信息（小程序合规红线），只读会议室预约记录；加我的推荐、名片状态。
 */
export async function myOverviewMp(contactId: string) {
  const full = await myOverview(contactId);
  const pool = getPool();
  const { myReferralStats } = await import('./growth');
  const { rows: card } = await pool.query<{ company: string | null; title: string | null }>(`SELECT company, title FROM member_cards WHERE contact_id = $1`, [contactId]);
  const { rows: av } = await pool.query<{ avatar_url: string | null }>(`SELECT avatar_url FROM contacts WHERE id = $1`, [contactId]);
  // 1.3：我带的朋友（同行人）是否已报名、已到场
  const { rows: comp } = await pool.query<{ slug: string; name: string; status: string; arrival_status: string }>(
    `SELECT e.slug, COALESCE(r.companion_name, '朋友') AS name, r.status, r.arrival_status
       FROM registrations own JOIN registrations r ON r.companion_of = own.id JOIN events e ON e.id = own.event_id
      WHERE own.contact_id = $1 AND r.status <> 'cancelled' ORDER BY r.created_at`,
    [contactId]
  );
  // 1.3 M：收费活动已到账 → “已确认”；本场电子名册已生成且本人到场 → “我的报名”里可打开
  const { rows: extra } = await pool.query<{ slug: string; paid: boolean; roster: boolean }>(
    `SELECT e.slug,
            EXISTS (SELECT 1 FROM orders o WHERE o.contact_id = r.contact_id AND o.related_id = e.id AND o.purpose = 'event_fee' AND o.status = 'paid') AS paid,
            (r.arrival_status = 'checked_in' AND EXISTS (SELECT 1 FROM event_rosters x WHERE x.event_id = e.id)) AS roster
       FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.contact_id = $1`,
    [contactId]
  );
  const extraBy = new Map(extra.map((x) => [x.slug, x]));
  const compBy = new Map<string, { name: string; status: string; arrival: string }[]>();
  for (const x of comp) compBy.set(x.slug, [...(compBy.get(x.slug) ?? []), { name: x.name, status: x.status, arrival: x.arrival_status }]);
  return {
    contact: { ...full.contact, avatar_url: av[0]?.avatar_url ?? null, company: card[0]?.company ?? null, title: card[0]?.title ?? null },
    contactInfo: full.contactInfo,
    member: { isMember: full.member.isMember, tierName: full.member.isMember ? full.member.tierName : null, endDate: full.member.isMember ? full.member.endDate : null, expired: full.member.expired, memberNo: full.member.memberNo },
    points: { balance: full.points.balance, ledger: full.points.ledger.slice(0, 30) },
    profile: full.profile,
    registrations: full.registrations.map((r: Record<string, unknown>) => ({
      slug: r.slug, title: r.title, starts_at: r.starts_at, location_name: r.location_name, status: r.status,
      arrival_status: r.arrival_status, checked_in_at: r.checked_in_at, paid_event: Number(r.fee_cents) > 0,
      companions: compBy.get(String(r.slug)) ?? [],
      fee_confirmed: !!extraBy.get(String(r.slug))?.paid,
      roster: !!extraBy.get(String(r.slug))?.roster
    })),
    bookings: full.bookings.map((b: Record<string, unknown>) => ({ id: b.id, room: b.room, starts_at: b.starts_at, ends_at: b.ends_at, status: b.status })),
    referrals: await myReferralStats(pool, contactId)
  };
}

/** 我的：一次返回全部（数据量小，减少请求，弱网更稳）。 */
export async function myOverview(contactId: string) {
  const pool = getPool();
  const { rows: c } = await pool.query(
    `SELECT id, member_no::int AS member_no, name, name_alt, email, phone_e164, role_category, role_sub, created_at FROM contacts WHERE id = $1`,
    [contactId]
  );
  if (!c[0]) throw new CrmError('unauthorized', '登录已失效，请重新登录');
  const member = await memberStatus(pool, contactId);
  const membershipPending = await pendingMembershipOrder(pool, contactId);
  const balance = await pointsBalance(pool, contactId);
  const { view, answered } = await loadProfile(pool, contactId);
  const { rows: regs } = await pool.query(
    `SELECT e.slug, e.title, e.starts_at, e.location_name, e.fee_cents, r.status, r.arrival_status, r.checked_in_at,
            (SELECT o.order_no FROM orders o WHERE o.contact_id = r.contact_id AND o.related_id = e.id AND o.purpose = 'event_fee' AND o.status <> 'cancelled' LIMIT 1) AS order_no,
            (SELECT o.status FROM orders o WHERE o.contact_id = r.contact_id AND o.related_id = e.id AND o.purpose = 'event_fee' AND o.status <> 'cancelled' LIMIT 1) AS order_status
       FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.contact_id = $1 ORDER BY e.starts_at DESC LIMIT 50`,
    [contactId]
  );
  const { rows: orders } = await pool.query(
    `SELECT order_no, purpose, description, amount_cents, gross_cents, points_redeemed, status, provider, created_at, paid_at
       FROM orders WHERE contact_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [contactId]
  );
  const { rows: points } = await pool.query(
    `SELECT category, points, reason, created_at FROM points_ledger WHERE contact_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [contactId]
  );
  const { rows: bookings } = await pool.query(
    `SELECT b.id, r.name AS room, b.starts_at, b.ends_at, b.status, o.order_no, o.status AS order_status
       FROM room_bookings b JOIN rooms r ON r.id = b.room_id LEFT JOIN orders o ON o.id = b.order_id
      WHERE b.contact_id = $1 ORDER BY b.starts_at DESC LIMIT 50`,
    [contactId]
  );
  const { rows: passes } = await pool.query(
    `SELECT month_start::text, status FROM room_passes WHERE contact_id = $1 ORDER BY month_start DESC LIMIT 12`,
    [contactId]
  );
  const role = findRoleSub(c[0].role_sub);
  return {
    contact: { ...c[0], role_label: role?.label ?? null },
    contactInfo: await getContactInfo(pool, contactId),
    member,
    membershipPending,
    points: { balance, ledger: points },
    profile: completeness(view, answered),
    registrations: regs,
    orders: orders.map((o) => ({ ...o, purpose_label: PURPOSE_LABEL[o.purpose as keyof typeof PURPOSE_LABEL], status_label: STATUS_LABEL[o.status as keyof typeof STATUS_LABEL] })),
    bookings,
    passes
  };
}
