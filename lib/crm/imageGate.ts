/**
 * 指令 36 第 2 条 b（11/22）：用户传的图片"检测完才公开"。
 * ------------------------------------------------------------------
 * 为什么不是"上传时同步检测"（方案 a）：微信官方文档现在只剩异步的 mediaCheckAsync（2.0），同步的 imgSecCheck（1.0）
 * 2021-09-01 起停止更新、已从官方接口列表撤掉，没有可依赖的同步接口。异步结果要靠「消息推送」回来（/api/v1/wx/push）。
 *
 * 做法：
 *  - 每张新图记一行 image_checks（pending），同时提交 mediaCheckAsync。
 *  - 项目 / 案例（profile_projects.status = 'checking'）、活动相册照片（event_photos.review_status = 'checking'）：
 *    只有本人看得到；所有图都"通过"后自动公开。
 *  - 头像、公司 logo、名片项目照片、俱乐部群二维码（一个位置一张图）：通过之前那一格不改，别人看到的还是旧图；本人看到新图。
 *  - 微信推回 pass → 公开；risky → 撤下（项目 rejected、照片隐藏，本人看到原因）；review → 留着等工作人员。
 *  - 检测不了（测试站没有微信密钥 / 没拿到本人微信身份 / 微信接口出错）→ 一直 pending，后台「内容管理 › 机器拦下的」和「今天」里一键放行。
 *  - 迁移 0048 没跑（没有 image_checks 表）时：一切照旧（先发后管），不挡上传。
 */
import { getPool } from '@/lib/db/client';
import { mediaCheckAsync } from './contentSec';
import { wxConfigured } from './wechat';

export type SlotKind = 'avatar' | 'logo' | 'card_photo' | 'club_qr';
export const SLOT_LABEL: Record<SlotKind, string> = { avatar: '头像', logo: '名片上的公司 logo', card_photo: '名片上的项目照片', club_qr: '俱乐部群二维码' };

export const CHECKING_PROJECT_REASON = '图片检测中：检测通过后别人才能看到（您自己现在就能看到）。';
export const CHECKING_PHOTO_NOTE = '图片检测中，检测通过后大家才能看到（您自己现在就能看到）。';
export const CHECKING_SLOT_NOTE = '图片检测中，检测通过后别人才能看到新图（您自己现在就能看到）。';

/** 测试用：让单元测试替换掉真的微信调用（不对外） */
type Submitter = (url: string, openid: string | null) => Promise<string | null>;
let submitter: Submitter = (url, openid) => mediaCheckAsync(url, openid, 1);
let configured: () => boolean = wxConfigured;
export function __setForTest(s: Submitter | null, wx?: (() => boolean) | null) {
  submitter = s ?? ((url, openid) => mediaCheckAsync(url, openid, 1));
  configured = wx ?? wxConfigured;
}

let ready: boolean | null = null;
/** 迁移 0048 跑过没有（有 image_checks 表）。只缓存"跑过了"，没跑的每次再看一眼（迁移跑完不用重新部署） */
export async function gateReady(): Promise<boolean> {
  if (ready) return true;
  try {
    const { rows } = await getPool().query<{ t: string | null }>(`SELECT to_regclass('public.image_checks')::text AS t`);
    ready = !!rows[0]?.t;
  } catch {
    ready = false;
  }
  return ready;
}

/**
 * 指令 51（11/23）：这个人的小程序微信身份。先看本档案；本档案没有就看合并进来的旧档案（最多往下三层）——
 * 老办法合并过的档案，微信身份还留在旧档案上，登录时顺着 merged_into 登到主档案，所以主档案这一格是空的。
 */
export async function wechatOpenidOf(contactId: string | null): Promise<string | null> {
  if (!contactId) return null;
  const { rows } = await getPool().query<{ o: string | null }>(
    `WITH RECURSIVE t(id, depth) AS (SELECT $1::uuid, 0 UNION ALL SELECT c.id, t.depth + 1 FROM contacts c JOIN t ON c.merged_into = t.id WHERE t.depth < 3)
     SELECT c.wechat_openid AS o FROM t JOIN contacts c ON c.id = t.id
      WHERE c.wechat_openid IS NOT NULL AND c.wechat_openid NOT LIKE 'dev-openid-%'
      ORDER BY t.depth, c.updated_at DESC NULLS LAST LIMIT 1`,
    [contactId]
  );
  return rows[0]?.o ?? null;
}
const openidOf = wechatOpenidOf;

