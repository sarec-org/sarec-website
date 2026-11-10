/**
 * 活动“签到开始时间”（东哥 11/9 晚）：后台可填，默认 = 开始时间前 30 分钟；已有活动没填的也按前 30 分钟显示。
 * 统一的时间写法：“下午 1:30 签到 · 2:00 开始”（按活动所在地时区；签到和开始不在同一时段时两个都写时段）。
 */
export const DEFAULT_CHECKIN_LEAD_MIN = 30;

type Ev = { starts_at: Date | string; checkin_starts_at?: Date | string | null };

export function checkinAt(e: Ev): Date {
  if (e.checkin_starts_at) return new Date(e.checkin_starts_at);
  return new Date(new Date(e.starts_at).getTime() - DEFAULT_CHECKIN_LEAD_MIN * 60_000);
}

function hm(d: Date, tz: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((x) => [x.type, x.value])
  );
  const h = Number(p.hour) % 24;
  return { seg: h < 6 ? '凌晨' : h < 12 ? '上午' : h < 18 ? '下午' : '晚上', t: `${h % 12 || 12}:${p.minute}` };
}

/** “下午 1:30 签到 · 2:00 开始” */
export function checkinLine(e: Ev, tz: string): string {
  const a = hm(checkinAt(e), tz || 'America/Los_Angeles');
  const b = hm(new Date(e.starts_at), tz || 'America/Los_Angeles');
  return `${a.seg} ${a.t} 签到 · ${a.seg === b.seg ? '' : b.seg + ' '}${b.t} 开始`;
}
