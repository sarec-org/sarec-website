/**
 * 1.5.0 的待办接进「今天」页（lib/crm/today 的 provider 接口）：
 *   ugc_report     有人举报的内容（组局、个人主页 / 名片、照片、俱乐部成员）——同一条被多人举报只出一张卡
 *   ugc_machine    机器拦下的内容（组局文本检测没过 / 没检测上、项目和照片图片检测不通过已撤下）
 *   profile_review 个人主页 / 项目文本检测"建议人工看一眼"（照常显示，看过点"没问题"就不再出现）
 * 按钮直接调 1.5.0 后台「内容管理」的接口 POST /api/v1/staff/content（下架 / 恢复 / 不用处理），处理页是 /zh/staff/content。
 * 内部 / 审核演示 / 测试账号发的内容不进待办（后台综合优化 八）。
 */
import { getPool } from '@/lib/db/client';
import { contentBoard, KIND_LABEL } from '../../contentAdmin';
import { PRIORITY, type TodayAction, type TodayItem, type TodayProvider } from '../types';

const ENDPOINT = '/api/v1/staff/content';
const MAX = 8;

type Board = Awaited<ReturnType<typeof contentBoard>>['items'];

/** 去掉内部 / 审核演示 / 测试账号发的 */
async function realOnly<T extends { ownerId: string | null }>(items: T[]): Promise<T[]> {
  const ids = Array.from(new Set(items.map((i) => i.ownerId).filter((x): x is string => !!x)));
  if (!ids.length) return items;
  const { rows } = await getPool().query<{ id: string }>(`SELECT id::text FROM contacts WHERE id = ANY($1::uuid[]) AND account_kind IS NOT NULL`, [ids]);
  const skip = new Set(rows.map((r) => r.id));
  return items.filter((i) => !i.ownerId || !skip.has(i.ownerId));
}

const short = (s: string | null | undefined, n = 120) => (s ? (s.length > n ? s.slice(0, n) + '…' : s) : undefined);

async function reports(): Promise<TodayItem[]> {
  const items = await realOnly((await contentBoard('reported')).items as Board);
  return items.slice(0, MAX).map((it) => {
    const n = it.reports?.length ?? 1;
    const reasons = Array.from(new Set((it.reports ?? []).map((r) => r.reason))).join('、');
    const body = { kind: it.kind, id: it.id };
    const actions: TodayAction[] = [
      { type: 'link', label: '看一眼', href: `/zh/staff/content?tab=reported&id=${it.id}`, primary: true },
      { type: 'post', label: '下架', endpoint: ENDPOINT, body: { ...body, action: 'take_down', reason: reasons || '被举报' }, confirm: `下架后别人看不到这条${KIND_LABEL[it.kind]}（在「内容管理 › 已下架的」里能恢复）。确定下架？`, done: '已下架', danger: true },
      { type: 'post', label: '不用处理', endpoint: ENDPOINT, body: { ...body, action: 'dismiss' }, done: '已标为不用处理，内容照常显示' }
    ];
    return {
      id: `ugc_report:${it.kind}:${it.id}`,
      kind: 'ugc_report' as const,
      priority: PRIORITY.review + 20,
      title: `${it.title}被举报了${n > 1 ? `（${n} 人）` : ''}`,
      suggestion: `举报原因：${reasons || '其他'}。看一眼，不合适就下架，没问题点“不用处理”。`,
      detail: short(it.text),
      href: `/zh/staff/content?tab=reported&id=${it.id}`,
      tags: ['举报'],
      at: (it.reports?.[it.reports.length - 1]?.at ?? it.at)?.toISOString?.(),
      actions
    };
  });
}