/**
 * 指令 51：这个人卡在"没拿到微信身份 / 没提交上"的图，现在能拿到身份了就重新交给微信检测一次。
 * 在本人每次登录小程序时调用（这时他刚访问过小程序，符合微信"近两小时访问过"的要求）。只处理最近 7 天的、最多 20 张。
 */
export async function retryPendingFor(contactId: string): Promise<number> {
  if (!configured() || !(await gateReady())) return 0;
  const openid = await openidOf(contactId);
  if (!openid) return 0;
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; url: string; target: string }>(
    `SELECT id, url, target FROM image_checks WHERE contact_id = $1 AND status = 'pending' AND trace_id IS NULL AND created_at > now() - interval '7 days' ORDER BY created_at LIMIT 20`,
    [contactId]
  );
  let n = 0;
  for (const r of rows) {
    let trace: string | null = null;
    try {
      trace = await submitter(r.url, openid);
    } catch {
      trace = null;
    }
    if (!trace) continue;
    await pool.query(`UPDATE image_checks SET trace_id = $2, note = NULL WHERE id = $1 AND status = 'pending' AND trace_id IS NULL`, [r.id, trace]);
    await log('media_check', r.target, 'submitted', 'machine', trace);
    n++;
  }
  return n;
}

async function log(kind: string, targetId: string, action: string, actor: string, note?: string | null) {
  await getPool().query(`INSERT INTO ugc_actions (kind, target_id, action, actor, note) VALUES ($1, $2, $3, $4, $5)`, [kind, targetId, action, actor, note ?? null]);
}

export type UrlState = 'pass' | 'pending' | 'risky' | 'rejected' | 'none';

/** 每个地址最近一次的检测状态（superseded 的不算；没有记录 = none） */
export async function urlStates(urls: string[]): Promise<Map<string, UrlState>> {
  const out = new Map<string, UrlState>();
  if (!urls.length) return out;
  const { rows } = await getPool().query<{ url: string; status: string }>(
    `SELECT DISTINCT ON (url) url, status FROM image_checks WHERE url = ANY($1::text[]) AND status <> 'superseded' ORDER BY url, (status = 'pass') DESC, created_at DESC`,
    [urls]
  );
  for (const u of urls) out.set(u, 'none');
  for (const r of rows) out.set(r.url, r.status as UrlState);
  return out;
}

/**
 * 提交一张图去检测：记一行 pending，交给微信异步检测。返回这一行的 id 和 note（人话：为什么要等人工）。
 * 微信接口出错 / 测试站 / 没有微信身份都不抛错，只是留着等工作人员放行。
 */
