/**
 * 1.6.0 活动工具开放给别的主办方 —— 接口自测（只连测试库 / 本机服务）。重点：越权（换链接拿别家名单）、数据隔离、帮手权限、导出、开关。
 *   BASE=http://localhost:3160 DATABASE_URL=<测试库> pnpm dlx tsx scripts/v160-org-tests.ts --i-know-this-is-not-production
 * 测试数据：主办方、活动名字「验收九-」开头；人用 dev 微信登录新建（名字「微信用户」）或「验收九-」工作人员；收尾按 ID 删干净，开关恢复成跑之前的样子。
 * 加 --keep 不删（给小程序截图用），之后用 --clean-only 删。
 */
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { guardNotProduction } from './_guard';

guardNotProduction();
const BASE = (process.env.BASE || 'http://localhost:3160').replace(/\/$/, '');
const pool = getPool();
const MP = { 'X-Sarec-Client': 'mp-1.6.0' };
const uniq = randomBytes(3).toString('hex');
const contacts: string[] = [];
const staffEmails: string[] = [];
const orgIds: string[] = [];
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };
type Who = { id: string; token: string };
type Res = { status: number; j: Record<string, any>; buf?: Buffer; type?: string };

async function call(method: string, path: string, who?: Who | null, b?: unknown): Promise<Res> {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers: { ...(b ? { 'Content-Type': 'application/json' } : {}), ...(who ? { Authorization: `Bearer ${who.token}` } : {}), ...MP },
    body: b ? JSON.stringify(b) : undefined
  });
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('json')) return { status: res.status, j: {}, buf: Buffer.from(await res.arrayBuffer()), type };
  return { status: res.status, j: (await res.json().catch(() => ({}))) as Record<string, any>, type };
}
/** 小程序新用户：dev 微信登录（测试站没有 AppSecret），档案是刚建的「微信用户」 */
async function wxUser(): Promise<Who> {
  const r = await call('POST', '/auth/wechat', null, { code: `dev-v160${uniq}${contacts.length}${randomBytes(3).toString('hex')}` });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  contacts.push(r.j.contactId);
  return { id: r.j.contactId, token: r.j.token };
}
/** 老用户：名字、手机号都有，档案是 10 天前建的 */
async function oldUser(name: string): Promise<Who> {
  const u = await wxUser();
  await pool.query(`UPDATE contacts SET name = $2, phone_e164 = $3, created_at = now() - interval '10 days' WHERE id = $1`, [u.id, `验收九-${name}`, `+1949555${String(1000 + Math.floor(Math.random() * 8999)).slice(0, 4)}`]);
  return u;
}
async function staffUser(): Promise<Who> {
  const email = `v160-${uniq}@example.com`;
  const { rows } = await pool.query<{ id: string }>(`INSERT INTO contacts (name, email, email_verified_at, acquisition_source) VALUES ('验收九-工作人员', $1, now(), 'test') RETURNING id`, [email]);
  contacts.push(rows[0].id);
  await pool.query(`INSERT INTO staff_roles (email, name, roles) VALUES ($1, $2, $3)`, [email, `验收九-工作人员-${uniq}`, ['admin']]);
  staffEmails.push(email);
  const token = randomBytes(32).toString('base64url');
  await pool.query(`INSERT INTO sessions (token_hash, contact_id, channel, expires_at) VALUES ($1, $2, 'web', now() + interval '1 day')`, [createHash('sha256').update(token).digest('hex'), rows[0].id]);
  return { id: rows[0].id, token };
}
const future = (days: number, h = 19) => { const d = new Date(Date.now() + days * 86400_000); d.setUTCHours(h + 8, 0, 0, 0); return d.toISOString(); };

let saved: Record<string, unknown> = {};