async function machine(): Promise<TodayItem[]> {
  // 只取真正被拦下、别人看不到的（组局 / 项目 / 照片）；"建议看一眼"的个人主页在 profile_review
  const all = ((await contentBoard('machine')).items as Board).filter((it) => it.state === 'machine');
  const items = await realOnly(all);
  return items.slice(0, MAX).map((it) => ({
    id: `ugc_machine:${it.kind}:${it.id}`,
    kind: 'ugc_machine' as const,
    priority: PRIORITY.review + 22,
    title: it.checking ? `${it.title}在等图片检测，还没对大家显示` : `${it.title}被机器拦下了，还没对大家显示`,
    suggestion: it.checking ? `${it.note ?? '图片检测中'}。看一眼图，没问题点“放行”，不合适点“${it.kind === 'image' ? '不放行' : '下架'}”。` : `${it.note ?? '内容检测没通过'}。看一眼，没问题点“放行”，不合适点“下架”。`,
    detail: short(it.text),
    href: `/zh/staff/content?tab=machine&id=${it.id}`,
    tags: ['待审核'],
    at: it.at?.toISOString?.(),
    actions: [
      { type: 'post', label: '放行', endpoint: ENDPOINT, body: { kind: it.kind, id: it.id, action: 'restore' }, done: '已放行，大家能看到了', primary: true },
      { type: 'post', label: it.kind === 'image' ? '不放行' : '下架', endpoint: ENDPOINT, body: { kind: it.kind, id: it.id, action: 'take_down', reason: it.checking ? '工作人员看过图片，不放行' : '内容检测没通过' }, done: it.kind === 'image' ? '已不放行，别人看到的还是原来那张' : '已下架', danger: true },
      { type: 'link', label: '看一眼', href: `/zh/staff/content?tab=machine&id=${it.id}` }
    ]
  }));
}

/** 个人主页 / 项目：文本检测建议人工看一眼（照常显示）；工作人员处理过（任何一次后台操作）就不再出现 */
async function profileReview(): Promise<TodayItem[]> {
  const { rows } = await getPool().query<{ kind: string; target_id: string; note: string | null; created_at: Date; owner: string | null; title: string | null; text: string | null }>(
    `SELECT DISTINCT ON (a.kind, a.target_id) a.kind, a.target_id, a.note, a.created_at,
            NULLIF(c.name, '微信用户') AS owner, p.title, coalesce(p.body, m.bio) AS text
       FROM ugc_actions a
       LEFT JOIN profile_projects p ON a.kind = 'profile_project' AND p.id::text = a.target_id
       LEFT JOIN member_cards m ON a.kind = 'profile' AND m.contact_id::text = a.target_id
       JOIN contacts c ON c.id::text = CASE WHEN a.kind = 'profile_project' THEN p.contact_id::text ELSE a.target_id END
      WHERE a.action = 'machine_review' AND a.created_at > now() - interval '30 days' AND c.account_kind IS NULL
        AND coalesce(p.status, m.profile_status, 'ok') = 'ok'
        AND NOT EXISTS (SELECT 1 FROM ugc_actions x WHERE x.target_id = a.target_id AND x.actor <> 'machine' AND x.created_at > a.created_at)
      ORDER BY a.kind, a.target_id, a.created_at DESC
      LIMIT ${MAX}`
  );
  return rows.map((r) => {
    const kind = r.kind === 'profile_project' ? 'project' : 'profile';
    const what = kind === 'project' ? `${r.owner ?? 'SAREC 用户'} 的项目「${r.title ?? ''}」` : `${r.owner ?? 'SAREC 用户'} 的个人主页`;
    return {
      id: `profile_review:${kind}:${r.target_id}`,
      kind: 'profile_review' as const,
      priority: PRIORITY.review + 24,
      title: `${what}请看一眼`,
      suggestion: '微信文本检测建议人工看一眼（现在照常显示）。没问题点“没问题”，不合适点“下架”。',
      detail: short(r.text),
      href: `/zh/staff/content?tab=machine&id=${r.target_id}`,
      tags: ['待审核'],
      at: r.created_at.toISOString(),
      actions: [
        { type: 'post', label: '没问题', endpoint: ENDPOINT, body: { kind, id: r.target_id, action: 'dismiss' }, done: '好的，不再提醒', primary: true },
        { type: 'post', label: '下架', endpoint: ENDPOINT, body: { kind, id: r.target_id, action: 'take_down', reason: '内容不合适' }, done: '已下架', danger: true },
        { type: 'link', label: '看一眼', href: `/zh/staff/content?tab=machine&id=${r.target_id}` }
      ]
    };
  });
}

export const V150_PROVIDERS: TodayProvider[] = [
  { kind: 'ugc_report', roles: ['ops'], list: () => reports() },
  { kind: 'ugc_machine', roles: ['ops'], list: () => machine() },
  { kind: 'profile_review', roles: ['ops'], list: () => profileReview() }
];