export async function submitImage(url: string, target: string, contactId: string | null, meta?: Record<string, unknown> | null): Promise<{ id: string; note: string | null }> {
  const pool = getPool();
  const openid = await openidOf(contactId);
  let note: string | null = null;
  let trace: string | null = null;
  if (!configured()) note = '测试站不检测（没有微信密钥），等工作人员放行';
  else if (!openid) note = '没拿到本人的微信身份，没法自动检测，等工作人员放行';
  else {
    try {
      trace = await submitter(url, openid);
    } catch {
      trace = null;
    }
    if (!trace) note = '微信图片检测没提交上（接口出错或超时），等工作人员放行';
  }
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO image_checks (url, target, contact_id, status, trace_id, note, meta) VALUES ($1, $2, $3, 'pending', $4, $5, $6::jsonb) RETURNING id`,
    [url, target, contactId, trace, note, meta ? JSON.stringify(meta) : null]
  );
  // 老的登记方式也记一行（后台操作记录里看得到提交过）
  if (trace) await log('media_check', target, 'submitted', 'machine', trace);
  return { id: rows[0].id, note };
}

// ── 项目 / 照片 ─────────────────────────────────────────────────────

/**
 * 项目保存时：哪些图要检测。keepOk = 这个项目原来就有、已经公开的图（迁移前的老图没有记录，也算通过）。
 * 返回：'ok'（都通过了，可以公开）/ 'checking'（有图在检测）/ 'risky'（有图以前就没通过）
 */
export async function gateProjectImages(projectId: string, contactId: string, images: string[], keepOk: string[]): Promise<'ok' | 'checking' | 'risky'> {
  if (!(await gateReady())) return 'ok';
  // 改项目时拿掉的图：它们没检测完的作废
  await getPool().query(`UPDATE image_checks SET status = 'superseded', decided_at = now(), decided_by = 'removed' WHERE target = $1 AND status = 'pending' AND NOT (url = ANY($2::text[]))`, ['project:' + projectId, images]);
  if (!images.length) return 'ok';
  const st = await urlStates(images);
  if (images.some((u) => st.get(u) === 'risky' || st.get(u) === 'rejected')) return 'risky';
  let checking = false;
  for (const u of images) {
    const s = st.get(u);
    if (s === 'pass' || (s === 'none' && keepOk.includes(u))) continue;
    checking = true;
    // 同一张图已经在检测（同一个项目）就不重复提交
    const { rows } = await getPool().query(`SELECT 1 FROM image_checks WHERE url = $1 AND target = $2 AND status = 'pending'`, [u, 'project:' + projectId]);
    if (!rows[0]) await submitImage(u, 'project:' + projectId, contactId);
  }
  return checking ? 'checking' : 'ok';
}

// ── 一个位置一张图（头像 / logo / 名片项目照片 / 群二维码）──────────────

/**
 * 换图：把新图挂成"待检测"，原来那一格不动。同一个位置之前没检测完的作废（以最新的为准）。
 * 返回 checking=false 表示可以直接写进那一格（迁移没跑 / 这张图以前已经通过）。
 */
export async function gateSlot(kind: SlotKind, key: string, url: string, contactId: string | null, meta?: Record<string, unknown> | null): Promise<{ checking: boolean; risky?: boolean }> {
  if (!(await gateReady())) return { checking: false };
  const target = `${kind}:${key}`;
  const pool = getPool();
  const st = (await urlStates([url])).get(url);
  if (st === 'risky' || st === 'rejected') return { checking: false, risky: true };
  await pool.query(`UPDATE image_checks SET status = 'superseded', decided_at = now(), decided_by = 'newer_upload' WHERE target = $1 AND status = 'pending' AND url <> $2`, [target, url]);
  if (st === 'pass') return { checking: false };
  const { rows } = await pool.query(`SELECT 1 FROM image_checks WHERE target = $1 AND url = $2 AND status = 'pending'`, [target, url]);
  if (!rows[0]) await submitImage(url, target, contactId, meta);
  else if (meta) await pool.query(`UPDATE image_checks SET meta = $3::jsonb WHERE target = $1 AND url = $2 AND status = 'pending'`, [target, url, JSON.stringify(meta)]);
  return { checking: true };
}

/** 本人看的：这些位置上还在检测的新图（target → url） */
export async function pendingSlots(targets: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!targets.length || !(await gateReady())) return out;
  const { rows } = await getPool().query<{ target: string; url: string }>(
    `SELECT DISTINCT ON (target) target, url FROM image_checks WHERE target = ANY($1::text[]) AND status = 'pending' ORDER BY target, created_at DESC`,
    [targets]
  );
  for (const r of rows) out.set(r.target, r.url);
  return out;
}

/** 本人看的：把还在检测的新图盖在原来的地址上 */
export async function ownerOverlay(contactId: string): Promise<{ avatar?: string; logo?: string; card_photo?: string }> {
  const m = await pendingSlots([`avatar:${contactId}`, `logo:${contactId}`, `card_photo:${contactId}`]);
  return { avatar: m.get(`avatar:${contactId}`), logo: m.get(`logo:${contactId}`), card_photo: m.get(`card_photo:${contactId}`) };
}

// ── 结果：通过 / 不通过 ─────────────────────────────────────────────

type Row = { id: string; url: string; target: string; contact_id: string | null; status: string; meta: Record<string, unknown> | null };

async function rowById(id: string): Promise<Row | null> {
  const { rows } = await getPool().query<Row>(`SELECT id, url, target, contact_id, status, meta FROM image_checks WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/** 通过（微信 pass 或工作人员放行）：把图公开 */
export async function applyPass(id: string, by: string): Promise<boolean> {
  const pool = getPool();
  const r = await rowById(id);
  if (!r || r.status === 'superseded') return false;
  await pool.query(`UPDATE image_checks SET status = 'pass', decided_at = now(), decided_by = $2 WHERE id = $1`, [id, by]);
  const i = r.target.indexOf(':');
  const kind = r.target.slice(0, i);
  const key = r.target.slice(i + 1);
  if (kind === 'project') {
    const { rows } = await pool.query<{ images: string[] }>(`SELECT images FROM profile_projects WHERE id = $1 AND status = 'checking'`, [key]);
    if (rows[0]) {
      const st = await urlStates(rows[0].images ?? []);
      const allOk = (rows[0].images ?? []).every((u) => st.get(u) === 'pass' || st.get(u) === 'none');
      if (allOk) await pool.query(`UPDATE profile_projects SET status = 'ok', reviewed_by = $2, reviewed_at = now() WHERE id = $1 AND status = 'checking'`, [key, by]);
    }
  } else if (kind === 'photo') {
    await pool.query(`UPDATE event_photos SET review_status = 'ok' WHERE id = $1 AND review_status = 'checking'`, [key]);
  } else if (kind === 'avatar') {
    await pool.query(`UPDATE contacts SET avatar_url = $2, updated_at = now() WHERE id = $1`, [key, r.url]);
  } else if (kind === 'logo') {
    await pool.query(`UPDATE member_cards SET logo_url = $2, updated_at = now() WHERE contact_id = $1`, [key, r.url]);
  } else if (kind === 'card_photo') {
    await pool.query(`UPDATE member_cards SET project_photo_url = $2, updated_at = now() WHERE contact_id = $1`, [key, r.url]);
  } else if (kind === 'club_qr') {
    const exp = typeof r.meta?.expires === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.meta.expires) ? r.meta.expires : new Date(Date.now() + 7 * 86400e3).toISOString().slice(0, 10);
    await pool.query(`UPDATE clubs SET group_qr_url = $2, group_qr_expires = $3, updated_at = now() WHERE key = $1`, [key, r.url, exp]);
  }
  return true;
}