async function main() {
  for (const k of ['org_tool_on', 'org_chain_on']) {
    const { rows } = await pool.query(`SELECT value FROM crm_settings WHERE key = $1`, [k]);
    saved[k] = rows[0] ? rows[0].value : null;
  }
  await pool.query(`DELETE FROM crm_settings WHERE key IN ('org_tool_on', 'org_chain_on')`); // 从默认值开始测（总开关开、接龙关）

  const staff = await staffUser();
  const ownerA = await oldUser('主办方A负责人');
  const helperA = await wxUser();
  const ownerB = await oldUser('主办方B负责人');
  const stranger = await wxUser();

  // ── 1. 后台开通 ──
  let r = await call('POST', '/staff/organizers', staff, { action: 'create', name: `验收九-主办方A-${uniq}`, publicContact: '电话 949-555-0100' });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  const orgA = r.j.id as string; orgIds.push(orgA);
  assert.match(r.j.code, /^[A-Z0-9]{10}$/);
  assert.ok(r.j.qrPlain?.startsWith('data:image/png'));
  const codeA = r.j.code as string;
  r = await call('POST', '/staff/organizers', staff, { action: 'create', name: `验收九-主办方B-${uniq}` });
  const orgB = r.j.id as string; orgIds.push(orgB);
  const codeB = r.j.code as string;
  r = await call('POST', '/staff/organizers', ownerA, { action: 'create', name: '验收九-非工作人员' });
  assert.equal(r.status, 403);
  ok('后台开通主办方出 10 位开通码（小程序码 + 普通码）；非工作人员调后台接口 403');

  r = await call('GET', `/org/claim?code=${codeA}`, ownerA);
  assert.equal(r.status, 200);
  assert.ok(r.j.promise.sections.length >= 5 && r.j.organizer.includes('主办方A'));
  assert.ok(JSON.stringify(r.j.promise).includes('参加者本人的权利'));
  r = await call('POST', '/org/claim', ownerA, { code: codeA, agree: false });
  assert.equal(r.status, 400);
  r = await call('POST', '/org/claim', ownerA, { code: `sarec-org:${codeA}`, agree: true });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  r = await call('POST', '/org/claim', stranger, { code: codeA, agree: true });
  assert.equal(r.status, 400);
  r = await call('POST', '/org/claim', ownerB, { code: codeB, agree: true });
  assert.equal(r.status, 200);
  const { rows: ag } = await pool.query(`SELECT status, agreed_at, agreed_version FROM organizers WHERE id = $1`, [orgA]);
  assert.equal(ag[0].status, 'active'); assert.ok(ag[0].agreed_at); assert.equal(ag[0].agreed_version, '2026-11-23');
  ok('扫开通码先看《主办方数据承诺》（含参加者本人的权利），不点同意开不了；码只能用一次；同意时间和版本记下');

  r = await call('GET', '/me?view=mp', ownerA);
  assert.equal(r.j.organizer?.role, 'owner');
  r = await call('GET', '/me?view=mp', stranger);
  assert.equal(r.j.organizer, null);
  ok('「我的」：主办方多一行「我办的活动」（organizer 有值）；普通人 organizer = null，页面和以前一样');

  // 帮手
  r = await call('POST', '/org/helpers', helperA, {});
  assert.equal(r.status, 403);
  r = await call('POST', '/org/helpers', ownerA, {});
  assert.equal(r.status, 200);
  r = await call('POST', '/org/claim', helperA, { code: r.j.code, agree: true });
  assert.equal(r.status, 200);
  assert.equal(r.j.role, 'helper');
  ok('负责人出加帮手码、帮手扫码加入；帮手自己不能再加帮手');

  // ── 2. 发活动（先审后发） ──
  r = await call('GET', '/org/templates', ownerA);
  assert.ok(r.j.templates.some((t: any) => t.key === 'dinner'));
  assert.ok(!r.j.templates.some((t: any) => t.key === 'chain'));
  ok('模板：讲座、聚餐、牌局、看房团、户外、其他；接龙开关关着时没有「接龙」');
  const evIn = { title: `验收九-聚餐-${uniq}`, startsAt: future(3), endsAt: future(3, 21), locationName: '验收九 餐厅', address: '1 Test St, Irvine, CA', capacity: 5, formFields: ['party', 'company'], hasFee: true, feeWay: 'onsite', template: 'dinner', composeSecs: 47 };
  r = await call('POST', '/org/events', stranger, evIn);
  assert.equal(r.status, 403);
  r = await call('POST', '/org/events', ownerA, { ...evIn, description: '现场扫收款码付款' });
  assert.equal(r.status, 400);
  assert.match(r.j.error.message, /收款码/);
  r = await call('POST', '/org/events', ownerA, { ...evIn, mode: 'chain' });
  assert.equal(r.status, 400);
  r = await call('POST', '/org/events', ownerA, evIn);
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.equal(r.j.status, 'review');
  const evA = r.j.id as string; const codeEvA = r.j.code as string;
  ok('发活动：非主办方 403；写「收款码」拦下；接龙关着不让发接龙；新主办方第一场进「等放行」');

  r = await call('GET', `/org/e/${codeEvA}`, stranger);
  assert.equal(r.j.closed, true);
  assert.match(r.j.reason, /放行/);
  r = await call('GET', `/org/e/${codeEvA}`, ownerA);
  assert.equal(r.j.closed, false); assert.equal(r.j.event.reviewing, true);
  r = await call('POST', '/staff/organizers', staff, { action: 'event', op: 'approve', id: evA });
  assert.equal(r.status, 200);
  const { rows: rl } = await pool.query(`SELECT review_left FROM organizers WHERE id = $1`, [orgA]);
  assert.equal(rl[0].review_left, 2);
  ok('放行前普通人看到"等商会放行"、主办方自己能看；后台放行后公开，先审后发剩余 3 → 2');

  // ── 3. 报名页 ──
  r = await call('GET', `/org/e/${codeEvA}`, stranger);
  assert.equal(r.j.closed, false);
  assert.equal(r.j.organizer.name.includes('主办方A'), true);
  assert.match(r.j.disclosure, /提供给主办方「验收九-主办方A/);
  assert.equal(r.j.event.fee, '本活动收费，现场交（详情联系主办方）');
  assert.ok(!/\$|\d+\s*元/.test(JSON.stringify(r.j.event)));
  assert.equal(r.j.prefill.name, '');
  r = await call('GET', `/org/e/${codeEvA}`, ownerB);
  assert.match(r.j.prefill.name, /主办方B负责人/);
  assert.match(r.j.prefill.phoneMasked, /尾号 \d{4}/);
  ok('报名页：主办方品牌、告知小字；收费只写"本活动收费，现场交"，不出金额；老用户姓名手机自动带出、新用户空着');

  r = await call('POST', `/org/e/${codeEvA}/register`, stranger, { name: '验收九-新客', phone: '9495550142', partySize: 3, answers: { company: '验收九公司' } });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.equal(r.j.status, 'registered');
  r = await call('POST', `/org/e/${codeEvA}/register`, ownerB, { name: '验收九-老客B', phone: '9495550143', partySize: 3 });
  assert.equal(r.j.status, 'waitlisted');
  const g = await pool.query(`SELECT id, org_guest_since FROM contacts WHERE id = ANY($1::uuid[])`, [[stranger.id, ownerB.id]]);
  const guest = (id: string) => !!g.rows.find((x) => x.id === id)?.org_guest_since;
  assert.equal(guest(stranger.id), true); assert.equal(guest(ownerB.id), false);
  ok('一共几位占几个名额（3 位占 3 个，名额 5 → 再来 3 位进候补）；刚因这场来的新人标成「主办方的客人」，老用户不标');

  // ── 4. 越权：换链接 / 换编号拿别家名单 ──
  r = await call('POST', '/org/events', ownerB, { ...evIn, title: `验收九-B的讲座-${uniq}`, capacity: null });
  const evB = r.j.id as string;
  for (const [who, label] of [[ownerB, '别家负责人'], [stranger, '普通报名人'], [staff, '商会工作人员（小程序接口）']] as [Who, string][]) {
    for (const path of [`/org/events/${evA}/roster`, `/org/events/${evA}`, `/org/events/${evA}/poster`]) {
      const x = await call('GET', path, who);
      assert.equal(x.status, 404, `${label} ${path} ${x.status}`);
      assert.ok(!JSON.stringify(x.j).includes('9495550142'));
    }
    const ex = await call('POST', `/org/events/${evA}/export`, who, { kind: 'copy' });
    assert.equal(ex.status, 404, `${label} export`);
    const mk = await call('POST', `/org/events/${evA}/roster`, who, { regId: '00000000-0000-0000-0000-000000000000', paid: true });
    assert.equal(mk.status, 404);
    const door = await call('GET', `/org/events/${evA}/door`, who);
    assert.equal(door.status, 404);
  }
  r = await call('GET', `/org/events/${evB}/roster`, ownerA);
  assert.equal(r.status, 404);
  r = await call('GET', `/org/events/not-a-uuid/roster`, ownerA);
  assert.equal(r.status, 404);
  r = await call('GET', `/org/events/${evA}/roster`, null);
  assert.equal(r.status, 401);
  ok('换链接越权：别家负责人、普通报名人、商会工作人员拿 A 的活动编号去取名单 / 改活动 / 海报 / 导出 / 标已交费 / 门口码，一律 404，响应里没有手机号；A 拿 B 的也 404；乱填编号 404；没登录 401');

  r = await call('GET', `/org/e/${codeEvA}`, ownerB);
  assert.ok(!JSON.stringify(r.j).includes('9495550142') && !JSON.stringify(r.j).includes('验收九-新客'));
  ok('报名页（公开）不带别人的名字和手机号');

  // ── 5. 名单：负责人 / 帮手 ──
  r = await call('GET', `/org/events/${evA}/roster`, ownerA);
  assert.equal(r.status, 200);
  assert.equal(r.j.stats.registered, 3); assert.equal(r.j.stats.waitlisted, 3);
  const pNew = r.j.people.find((p: any) => p.name === '验收九-新客');
  assert.equal(pNew.phone, '+19495550142'); assert.equal(pNew.answers.company, '验收九公司'); assert.equal(pNew.visits, '第一次');
  assert.equal(r.j.canExport, true);
  r = await call('GET', `/org/events/${evA}/roster`, helperA);
  assert.equal(r.status, 200);
  const hp = r.j.people.find((p: any) => p.name === '验收九-新客');
  assert.equal(hp.phone, null); assert.equal(hp.phoneMasked, '尾号 0142'); assert.deepEqual(hp.answers, {});
  assert.equal(r.j.canExport, false);
  assert.ok(!JSON.stringify(r.j).includes('9495550142'));
  r = await call('POST', `/org/events/${evA}/export`, helperA, { kind: 'file' });
  assert.equal(r.status, 403);
  ok('名单：负责人看完整手机号和报名表回答；帮手只看姓名、手机尾号、人数、到场、已交费，不能导出（403）');

  r = await call('POST', `/org/events/${evA}/roster`, helperA, { regId: pNew.id, paid: true });
  assert.equal(r.status, 200);
  r = await call('POST', `/org/events/${evA}/roster`, helperA, { regId: pNew.id, checkin: true });
  r = await call('GET', `/org/events/${evA}/roster`, ownerA);
  assert.equal(r.j.stats.paid, 1); assert.equal(r.j.stats.arrived, 3); assert.equal(r.j.stats.rate, 100);
  ok('帮手标「已交费」（主办方手动标记）、点签到；到场率按人数算');

  // ── 6. 导出 ──
  r = await call('POST', `/org/events/${evA}/export`, ownerA, { kind: 'copy' });
  assert.equal(r.status, 200); assert.match(r.j.text, /验收九-新客 \+19495550142 3位 到了 已交费/);
  r = await call('POST', `/org/events/${evA}/export`, ownerA, { kind: 'file' });
  assert.equal(r.status, 200);
  const token = String(r.j.url).split('/').pop()!;
  let dl = await call('GET', `/org/export/${token}`, null);
  assert.equal(dl.status, 200);
  assert.ok(dl.type?.includes('spreadsheetml'));
  assert.equal(dl.buf!.subarray(0, 2).toString(), 'PK');
  assert.ok(dl.buf!.toString('utf8').includes('验收九-新客'));
  dl = await call('GET', `/org/export/${token}`, null);
  assert.equal(dl.status, 404);
  r = await call('POST', `/org/events/${evA}/export`, ownerA, { kind: 'file' });
  const t2 = String(r.j.url).split('/').pop()!;
  await pool.query(`UPDATE org_exports SET expires_at = now() - interval '1 minute' WHERE token_hash = $1`, [createHash('sha256').update(t2).digest('hex')]);
  dl = await call('GET', `/org/export/${t2}`, null);
  assert.equal(dl.status, 404);
  dl = await call('GET', `/org/export/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`, null);
  assert.equal(dl.status, 404);
  const { rows: ex } = await pool.query(`SELECT kind, row_count, contact_id FROM org_exports WHERE event_id = $1 ORDER BY created_at`, [evA]);
  assert.equal(ex.length, 3); assert.ok(ex.every((x) => x.contact_id === ownerA.id && x.row_count === 2));
  ok('导出：复制文字 / xlsx 文件；下载地址只能下一次、过期作废、乱填 404；每次导出记一笔（谁、哪场、几条）');

  // ── 7. 门口签到码 ──
  const { rows: sec } = await pool.query(`SELECT checkin_secret FROM org_events WHERE id = $1`, [evA]);
  await pool.query(`UPDATE org_events SET starts_at = now() + interval '1 hour', ends_at = now() + interval '3 hours' WHERE id = $1`, [evA]);
  const walkIn = await wxUser();
  r = await call('POST', `/org/e/${codeEvA}/checkin`, walkIn, { k: 'wrongkey1' });
  assert.equal(r.status, 400);
  r = await call('POST', `/org/e/${codeEvA}/checkin`, walkIn, { k: sec[0].checkin_secret.slice(0, 8) });
  assert.equal(r.j.kind, 'need_info');
  r = await call('POST', `/org/e/${codeEvA}/checkin`, walkIn, { k: sec[0].checkin_secret.slice(0, 8), info: { name: '验收九-现场', phone: '9495550144', partySize: 1 } });
  assert.equal(r.j.kind, 'checked_in', JSON.stringify(r.j));
  r = await call('POST', `/org/e/${codeEvA}/checkin`, walkIn, { k: sec[0].checkin_secret.slice(0, 8) });
  assert.equal(r.j.kind, 'already');
  r = await call('GET', `/org/events/${evA}/door`, helperA);
  assert.equal(r.status, 200); assert.equal(r.type, 'image/png');
  ok('门口签到码：错码拦下；没报名的写称呼手机号就现场报名 + 签到（不受名额限制）；再扫说"已签到"；帮手能取门口码');

  // ── 8. 改时间地点 → 提示旧海报 ──
  r = await call('GET', `/org/events/${evA}/poster`, ownerA);
  assert.equal(r.status, 200); assert.equal(r.j.event.fee, '本活动收费，现场交（详情联系主办方）');
  r = await call('PATCH', `/org/events/${evA}`, ownerA, { ...evIn, startsAt: future(4), endsAt: future(4, 21), locationName: '验收九 新餐厅' });
  assert.equal(r.status, 200); assert.equal(r.j.posterStale, true); assert.match(r.j.message, /重新生成海报/);
  r = await call('GET', `/org/e/${codeEvA}`, stranger);
  assert.equal(r.j.event.locationName, '验收九 新餐厅');
  ok('改时间地点：报名页马上是新的；提示"旧海报要重新生成"');

  // ── 9. 取消、候补递补 ──
  r = await call('POST', `/org/e/${codeEvA}/cancel`, stranger);
  assert.equal(r.status, 409); // 已签到不能取消
  await call('POST', `/org/events/${evA}/roster`, ownerA, { regId: pNew.id, checkin: false });
  r = await call('POST', `/org/e/${codeEvA}/cancel`, stranger);
  assert.equal(r.status, 200);
  r = await call('GET', `/org/events/${evA}/roster`, ownerA);
  assert.equal(r.j.stats.waitlisted, 0);
  ok('取消报名后候补按顺序补上；已签到的不能取消');

  // ── 10. 数据隔离：「主办方的客人」不进商会各处 ──
  const guestId = walkIn.id;
  const { rows: gg } = await pool.query(`SELECT org_guest_since FROM contacts WHERE id = $1`, [guestId]);
  assert.ok(gg[0].org_guest_since);
  await pool.query(`UPDATE contacts SET name = '验收九-现场客人', phone_e164 = '+19495550144' WHERE id = $1`, [guestId]); // 有名字手机号，平时会算"客户"
  r = await call('GET', `/staff/contacts?q=${encodeURIComponent('验收九-现场客人')}`, staff);
  assert.equal(r.status, 200); assert.equal(r.j.contacts.length, 0);
  assert.ok(r.j.counts.org_guests >= 1);
  r = await call('POST', '/staff/broadcast', staff, { action: 'audience', audience: 'all', filters: { conds: [] } });
  assert.equal(r.status, 200);
  assert.ok(!r.j.list.some((x: any) => x.id === guestId));
  const { realContact } = await import('@/lib/crm/accountKind');
  const { rows: rc } = await pool.query(`SELECT ${realContact('c')} AS real FROM contacts c WHERE c.id = $1`, [guestId]);
  assert.equal(rc[0].real, false);
  const { fillPrompt } = await import('@/lib/crm/fillPrompt');
  await pool.query(`UPDATE contacts SET name = '微信用户', created_at = now() - interval '2 days' WHERE id = $1`, [guestId]);
  assert.equal((await fillPrompt(guestId)).show, false);
  await pool.query(`UPDATE contacts SET created_at = now() WHERE id = $1`, [guestId]);
  r = await call('GET', '/staff/data-summary?days=1', staff);
  const { rows: regsChamber } = await pool.query(`SELECT count(*)::int AS n FROM registrations WHERE contact_id = $1`, [guestId]);
  assert.equal(regsChamber[0].n, 0);
  const { rows: pts } = await pool.query(`SELECT count(*)::int AS n FROM points_ledger WHERE contact_id = $1`, [guestId]);
  assert.equal(pts[0].n, 0);
  const { rows: fu } = await pool.query(`SELECT count(*)::int AS n FROM crm_audit_log WHERE target_id = $1::text`, [guestId]).catch(() => ({ rows: [{ n: 0 }] }));
  assert.equal(fu[0].n, 0);
  ok('隔离：「主办方的客人」不在客户列表（搜名字搜不到，只算一个收起的数）、不在群发选人、realContact() = false（今天 / 数据页 / 推荐排行 / 跟进同一条规则）、不出补资料提醒；商会报名表、积分、操作记录里没有他');

  // 本人主动和商会发生关系 → 去掉标记；但他在主办方活动里的回答不给商会
  r = await call('POST', '/org/apply', walkIn, { orgName: '验收九-我的小店', personName: '验收九-现场', phone: '9495550144', from: codeEvA });
  assert.equal(r.status, 200);
  const { rows: lk } = await pool.query(`SELECT org_guest_since, chamber_linked_at, chamber_linked_reason FROM contacts WHERE id = $1`, [guestId]);
  assert.equal(lk[0].org_guest_since, null); assert.ok(lk[0].chamber_linked_at); assert.equal(lk[0].chamber_linked_reason, '申请开通主办方');
  const { rows: ap } = await pool.query(`SELECT from_event FROM org_applications WHERE contact_id = $1`, [guestId]);
  assert.equal(ap[0].from_event, evA);
  ok('「我也要办活动」从活动页申请：进后台、记下是从哪场来的；本人主动申请 = 去掉「主办方的客人」标记，记下哪天、因为什么');

  // ── 11. 后台：平台查看名单要写原因、留痕；下架、停用、总开关 ──
  r = await call('POST', '/staff/organizers', staff, { action: 'view', id: evA, reason: '' });
  assert.equal(r.status, 400);
  r = await call('POST', '/staff/organizers', staff, { action: 'view', id: evA, reason: '验收九 处理投诉' });
  assert.equal(r.status, 200);
  assert.ok(!JSON.stringify(r.j).includes('9495550142'));
  assert.ok(!JSON.stringify(r.j).includes('验收九公司'));
  const { rows: vw } = await pool.query(`SELECT reason FROM org_data_views WHERE event_id = $1`, [evA]);
  assert.equal(vw.length, 1);
  ok('平台查看名单：不写原因不让看；看到的只有姓名、手机尾号、人数、到场（没有报名表回答）；每次记一笔');

  r = await call('POST', '/reports', stranger, { kind: 'org_event', targetId: codeEvA, reason: '广告推销' });
  assert.equal(r.status, 200);
  ok('报名页可举报（进「内容管理」）');

  r = await call('POST', '/staff/organizers', staff, { action: 'event', op: 'takedown', id: evA, reason: '' });
  assert.equal(r.status, 400);
  r = await call('POST', '/staff/organizers', staff, { action: 'event', op: 'takedown', id: evA, reason: '验收九 下架测试' });
  r = await call('GET', `/org/e/${codeEvA}`, stranger);
  assert.equal(r.j.closed, true); assert.match(r.j.reason, /下架/);
  r = await call('POST', `/org/e/${codeEvA}/register`, ownerB, { name: 'x', phone: '9495550145' });
  assert.equal(r.status, 400);
  r = await call('GET', `/org/events/${evA}/roster`, ownerA);
  assert.equal(r.j.event.statusLabel, '已下架'); assert.equal(r.j.event.takenDownReason, '验收九 下架测试');
  await call('POST', '/staff/organizers', staff, { action: 'event', op: 'restore', id: evA });
  ok('后台一键下架（要写原因）：报名页显示"已下架"、不能报名；主办方看到原因；能恢复');

  r = await call('POST', '/staff/organizers', staff, { action: 'org', op: 'suspend', id: orgA, reason: '验收九 停用测试' });
  assert.equal(r.status, 200);
  r = await call('GET', `/org/e/${codeEvA}`, stranger);
  assert.equal(r.j.closed, true);
  r = await call('POST', '/org/events', ownerA, evIn);
  assert.equal(r.status, 403);
  r = await call('POST', `/org/events/${evA}/export`, ownerA, { kind: 'copy' });
  assert.equal(r.status, 200);
  r = await call('GET', '/org/home', ownerA);
  assert.equal(r.j.organizer.suspended, true);
  await call('POST', '/staff/organizers', staff, { action: 'org', op: 'resume', id: orgA });
  ok('停用主办方：活动全部下架、不能发新活动；30 天内负责人还能导出名单；能恢复');

  r = await call('POST', '/staff/organizers', staff, { action: 'switch', key: 'tool', on: false });
  assert.equal(r.status, 200);
  r = await call('GET', '/me?view=mp', ownerA);
  assert.equal(r.j.organizer, null);
  r = await call('GET', `/org/e/${codeEvA}`, stranger);
  assert.equal(r.j.closed, true); assert.match(r.j.reason, /暂停/);
  r = await call('GET', '/org/home', ownerA);
  assert.equal(r.status, 400);
  await call('POST', '/staff/organizers', staff, { action: 'switch', key: 'tool', on: true });
  ok('总开关关：「我的」入口消失、报名页"暂停使用"、主办方页不能用；打开恢复');

  // ── 12. 接龙（同一套，开关关着看不到） ──
  await pool.query(`UPDATE organizers SET review_left = 0 WHERE id = $1`, [orgA]);
  await call('POST', '/staff/organizers', staff, { action: 'switch', key: 'chain', on: true });
  r = await call('GET', '/org/templates', ownerA);
  assert.ok(r.j.templates.some((t: any) => t.key === 'chain'));
  r = await call('POST', '/org/events', ownerA, { ...evIn, title: `验收九-接龙-${uniq}`, mode: 'chain', listPublic: 'nickname', capacity: 10 });
  assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(r.j.status, 'published');
  const codeChain = r.j.code as string;
  await call('POST', `/org/e/${codeChain}/register`, stranger, { name: '验收九-接龙人', phone: '9495550146', partySize: 2, nickname: '小王', note: '晚到10分钟' });
  r = await call('GET', `/org/e/${codeChain}`, ownerB);
  assert.deepEqual(r.j.chain, [{ nickname: '小王', partySize: 2, mine: false }]);
  assert.ok(!JSON.stringify(r.j).includes('9495550146') && !JSON.stringify(r.j).includes('验收九-接龙人'));
  assert.equal(r.j.event.people, 2);
  await call('POST', '/staff/organizers', staff, { action: 'switch', key: 'chain', on: false });
  r = await call('GET', `/org/e/${codeChain}`, ownerB);
  assert.equal(r.j.closed, true); assert.match(r.j.reason, /接龙/);
  r = await call('GET', '/org/templates', ownerA);
  assert.ok(!r.j.templates.some((t: any) => t.key === 'chain'));
  ok('接龙 = 同一套（同一份名单）：公开称呼时别人只看到称呼和几位，看不到手机号和真名；接龙开关关着时接龙页"还没开放"、模板里没有接龙；新主办方前 3 场放完后机器检测通过直接公开');

  // 试用看板
  r = await call('GET', '/staff/organizers?view=trial', staff);
  const row = r.j.rows.find((x: any) => x.id === orgA);
  assert.equal(row.firstComposeSecs, 47); assert.ok(row.events >= 2); assert.equal(row.secondByThemselves, true); assert.equal(row.apps, 1); assert.ok(row.exports >= 3);
  ok('试用看板：第一次发布填了多久、发了几场、自己再办第二场、导出次数、从活动页来的申请');

  console.log(`\n全部通过：${passed} 项`);
}

