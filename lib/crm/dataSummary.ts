/**
 * 后台综合优化 11/21（九）：「数据」页最上面回答四个问题——
 * 这段时间来了多少新人、多少人到场、多少人入会、哪几个功能和渠道带来的入会和到场最多。
 * 口径：
 * - 新人 = 这段时间新建、没被合并掉的档案，并且有姓名或手机号或邮箱（只打开过小程序的“微信用户”另算一个数，不算新人）。
 * - 到场 = 这段时间签到的人（按人去重）；其中第一次到场的单列。
 * - 入会 = 这段时间开始会籍、已缴费的。
 * - 功能和渠道：用「功能排行」和「渠道码」原来的统计（按最后一次带来这个人的功能 / 渠道归因），按入会、再按到场排。
 * - 内部账号、审核演示账号、测试账号（contacts.account_kind 有值）四个数都不算（八.1，lib/crm/accountKind.ts realContact）。
 * 只读，不改数据。
 */
import { getPool } from '@/lib/db/client';
import { featureRanking } from './features';
import { listChannels } from './channels';
import { realContact } from './accountKind';

export type Bringer = { label: string; kind: '功能' | '渠道'; arrived: number; joined: number; registered: number };

export async function dataSummary(days: number) {
  const pool = getPool();
  const d = Math.min(365, Math.max(1, Math.floor(days) || 30));
  const { rows } = await pool.query<{ new_people: number; shells: number; arrived: number; arrived_first: number; joined: number }>(
    `WITH named AS (
       SELECT c.id, (coalesce(nullif(trim(c.name), ''), '微信用户') <> '微信用户' OR c.phone_e164 IS NOT NULL OR c.email IS NOT NULL) AS real
         FROM contacts c
        WHERE c.created_at > now() - make_interval(days => $1) AND c.merged_into IS NULL AND ${realContact('c')}
     ), came AS (
       SELECT DISTINCT r.contact_id FROM registrations r JOIN contacts c ON c.id = r.contact_id
        WHERE r.arrival_status = 'checked_in' AND r.checked_in_at > now() - make_interval(days => $1) AND ${realContact('c')}
     )
     SELECT (SELECT count(*)::int FROM named WHERE real) AS new_people,
            (SELECT count(*)::int FROM named WHERE NOT real) AS shells,
            (SELECT count(*)::int FROM came) AS arrived,
            (SELECT count(*)::int FROM came WHERE NOT EXISTS (
               SELECT 1 FROM registrations o WHERE o.contact_id = came.contact_id AND o.arrival_status = 'checked_in'
                  AND o.checked_in_at <= now() - make_interval(days => $1))) AS arrived_first,
            (SELECT count(*)::int FROM applications a JOIN contacts c ON c.id = a.contact_id
              WHERE a.membership_start_date IS NOT NULL AND a.payment_status IN ('paid', 'partially_paid') AND ${realContact('c')}
                AND a.membership_start_date >= (now() - make_interval(days => $1))::date) AS joined`,
    [d]
  );
  const feats = await featureRanking({ days: d });
  const chans = await listChannels({ days: d });
  const bringers: Bringer[] = [
    // 「渠道码（全部合作渠道）」是渠道的合计，下面按每个渠道单列，这里不重复算
    ...feats.rows.filter((r) => r.brings && r.key !== 'channels').map((r) => ({ label: r.label.replace('首页入口 · ', ''), kind: '功能' as const, arrived: r.brings!.arrived, joined: r.brings!.joined, registered: r.brings!.registered })),
    ...chans.map((c) => ({ label: `${c.name}（${c.kindLabel}）`, kind: '渠道' as const, arrived: c.stats.arrived, joined: c.stats.joined, registered: c.stats.registered }))
  ]
    .filter((b) => b.arrived + b.joined > 0)
    .sort((a, b) => b.joined - a.joined || b.arrived - a.arrived || b.registered - a.registered);
  return { days: d, ...rows[0], top: bringers.slice(0, 5), eventsInWindow: feats.eventsInWindow, sampleTooSmall: feats.sampleTooSmall };
}
