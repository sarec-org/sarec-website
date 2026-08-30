/**
 * 活动时间 / 状态的展示层格式化 —— 服务端与客户端组件共用的纯函数。
 * ------------------------------------------------------------------
 * startAt / endAt 是不带时区的当地时间字符串('YYYY-MM-DDTHH:mm'),
 * 时区由 timezone 字段单独携带。这里刻意不做时区换算:
 * 直接按录入的当地时间显示,并在旁边标出时区,避免读者误读。
 */
import type { EventItem, EventStatus, RegistrationStatus } from '@/lib/cms/types';
import {
  EVENT_STATUS_LABEL,
  REGISTRATION_STATUS_LABEL,
  TIMEZONE_LABEL,
} from '@/lib/cms/labels';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** '2026-08-15T18:30' → { date: '2026 年 8 月 15 日（周六）', time: '18:30' } */
export function splitLocal(value: string): { date: string; time: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const [, y, mo, d, hh, mm] = m;
  // 用 UTC 构造,避免运行环境时区把日期挪一天。
  const weekday = WEEKDAYS[new Date(Date.UTC(+y, +mo - 1, +d)).getUTCDay()];
  return { date: `${+y} 年 ${+mo} 月 ${+d} 日（周${weekday}）`, time: `${hh}:${mm}` };
}

/** 卡片与详情页共用的一行时间文案。 */
export function formatEventTime(event: EventItem): string {
  const start = splitLocal(event.startAt);
  if (!start) return '';
  const tz = TIMEZONE_LABEL[event.timezone] ?? event.timezone;
  const end = event.endAt ? splitLocal(event.endAt) : null;

  if (!end) return `${start.date} ${start.time} · ${tz}`;
  if (end.date === start.date) return `${start.date} ${start.time}–${end.time} · ${tz}`;
  return `${start.date} ${start.time} 至 ${end.date} ${end.time} · ${tz}`;
}

export type EventBadge = { label: string; tone: 'gold' | 'muted' | 'alert' };

/**
 * 两个独立维度组合成前台徽章。
 * 活动状态优先:延期 / 取消 / 已结束时,报名态不再单独展示。
 */
export function eventBadges(
  eventStatus: EventStatus,
  registrationStatus: RegistrationStatus
): EventBadge[] {
  if (eventStatus === 'cancelled') return [{ label: EVENT_STATUS_LABEL.cancelled, tone: 'alert' }];
  if (eventStatus === 'postponed') return [{ label: EVENT_STATUS_LABEL.postponed, tone: 'alert' }];
  if (eventStatus === 'completed') return [{ label: EVENT_STATUS_LABEL.completed, tone: 'muted' }];

  const badges: EventBadge[] = [{ label: EVENT_STATUS_LABEL.scheduled, tone: 'gold' }];
  badges.push({
    label: REGISTRATION_STATUS_LABEL[registrationStatus],
    tone: registrationStatus === 'open' ? 'gold' : 'muted',
  });
  return badges;
}
