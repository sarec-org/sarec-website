/**
 * 题库规则引擎（纯函数，无数据库依赖）
 * ------------------------------------------------------------------
 * 依据题库 V1.1 第七部分“挑题算法”与第六部分“页面提示文案”。
 * 数据库读写在 lib/crm/profile.ts；这里只决定“问哪几道题、提示怎么写”。
 */
import {
  QUESTIONS,
  TOPIC_BOOSTS,
  coreCodes,
  findRoleSub,
  type ProfileView,
  type Question
} from './questionBank';

export type ItemState = {
  /** 有有效回答（含“目前没有”“不适用”） */
  answered: Set<string>;
  /** 冷却期内不再问的题 */
  cooling: Set<string>;
  /** 本任务内跳过的题 */
  skippedInTask: Set<string>;
};

const BASE_SCORE: Record<1 | 2 | 3, number> = { 1: 30, 2: 20, 3: 10 };

export function scoreQuestion(q: Question, p: ProfileView, eventTopics: string[]): number {
  let s = BASE_SCORE[q.priority];
  if (eventTopics.some((t) => TOPIC_BOOSTS[t]?.includes(q.code))) s += 15;
  if (q.layer === 'R' && findRoleSub(p.roleSub)?.branches.includes(q.code)) s += 10;
  return s;
}

function candidates(p: ProfileView, st: ItemState): Question[] {
  return QUESTIONS.filter(
    (q) =>
      q.layer !== 'A' &&
      !st.answered.has(q.code) &&
      !st.cooling.has(q.code) &&
      !st.skippedInTask.has(q.code) &&
      (!q.appliesTo || q.appliesTo(p))
  );
}

function rank(list: Question[], p: ProfileView, topics: string[]): Question[] {
  return [...list].sort(
    (a, b) => scoreQuestion(b, p, topics) - scoreQuestion(a, p, topics) || a.code.localeCompare(b.code)
  );
}

/**
 * 报名表里的必答题：只从核心池挑，最多 3 道；核心已完整则为空。
 * 首次报名由 Q01–Q03 固定承担，不走本函数。
 */
export function pickRequired(p: ProfileView, st: ItemState, eventTopics: string[], max = 3): Question[] {
  const core = new Set(coreCodes(p));
  const pool = candidates(p, { ...st, skippedInTask: new Set() }).filter((q) => core.has(q.code));
  return rank(pool, p, eventTopics).slice(0, max);
}

/** 成功页 / 资料中心的选填题顺序：一屏一题；S01 不固定在最后，单独作为第一屏入口。 */
export function pickOptional(p: ProfileView, st: ItemState, eventTopics: string[]): Question[] {
  return rank(
    candidates(p, st).filter((q) => q.code !== 'S01'),
    p,
    eventTopics
  );
}

/** 基本完整：A + B + 主角色★题全部有有效回答（主角色为“其他”时为 13 项）。 */
export function completeness(p: ProfileView, answered: Set<string>): { done: number; total: number } {
  const core = coreCodes(p);
  return { done: core.filter((c) => answered.has(c)).length, total: core.length };
}

/** 一道新题若现在回答，能否得分（由任务的已用名额决定）。 */
export function nextItemRewarded(task: { unrewarded_slots: number; new_items_count: number }): boolean {
  return task.new_items_count + 1 > task.unrewarded_slots;
}

/** 第六部分：每道题旁的提示文案 */
export function itemBadge(
  task: { unrewarded_slots: number; new_items_count: number },
  alreadySettled: boolean
): { label: string; points: number } | null {
  if (alreadySettled) return null;
  if (nextItemRewarded(task)) return { label: '+10', points: 10 };
  const left = task.unrewarded_slots - task.new_items_count - 1;
  return {
    label: left > 0 ? `本项不计分，再完成 ${left} 项后每项 +10` : '本项不计分，下一项起每项 +10',
    points: 0
  };
}

/** 必答完成后的页面提示 */
export function afterRequiredMessage(task: { unrewarded_slots: number; new_items_count: number }): string {
  const left = task.unrewarded_slots - task.new_items_count;
  return left <= 0
    ? '报名已完成！继续完善资料，每项 +10 积分'
    : `报名已完成！再完成 ${left} 项资料，之后每项 +10 积分`;
}

/**
 * 文字题内容检查：不设固定字数，只拦截乱码、重复字符和明显无关的内容。
 * 未通过：保存答案，结算记“待补”，提示补充。
 */
export function textLooksReal(raw: string): boolean {
  const t = raw.trim();
  if (t.length < 2) return false;
  if (new Set(Array.from(t)).size === 1) return false; // 全是同一个字符
  const meaningful = t.replace(/[\s\d!-/:-@[-`{-~，。！？、；：“”‘’（）《》【】…—·￥]/g, '');
  if (meaningful.length < 2) return false; // 只有符号或数字
  if (/^[a-z]{1,}$/i.test(meaningful) && !/[aeiou]/i.test(meaningful)) return false; // 键盘乱敲
  return true;
}
