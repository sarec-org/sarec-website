/**
 * 1.7.1（指令 94 补充，东哥 11/26「局组好了，再哪里可以看到？」）：「我的组局」——我发起的 ＋ 我报了名的。
 * - 看的规矩和组局板一样：被下架的不出；开始 3 小时后收起；已取消的一天后收起；还没过检测的只有发起人自己看得到（报名的人本来也报不上）。
 * - 排序：没取消的在前，按开始时间，快开始的在上；已取消的排最后。
 * - 每条的字段和组局详情（meetupView）同一口径，另带 club { key, name }、role（'mine' 我发起 / 'joined' 我报了名）、
 *   whenText「11/28 周六 14:00」、line「11/28 周六 14:00 · 掼蛋俱乐部 · 我发起的」（文字服务器拼，小程序照着显示）。
 * - next：3 天内要开始的最近一局（首页「摇人儿」大卡用）{ id, text:'你有 1 个局：周六下午掼蛋局 ›', count }，没有给 null。
 */
import { getPool } from '@/lib/db/client';
import { MEETUP_SELECT, meetupView, type MeetupRow } from './clubs';

const WEEK: Record<string, string> = { Sun: '日', Mon: '一', Tue: '二', Wed: '三', Thu: '四', Fri: '五', Sat: '六' };

/** 洛杉矶时间「11/28 周六 14:00」（和小程序 fmt.short 一样的写法） */
export function laShort(d: Date | string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(d));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${g('month')}/${g('day')} 周${WEEK[g('weekday')] ?? ''} ${g('hour')}:${g('minute')}`;
}

export const NEXT_DAYS = 3;
export const EMPTY_TEXT = '还没有组局，去摇人儿 ›';

type Row = MeetupRow & { club_key: string; club_name: string };

export async function myMeetups(contactId: string, now: Date = new Date()) {
  const sql = MEETUP_SELECT.replace(
    'FROM club_meetups u JOIN contacts ct ON ct.id = u.creator_id',
    `, cl.key AS club_key, cl.name AS club_name
       FROM club_meetups u JOIN contacts ct ON ct.id = u.creator_id JOIN clubs cl ON cl.id = u.club_id`
  );
  const { rows } = await getPool().query<Row>(
    `${sql}
      WHERE (u.creator_id = $2 OR EXISTS (SELECT 1 FROM club_meetup_joins j WHERE j.meetup_id = u.id AND j.contact_id = $2))
        AND cl.closed_at IS NULL AND u.status <> 'taken_down'
        AND u.starts_at > $1::timestamptz - interval '3 hours'
        AND (u.sec_status = 'ok' OR u.creator_id = $2)
        AND NOT (u.status = 'cancelled' AND u.updated_at < $1::timestamptz - interval '1 day')
      ORDER BY (u.status = 'cancelled'), u.starts_at
      LIMIT 100`,
    [now.toISOString(), contactId]
  );
  const meetups = rows.map((u) => {
    const v = meetupView(u, contactId, null);
    const role = u.creator_id === contactId ? 'mine' : 'joined';
    const whenText = laShort(u.starts_at);
    const tail = v.cancelled ? '已取消' : v.started ? '已经开始' : role === 'mine' ? '我发起的' : '我报了名';
    return { ...v, club: { key: u.club_key, name: u.club_name }, role, whenText, line: `${whenText} · ${u.club_name} · ${tail}` };
  });
  const until = now.getTime() + NEXT_DAYS * 86400e3;
  const soon = meetups.filter((m) => !m.cancelled && !m.started && new Date(m.startsAt).getTime() <= until);
  const next = soon.length ? { id: soon[0].id, count: soon.length, text: `你有 ${soon.length} 个局：${soon[0].title} ›` } : null;
  return { meetups, next, emptyText: meetups.length ? null : EMPTY_TEXT };
}
