/**
 * 找工人 · 接活儿：工作人员代登记（后台优化 D，迁移 0041）—— 接口测试（真实 HTTP + 本机一次性库 / 测试库）。
 * 只建「验收优-」开头的数据，结束按 ID 清理干净；不发任何真实消息（notify_live 关着时只记录；测完设置恢复原值）。
 * 用法：
 *   1) DATABASE_URL=<本机库> pnpm dev -p 3418
 *   2) BASE=http://localhost:3418 DATABASE_URL=<本机库> pnpm dlx tsx scripts/jobs-proxy-tests.ts
 * 覆盖：单个代登记（预览 → 写入）、资质规则和本人登记一致（无牌照被拒、未开放工种被拒）、批量粘贴（含被拒的行、表里重复）、
 *       同号去重（已有接活人提示不建、已有档案关联）、确认链接（签名、一次性、确认 / 不用登记）、短信只记录不发、
 *       没确认前上不上列表的开关、公开卡片不出“商会代登记”。
 */
import assert from 'node:assert/strict';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { guardNotProduction } from './_guard';

guardNotProduction();
const BASE = (process.env.BASE || 'http://localhost:3418').replace(/\/$/, '');
const pool = getPool();
const contacts: string[] = [];
const staffEmails: string[] = [];
const staffActors: string[] = [];
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };
const uniq = randomBytes(3).toString('hex');
const P = '验收优-';
// 号码：+1 626 555 12xx。故意不用 555-01xx 虚构号——那些在测试站算“测试身份”会真去发；这里要验证“不是测试身份只记录不发”。
// 这些号码只在本机 / 测试库里出现，任何情况下都不会真发（不是测试身份 → 总闸只记录）。
const base = 10 + (parseInt(uniq, 16) % 60);
const fake = (i: number) => `626-555-12${String(base + i).padStart(2, '0')}`;
const e164 = (i: number) => `+1626555${'12'}${String(base + i).padStart(2, '0')}`;

