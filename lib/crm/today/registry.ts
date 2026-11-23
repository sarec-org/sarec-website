/**
 * 「今天」页待办汇总：按角色过滤 → 并发读各类待办 → 单类出错不影响别的 → 排序。接口说明见 ./types.ts
 */
import { staffCan, type Staff } from '@/lib/crm/auth';
import { laToday } from '@/lib/laDate';
import { B_PROVIDERS } from './providers/b';
import { C_LIVE_PROVIDERS, C_PROVIDERS } from './providers/c';
import { V150_PROVIDERS } from './providers/v150';
import type { TodayContext, TodayItem, TodayKind, TodayLive, TodayLiveProvider, TodayProvider } from './types';

export const KIND_NAME: Record<TodayKind, string> = {
  inquiry_new: '新咨询',
  followup: '会员和访客跟进',
  payment_pending: '待核款',
  recap_publish: '活动回顾待发布',
  jobs_pro_verify: '接活人待核验',
  join_unpaid: '入会未缴费',
  prep_due: '筹备清单到期',
  media_review: '照片和名片待审',
  dup_confirm: '重复档案待确认',
  complaint: '投诉',
  exception: '失败和异常',
  ugc_report: '被举报的内容',
  ugc_machine: '机器拦下的内容',
  profile_review: '个人主页待看一眼',
  jobs_request: '找师傅：小程序交来的待派'
};

export function allProviders(): TodayProvider[] {
  return [...B_PROVIDERS, ...C_PROVIDERS, ...V150_PROVIDERS];
}
export function allLiveProviders(): TodayLiveProvider[] {
  return [...C_LIVE_PROVIDERS];
}

const visible = (s: Pick<Staff, 'roles'>, roles: TodayProvider['roles']) => roles.some((r) => staffCan(s as Staff, r));

/** 排序：priority 小的在前；同 priority 按 at 早的在前；都没有按 id 稳定 */
export function sortToday(items: TodayItem[]): TodayItem[] {
  return [...items].sort((a, b) => a.priority - b.priority || (a.at ?? '9').localeCompare(b.at ?? '9') || a.id.localeCompare(b.id));
}

export function todayContext(s: Pick<Staff, 'email' | 'name' | 'roles'>, now = new Date()): TodayContext {
  return { now, today: laToday(now), staff: { email: s.email, name: s.name, roles: s.roles } };
}

export async function collectToday(
  s: Pick<Staff, 'email' | 'name' | 'roles'>,
  opts: { now?: Date; providers?: TodayProvider[]; liveProviders?: TodayLiveProvider[] } = {}
): Promise<{ items: TodayItem[]; live: TodayLive[]; failed: string[]; today: string }> {
  const ctx = todayContext(s, opts.now);
  const ps = (opts.providers ?? allProviders()).filter((p) => visible(s, p.roles));
  const ls = (opts.liveProviders ?? allLiveProviders()).filter((p) => visible(s, p.roles));
  const failed: string[] = [];
  const res = await Promise.all(
    ps.map((p) =>
      p.list(ctx).catch((e) => {
        console.error('[today]', p.kind, e instanceof Error ? e.message : 'error');
        failed.push(KIND_NAME[p.kind] ?? '有一类待办');
        return [] as TodayItem[];
      })
    )
  );
  const live = (await Promise.all(ls.map((p) => p.list(ctx).catch(() => [] as TodayLive[])))).flat();
  // 同 id 只留一条（防止两个来源报同一件事）
  const seen = new Set<string>();
  const items = res.flat().filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
  return { items: sortToday(items), live, failed, today: ctx.today };
}