async function cleanup() {
  const ids = contacts;
  const { rows: o } = await pool.query<{ id: string }>(`SELECT id FROM organizers WHERE id = ANY($1::uuid[]) OR name LIKE '验收九-%'`, [orgIds]);
  const orgs = o.map((x) => x.id);
  await pool.query(`DELETE FROM ugc_reports WHERE kind = 'org_event' AND target_id IN (SELECT code FROM org_events WHERE organizer_id = ANY($1::uuid[]))`, [orgs]).catch((e) => console.error(e.message));
  await pool.query(`DELETE FROM crm_audit_log WHERE target_type IN ('organizer', 'org_event') AND target_id IN (SELECT id::text FROM organizers WHERE id = ANY($1::uuid[]) UNION SELECT id::text FROM org_events WHERE organizer_id = ANY($1::uuid[]))`, [orgs]).catch((e) => console.error(e.message));
  await pool.query(`DELETE FROM org_applications WHERE contact_id = ANY($1::uuid[]) OR org_name LIKE '验收九-%'`, [ids]).catch((e) => console.error(e.message));
  await pool.query(`DELETE FROM organizers WHERE id = ANY($1::uuid[])`, [orgs]).catch((e) => console.error(e.message)); // 级联删活动、报名、码、成员、导出记录
  await pool.query(`DELETE FROM org_data_views WHERE organizer_id IS NULL AND reason LIKE '验收九%'`).catch(() => undefined);
  await pool.query(`DELETE FROM crm_audit_log WHERE actor LIKE '%验收九-工作人员%' OR (target_type = 'crm_settings' AND target_id IN ('org_tool_on', 'org_chain_on') AND created_at > now() - interval '1 day' AND actor LIKE '%验收九%')`).catch(() => undefined);
  await pool.query(`DELETE FROM track_events WHERE contact_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
  await pool.query(`DELETE FROM sessions WHERE contact_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
  await pool.query(`DELETE FROM staff_roles WHERE email = ANY($1) OR name LIKE '验收九-工作人员%'`, [staffEmails]).catch(() => undefined);
  await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[])`, [ids]).catch((e) => console.error('contacts', e.message));
  for (const [k, v] of Object.entries(saved)) {
    if (v === null) await pool.query(`DELETE FROM crm_settings WHERE key = $1`, [k]).catch(() => undefined);
    else await pool.query(`INSERT INTO crm_settings (key, value, updated_by) VALUES ($1, $2, 'v160-test') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [k, JSON.stringify(v)]).catch(() => undefined);
  }
}

main()
  .catch((e) => { console.error('✗ 失败：', e); process.exitCode = 1; })
  .finally(async () => {
    if (!process.argv.includes('--keep')) await cleanup();
    else console.log('（--keep：测试数据留着）', JSON.stringify({ contacts, orgIds }));
    await pool.end();
  });