async function person(name: string, opts: { staff?: boolean; roles?: string[]; phone?: string | null } = {}) {
  const email = `proxy-${uniq}-${contacts.length}@example.com`;
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO contacts (name, email, email_verified_at, phone_e164, acquisition_source) VALUES ($1, $2, now(), $3, 'test') RETURNING id`,
    [name, email, opts.phone ?? null]
  );
  const id = rows[0].id;
  contacts.push(id);
  if (opts.staff) {
    const staffName = `${name}-${uniq}`;
    await pool.query(`INSERT INTO staff_roles (email, name, roles) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`, [email, staffName, opts.roles ?? ['admin']]);
    staffEmails.push(email);
    staffActors.push(`staff:${staffName}`, `staff:${email}`);
  }
  const token = randomBytes(32).toString('base64url');
  await pool.query(`INSERT INTO sessions (token_hash, contact_id, channel, expires_at) VALUES ($1, $2, 'web', now() + interval '1 day')`, [
    createHash('sha256').update(token, 'utf8').digest('hex'), id
  ]);
  return { id, token };
}

type Res = { status: number; j: Record<string, any> };
async function call(method: string, path: string, who?: { token: string } | null, b?: unknown): Promise<Res> {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers: { ...(b ? { 'Content-Type': 'application/json' } : {}), ...(who ? { Authorization: `Bearer ${who.token}` } : {}) },
    body: b ? JSON.stringify(b) : undefined
  });
  return { status: res.status, j: (await res.json().catch(() => ({}))) as Record<string, any> };
}
/** 和服务器同一套签名（本地 / 测试没有密钥时是 dev-local-only） */
function tokenFor(nonce: string) {
  const secret = process.env.NEWSLETTER_SECRET || process.env.CRON_SECRET || process.env.AGENT_IP_SALT || 'dev-local-only';
  return `${nonce}.${createHmac('sha256', secret).update(`jobs-proxy-confirm|${nonce}`).digest('base64url').slice(0, 16)}`;
}
async function contactOf(proId: string) {
  return (await pool.query<{ contact_id: string }>(`SELECT contact_id FROM jobs_pros WHERE id = $1`, [proId])).rows[0].contact_id;
}

const saved: Record<string, unknown> = {};
async function main() {
  for (const k of ['notify_live', 'jobs_proxy_list_before_confirm']) {
    const { rows } = await pool.query(`SELECT value FROM crm_settings WHERE key = $1`, [k]);
    saved[k] = rows[0]?.value ?? null;
  }
  await pool.query(`INSERT INTO crm_settings (key, value) VALUES ('notify_live', 'false') ON CONFLICT (key) DO UPDATE SET value = 'false'`);
  await pool.query(`INSERT INTO crm_settings (key, value) VALUES ('jobs_proxy_list_before_confirm', 'true') ON CONFLICT (key) DO UPDATE SET value = 'true'`);
  const staff = await person(`${P}工作人员`, { staff: true });
  const ops = await person(`${P}运营`, { staff: true, roles: ['ops'] });
  const stranger = await person(`${P}路人`);

  // ── 权限
  let r = await call('GET', '/workbench/jobs/proxy', stranger);
  assert.equal(r.status, 403);
  r = await call('GET', '/workbench/jobs/proxy', ops);
  assert.equal(r.status, 200);
  assert.deepEqual(r.j.columns, ['姓名', '电话', '身份', '工种', '城市', '年限', '牌照号/登记号', '介绍']);
  assert.equal(r.j.settings.notifyLive, false);
  assert.ok(r.j.smsTemplate.includes('商会帮你登记了'));
  ok('权限：非工作人员 403；工作人员拿到列名、示例、确认短信原文、总闸状态（关）');

  // ── 单个：无牌照被拒（规则和本人登记一样）
  const one = { role: 'licensed', name: `${P}张师傅`, phone: fake(0), trades: ['水管'], cities: ['尔湾'], years: '12', intro: '验收数据' };
  r = await call('POST', '/workbench/jobs/proxy', ops, { mode: 'preview', row: one });
  assert.equal(r.status, 200);
  assert.equal(r.j.row.ok, false);
  assert.ok(r.j.row.errors.some((e: string) => e.includes('请填牌照号')), JSON.stringify(r.j.row.errors));
  r = await call('POST', '/workbench/jobs/proxy', ops, { mode: 'save', row: one });
  assert.equal(r.j.saved, false);
  assert.equal((await pool.query(`SELECT 1 FROM jobs_pros WHERE name = $1`, [one.name])).rows.length, 0);
  ok('单个：持牌师傅没填牌照号 → 预览就说被拒，写入也不写');

  // 没开放的工种不让上（工作人员代登记也不放宽）
  r = await call('POST', '/workbench/jobs/proxy', ops, { mode: 'preview', row: { ...one, licenseNo: '1050000', trades: ['水损霉菌修复'] } });
  assert.equal(r.j.row.ok, false);
  assert.ok(r.j.row.errors.some((e: string) => e.includes('还没开放')));
  ok('单个：没开放登记的工种（水损霉菌修复）照样被拒');

  // 写入
  r = await call('POST', '/workbench/jobs/proxy', ops, { mode: 'save', row: { ...one, licenseNo: '1050000' } });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.equal(r.j.saved, true, JSON.stringify(r.j));
  const zhangId: string = r.j.proId;
  contacts.push(await contactOf(zhangId));
  assert.equal(r.j.sms.status, 'logged');
  const { rows: z } = await pool.query(
    `SELECT status, proxy_by, license_state->>'state' AS cslb, confirm_sms_status, confirm_nonce, self_confirmed_at FROM jobs_pros WHERE id = $1`, [zhangId]
  );
  assert.equal(z[0].status, 'pending');
  assert.ok(z[0].proxy_by.startsWith('staff:'));
  assert.equal(z[0].cslb, 'queued');
  assert.equal(z[0].confirm_sms_status, 'logged');
  assert.equal(z[0].self_confirmed_at, null);
  const { rows: gl } = await pool.query<{ to_masked: string; body: string; status: string; kind: string }>(
    `SELECT to_masked, body, status, kind FROM notify_log WHERE ref = $1`, [`jobs_pro:${zhangId}`]
  );
  assert.equal(gl.length, 1);
  assert.ok(['held', 'blocked'].includes(gl[0].status), gl[0].status);
  assert.equal(gl[0].kind, '代登记确认短信');
  assert.ok(!gl[0].to_masked.includes(e164(0).slice(2, 8)), '收件人打码');
  assert.ok(!gl[0].body.includes(z[0].confirm_nonce), '记录里链接令牌打码');
  assert.ok(gl[0].body.includes('商会帮你登记了') && gl[0].body.includes('/zh/jobs/confirm/'));
  const { rows: ex } = await pool.query(`SELECT 1 FROM ops_exceptions WHERE dedupe_key = $1`, [`jobs_verify:${zhangId}`]);
  assert.ok(ex[0], '进待跟进（等核验）');
  ok('单个写入：核验中、标商会代登记、CSLB 照常排队、进待跟进；确认短信总闸关着只记录（收件人、令牌都打码），状态“已记录待发”');

  // ── 同号去重：已有接活人 → 提示不建
  r = await call('POST', '/workbench/jobs/proxy', ops, { mode: 'save', row: { ...one, name: `${P}张师傅二号`, licenseNo: '1050000' } });
  assert.equal(r.j.saved, false);
  assert.equal(r.j.row.action, 'duplicate');
  assert.ok(r.j.row.outcome.includes('不会重复建'));
  assert.equal((await pool.query(`SELECT 1 FROM jobs_pros WHERE name = $1`, [`${P}张师傅二号`])).rows.length, 0);
  ok('同号去重：这个电话已有接活人 → 提示“不会重复建”，没建第二个');

  // 同号已有档案（没登记接活）→ 关联到已有档案，不另建档案
  const old = await person(`${P}老会员`, { phone: e164(1) });
  r = await call('POST', '/workbench/jobs/proxy', ops, { mode: 'save', row: { role: 'worker', name: `${P}老会员`, phone: fake(1), trades: ['油漆粉刷'], cities: ['钻石吧'] } });
  assert.equal(r.j.saved, true, JSON.stringify(r.j));
  assert.equal(r.j.row.action, 'link');
  assert.equal(await contactOf(r.j.proId), old.id);
  const { rows: w } = await pool.query(`SELECT status, verified_trades FROM jobs_pros WHERE id = $1`, [r.j.proId]);
  assert.equal(w[0].status, 'verified', '工人和本人登记一样：登记即生效');
  ok('同号已有档案 → 挂到那份档案上（不另建）；工人登记即生效（和本人登记一样）');

  // ── 批量：含被拒的行、表里重复、同号已有
  const text = [
    '姓名\t电话\t身份\t工种\t城市\t年限\t牌照号/登记号\t介绍',
    `${P}李姐保洁\t${fake(2)}\t设计与专业服务\t清洁保洁\t尔湾\t5\t202412345678\t验收数据`,
    `${P}无牌照公司\t${fake(3)}\t施工队或公司\t全屋翻新\t尔湾\t3\t\t验收数据`,
    `${P}错城市\t${fake(4)}\t工人\t油漆粉刷\t火星\t\t\t`,
    `${P}重复行\t${fake(2)}\t工人\t油漆粉刷\t尔湾\t\t\t`,
    `${P}张师傅再来\t${fake(0)}\t持牌师傅\t水管\t尔湾\t\t1050000\t`,
    `${P}电工\t${fake(5)}\t持牌师傅\t电工\t尔湾、橙县其他\t9\t1050001\t验收数据`
  ].join('\n');
  r = await call('POST', '/workbench/jobs/proxy/batch', ops, { text, mode: 'preview' });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.equal(r.j.headerFound, true);
  assert.deepEqual(r.j.summary, { total: 6, willSave: 2, rejected: 3, duplicate: 1, linked: 0 });
  const rows = r.j.rows as { line: number; ok: boolean; action: string; errors: string[]; notes: string[]; data: { businessRegNo: string | null; licenseNo: string | null } }[];
  assert.equal(rows[0].data.businessRegNo, '202412345678', '只要营业登记的工种：那一格认成营业登记号');
  assert.ok(rows[1].errors.some((e) => e.includes('请填牌照号')));
  assert.ok(rows[2].errors.some((e) => e.includes('火星')));
  assert.ok(rows[3].errors.some((e) => e.includes('第 2 行')));
  assert.equal(rows[4].action, 'duplicate');
  assert.equal(rows[5].data.licenseNo, '1050001');
  assert.equal((await pool.query(`SELECT 1 FROM jobs_pros WHERE name LIKE $1`, [`${P}李姐%`])).rows.length, 0, '预览不写库');
  ok('批量预览：认出表头；每行说清能登记 / 被拒（没牌照、城市不对、表里重复）/ 已登记过；预览不写库');

  r = await call('POST', '/workbench/jobs/proxy/batch', ops, { text, mode: 'save' });
  assert.equal(r.status, 400, '没确认不写');
  r = await call('POST', '/workbench/jobs/proxy/batch', ops, { text, mode: 'save', confirm: true, sendSms: false });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.equal(r.j.saved, 2);
  const { rows: bs } = await pool.query<{ id: string; name: string; status: string; business_reg_no: string | null; confirm_sms_status: string | null; contact_id: string }>(
    `SELECT id, name, status, business_reg_no, confirm_sms_status, contact_id FROM jobs_pros WHERE name = ANY($1) ORDER BY name`, [[`${P}李姐保洁`, `${P}电工`]]
  );
  assert.equal(bs.length, 2);
  for (const b of bs) contacts.push(b.contact_id);
  assert.ok(bs.every((b) => b.status === 'pending' && b.confirm_sms_status === null));
  ok('批量写入：要先确认；只写能写的 2 行，被拒和已登记过的不写；不勾发短信时短信状态“未发”');

  // ── 列表：短信状态四种
  const lijie = bs.find((b) => b.name.includes('李姐'))!;
  r = await call('POST', '/workbench/jobs/proxy/sms', ops, { ids: [lijie.id] });
  assert.equal(r.j.logged, 1);
  assert.equal(r.j.sent, 0);
  assert.equal(r.j.live, false);
  r = await call('GET', '/workbench/jobs/proxy', ops);
  const by = (id: string) => r.j.items.find((x: { id: string }) => x.id === id);
  assert.equal(by(lijie.id).smsLabel, '已记录待发');
  assert.equal(by(bs.find((b) => b.name.includes('电工'))!.id).smsLabel, '未发');
  assert.equal(by(zhangId).smsLabel, '已记录待发');
  ok('后台列表：每人显示确认短信状态（未发 / 已记录待发）；补发也走总闸，只记录');

  // ── 确认链接
  const nonce1 = (await pool.query<{ confirm_nonce: string }>(`SELECT confirm_nonce FROM jobs_pros WHERE id = $1`, [zhangId])).rows[0].confirm_nonce;
  r = await call('GET', `/jobs/confirm/${nonce1}.AAAAAAAAAAAAAAAA`);
  assert.equal(r.status, 404, '签名不对不认');
  r = await call('GET', `/jobs/confirm/${tokenFor(nonce1)}`);
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.equal(r.j.pro.name, `${P}张师傅`);
  assert.equal(r.j.pro.licenseNo, '1050000');
  assert.ok(r.j.phoneMasked.includes('****'));
  assert.equal(r.j.editUrl, '/zh/jobs/register');
  assert.ok(!JSON.stringify(r.j).includes('商会认证'));
  // 重发换新令牌：旧链接作废
  await call('POST', '/workbench/jobs/proxy/sms', ops, { ids: [zhangId] });
  r = await call('GET', `/jobs/confirm/${tokenFor(nonce1)}`);
  assert.equal(r.status, 404, '重发后旧链接作废');
  const nonce2 = (await pool.query<{ confirm_nonce: string }>(`SELECT confirm_nonce FROM jobs_pros WHERE id = $1`, [zhangId])).rows[0].confirm_nonce;
  r = await call('POST', `/jobs/confirm/${tokenFor(nonce2)}`, null, { action: 'confirm' });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  const { rows: zc } = await pool.query(`SELECT self_confirmed_at, self_confirm_via, agreed_at, confirm_nonce FROM jobs_pros WHERE id = $1`, [zhangId]);
  assert.ok(zc[0].self_confirmed_at && zc[0].agreed_at);
  assert.equal(zc[0].self_confirm_via, 'link');
  assert.equal(zc[0].confirm_nonce, null);
  r = await call('POST', `/jobs/confirm/${tokenFor(nonce2)}`, null, { action: 'confirm' });
  assert.equal(r.status, 404, '一次性：用过不能再用');
  r = await call('GET', '/workbench/jobs/proxy', ops);
  assert.equal(r.j.items.find((x: { id: string }) => x.id === zhangId).smsLabel, '已确认');
  ok('确认链接：不用登录；签名不对 404；重发换新令牌旧的作废；确认后标“本人已确认”（并记同意规则）；一次性；列表显示“已确认”');

  // 不是我 / 不用登记 → 撤下、进待跟进
  await call('POST', '/workbench/jobs/proxy/sms', ops, { ids: [lijie.id] });
  const nonce3 = (await pool.query<{ confirm_nonce: string }>(`SELECT confirm_nonce FROM jobs_pros WHERE id = $1`, [lijie.id])).rows[0].confirm_nonce;
  r = await call('POST', `/jobs/confirm/${tokenFor(nonce3)}`, null, { action: 'decline' });
  assert.equal(r.status, 200);
  const { rows: ld } = await pool.query(`SELECT status, listed, self_declined_at FROM jobs_pros WHERE id = $1`, [lijie.id]);
  assert.equal(ld[0].status, 'removed');
  assert.equal(ld[0].listed, false);
  assert.ok((await pool.query(`SELECT 1 FROM ops_exceptions WHERE dedupe_key = $1`, [`jobs_proxy_declined:${lijie.id}`])).rows[0]);
  ok('确认页“不是我 / 不用登记”：撤下（不上列表），提醒工作人员');

  // ── 核验通过即上列表；设置改成“等本人确认”后，没确认的撤下、确认过的照上；公开卡片不出“商会代登记”
  const dian = bs.find((b) => b.name.includes('电工'))!;
  for (const id of [zhangId, dian.id]) {
    r = await call('POST', `/workbench/jobs/pros/${id}/verify`, staff, { action: 'approve' });
    assert.equal(r.status, 200, JSON.stringify(r.j));
  }
  // 收费方式不是“必须是会员”时，非会员核验通过即上
  const fee = (await pool.query(`SELECT value FROM crm_settings WHERE key = 'jobs_work_fee_mode'`)).rows[0]?.value;
  if (fee !== 'members_only') {
    let { rows: ls } = await pool.query<{ id: string; listed: boolean }>(`SELECT id, listed FROM jobs_pros WHERE id = ANY($1)`, [[zhangId, dian.id]]);
    assert.ok(ls.every((x) => x.listed), '核验通过即上（和本人登记一致）');
    r = await call('PATCH', '/workbench/jobs/proxy', ops, { listBeforeConfirm: false });
    assert.equal(r.status, 403, '改设置只限管理员');
    r = await call('PATCH', '/workbench/jobs/proxy', staff, { listBeforeConfirm: false });
    assert.equal(r.status, 200);
    ({ rows: ls } = await pool.query<{ id: string; listed: boolean }>(`SELECT id, listed FROM jobs_pros WHERE id = ANY($1)`, [[zhangId, dian.id]]));
    assert.equal(ls.find((x) => x.id === zhangId)!.listed, true, '本人确认过的照上');
    assert.equal(ls.find((x) => x.id === dian.id)!.listed, false, '没确认的撤下');
    await call('PATCH', '/workbench/jobs/proxy', staff, { listBeforeConfirm: true });
    r = await call('GET', `/jobs/pros/${dian.id}`);
    assert.equal(r.status, 200);
    const s = JSON.stringify(r.j);
    assert.ok(!s.includes('代登记') && !s.includes('proxy') && !s.includes('商会认证'), '公开卡片不出代登记');
    ok('核验通过即上列表；设置改“等本人确认”（只限管理员）后没确认的撤下、确认过的照上；公开卡片不出“商会代登记”');
  } else {
    console.log('  - 收费方式是“必须是会员”，跳过上列表那一段');
  }

  // 后台核验列表带代登记标记
  r = await call('GET', '/workbench/jobs/pros?status=verified', staff);
  const zi = r.j.items.find((x: { id: string }) => x.id === zhangId);
  assert.equal(zi.proxy, true);
  assert.equal(zi.selfConfirmed, true);
  ok('「接活人核验」里带“商会代登记 · 本人已确认”标记');

  // ── 本人要修改：用登记的手机号登录（同一份档案）→ 正常登记页带入代登记的资料；提交 = 本人已确认
  {
    const dc = await contactOf(dian.id);
    await pool.query(`UPDATE contacts SET phone_verified_at = now() WHERE id = $1`, [dc]);
    const tk = randomBytes(32).toString('base64url');
    await pool.query(`INSERT INTO sessions (token_hash, contact_id, channel, expires_at) VALUES ($1, $2, 'web', now() + interval '1 day')`, [createHash('sha256').update(tk, 'utf8').digest('hex'), dc]);
    const me = { token: tk };
    r = await call('GET', '/jobs/me/pro', me);
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.pro.name, `${P}电工`);
    assert.equal(r.j.pro.licenseNo, '1050001');
    r = await call('POST', '/jobs/me/pro', me, { agree: true, role: 'licensed', name: `${P}电工`, trades: ['electrical'], cities: ['irvine'], licenseNo: '1050001', intro: '本人改过' });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    const { rows: de } = await pool.query(`SELECT self_confirmed_at, self_confirm_via, proxy_by FROM jobs_pros WHERE id = $1`, [dian.id]);
    assert.ok(de[0].self_confirmed_at);
    assert.equal(de[0].self_confirm_via, 'edit');
    assert.ok(de[0].proxy_by, '还是标商会代登记');
    ok('本人要修改：用登记的手机号登录后「我的接活儿」带入代登记的资料；改完提交 = 本人已确认（仍标商会代登记）');
  }

  // ── 总闸开着、测试环境：不是测试身份照样只记录（这里的人名不以「验收」开头）
  const outsider = await person('代登记外人', { phone: null });
  await pool.query(`UPDATE crm_settings SET value = 'true' WHERE key = 'notify_live'`);
  r = await call('POST', '/workbench/jobs/proxy', ops, { mode: 'save', sendSms: false, row: { role: 'worker', name: '代登记外人', phone: fake(6), trades: ['油漆粉刷'], cities: ['尔湾'] } });
  assert.equal(r.j.saved, true, JSON.stringify(r.j));
  contacts.push(await contactOf(r.j.proId));
  const outsiderPro = r.j.proId;
  r = await call('POST', '/workbench/jobs/proxy/sms', ops, { ids: [outsiderPro] });
  assert.equal(r.j.sent, 0);
  assert.equal(r.j.logged, 1);
  assert.equal((await pool.query(`SELECT status FROM notify_log WHERE ref = $1 ORDER BY id DESC LIMIT 1`, [`jobs_pro:${outsiderPro}`])).rows[0].status, 'blocked');
  await pool.query(`UPDATE crm_settings SET value = 'false' WHERE key = 'notify_live'`);
  void outsider;
  ok('总闸开着时测试环境也只发测试号码：别的号码照样只记录（notify_log status=blocked）');

  console.log(`\n全部通过：${passed} 项`);
}

main()
  .catch((e) => { console.error('✗ 失败：', e); process.exitCode = 1; })
  .finally(async () => {
    const ids = Array.from(new Set(contacts));
    await pool.query(`DELETE FROM notify_log WHERE ref IN (SELECT 'jobs_pro:' || id FROM jobs_pros WHERE contact_id = ANY($1::uuid[]))`, [ids]).catch((e) => console.error(e.message));
    await pool.query(`DELETE FROM ops_exceptions WHERE ref IN (SELECT id::text FROM jobs_pros WHERE contact_id = ANY($1::uuid[]))`, [ids]).catch((e) => console.error(e.message));
    await pool.query(`DELETE FROM crm_audit_log WHERE target_id IN (SELECT id::text FROM jobs_pros WHERE contact_id = ANY($1::uuid[]))`, [ids]).catch(() => undefined);
    await pool.query(`DELETE FROM jobs_notifications WHERE contact_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
    await pool.query(`DELETE FROM jobs_pros WHERE contact_id = ANY($1::uuid[])`, [ids]).catch((e) => console.error(e.message));
    await pool.query(`DELETE FROM crm_audit_log WHERE actor = ANY($1::text[])`, [staffActors]).catch(() => undefined);
    await pool.query(`DELETE FROM sessions WHERE contact_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
    await pool.query(`DELETE FROM staff_roles WHERE email = ANY($1)`, [staffEmails]).catch(() => undefined);
    await pool.query(`DELETE FROM contact_methods WHERE contact_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
    await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[])`, [ids]).catch((e) => console.error('contacts', e.message));
    for (const [k, v] of Object.entries(saved)) {
      if (v === null) await pool.query(`DELETE FROM crm_settings WHERE key = $1`, [k]).catch(() => undefined);
      else await pool.query(`UPDATE crm_settings SET value = $2 WHERE key = $1`, [k, JSON.stringify(v)]).catch(() => undefined);
    }
    await pool.end();
  });