export const MACHINE_REASON = '有图片没通过微信内容检测，已自动撤下。换一张图再保存就行。';

/** 不通过（微信 risky 或工作人员不放行）：项目撤下、照片隐藏；一个位置一张图的那一格本来就没换，什么都不用动 */
export async function applyReject(id: string, by: string, why: string): Promise<boolean> {
  const pool = getPool();
  const r = await rowById(id);
  if (!r || r.status === 'superseded') return false;
  await pool.query(`UPDATE image_checks SET status = $3, decided_at = now(), decided_by = $2 WHERE id = $1`, [id, by, by === 'machine' ? 'risky' : 'rejected']);
  const i = r.target.indexOf(':');
  const kind = r.target.slice(0, i);
  const key = r.target.slice(i + 1);
  if (kind === 'project') {
    const { rowCount } = await pool.query(`UPDATE profile_projects SET status = 'rejected', reviewed_by = $2, reviewed_at = now() WHERE id = $1 AND status IN ('ok', 'checking')`, [key, by]);
    if (rowCount) await log('profile_project', key, 'machine_take_down', by, why);
  } else if (kind === 'photo') {
    const { rowCount } = await pool.query(`UPDATE event_photos SET is_hidden = true, review_status = 'rejected' WHERE id = $1`, [key]);
    if (rowCount) await log('photo', key, 'machine_take_down', by, why);
  } else {
    await log('image', r.id, 'machine_take_down', by, why);
  }
  return true;
}

/** 某个项目 / 照片的所有待检测图一起放行（后台对整条内容点"放行"时） */
export async function passTarget(target: string, by: string) {
  if (!(await gateReady())) return;
  // 机器判过不通过、工作人员看过放行的，也算通过（以后再用这张图不再拦）
  const { rows } = await getPool().query<{ id: string }>(`SELECT id FROM image_checks WHERE target = $1 AND status IN ('pending', 'risky')`, [target]);
  for (const r of rows) await applyPass(r.id, by);
}

/** 某个项目 / 照片的所有待检测图一起作废（后台下架时；内容本身的下架由调用方做） */
export async function rejectTarget(target: string, by: string) {
  if (!(await gateReady())) return;
  await getPool().query(`UPDATE image_checks SET status = 'rejected', decided_at = now(), decided_by = $2 WHERE target = $1 AND status = 'pending'`, [target, by]);
}

/** 微信推回的检测结果：找到了返回 true（老方式登记的找不到，交给调用方按老办法处理） */
export async function handleCheckResult(traceId: string, suggest: string, label?: number | string | null): Promise<{ found: boolean; takenDown?: boolean }> {
  if (!(await gateReady())) return { found: false };
  const { rows } = await getPool().query<{ id: string; status: string }>(`SELECT id, status FROM image_checks WHERE trace_id = $1 ORDER BY created_at DESC LIMIT 1`, [traceId]);
  const r = rows[0];
  if (!r) return { found: false };
  if (r.status !== 'pending') return { found: true };
  if (suggest === 'pass') {
    await applyPass(r.id, 'machine');
    return { found: true };
  }
  if (suggest === 'risky') {
    await applyReject(r.id, 'machine', `微信图片检测不通过（${label ?? ''}）`);
    return { found: true, takenDown: true };
  }
  // review / 其他：留着等工作人员
  await getPool().query(`UPDATE image_checks SET note = $2 WHERE id = $1`, [r.id, `微信建议人工看一眼（${label ?? ''}），等工作人员放行`]);
  return { found: true };
}
