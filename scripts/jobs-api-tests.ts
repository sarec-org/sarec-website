/**
 * 找工人 · 接活 —— 接口测试（真实 HTTP + 测试库）。只建「验收工-」/「DEVJOBS-」数据，结束按 ID 清理干净。
 * 用法：
 *   1) 用测试库起本地服务：DATABASE_URL=<测试库> CRON_SECRET=<随便一串> pnpm dev -p 3417
 *   2) BASE=http://localhost:3417 CRON_SECRET=<同上> DATABASE_URL=<测试库> pnpm dlx tsx scripts/jobs-api-tests.ts --i-know-this-is-not-production
 *   测试站：BASE=https://sarec-crm-preview.vercel.app CRON_DIRECT=1 DATABASE_URL=<测试库> …（定时任务在本进程直接跑，见 cron()）
 * 测完开关恢复成测之前的值。不发任何真实消息（本地没有短信 / 微信配置；保险也会拦住不是测试身份的人）。
 */
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { guardNotProduction } from './_guard';

guardNotProduction();
const BASE = (process.env.BASE || 'http://localhost:3417').replace(/\/$/, '');
const CRON = process.env.CRON_SECRET || '';
const pool = getPool();
const contacts: string[] = [];
const staffEmails: string[] = [];
/** 这次跑建的工作人员在操作记录里的名字（带本次随机后缀），收尾只删这些人的操作记录，不碰别的窗口的 */
const staffActors: string[] = [];
const testPhones: string[] = [];
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };
const uniq = randomBytes(3).toString('hex');

async function person(name: string, opts: { phone?: boolean; staff?: boolean; roles?: string[] } = {}) {
  const email = `jobs-${uniq}-${contacts.length}@example.com`;
  const phone = opts.phone === false ? null : `+1626${String(Math.floor(1e6 + Math.random() * 8.9e6))}`;
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO contacts (name, email, email_verified_at, phone_e164, phone_verified_at, acquisition_source)
     VALUES ($1, $2, now(), $3, CASE WHEN $3::text IS NULL THEN NULL ELSE now() END, 'test') RETURNING id`,
    [name, email, phone && !(await phoneTaken(phone)) ? phone : null]
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
async function phoneTaken(p: string) {
  return !!(await pool.query(`SELECT 1 FROM contacts WHERE phone_e164 = $1`, [p])).rows[0];
}

type Res = { status: number; j: Record<string, any> };
async function call(method: string, path: string, who?: { token: string } | null, b?: unknown, headers: Record<string, string> = {}): Promise<Res> {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers: { ...(b ? { 'Content-Type': 'application/json' } : {}), ...(who ? { Authorization: `Bearer ${who.token}` } : {}), ...headers },
    body: b ? JSON.stringify(b) : undefined
  });
  return { status: res.status, j: (await res.json().catch(() => ({}))) as Record<string, any> };
}
const MP = { 'X-Sarec-Client': 'mp-1.4.3' };
async function cron(task: string) {
  // CRON_DIRECT=1：定时任务在本进程里直接跑（和 /api/cron/jobs 同一套函数、同一个测试库）。
  // 用于测试站：Vercel 的 Preview CRON_SECRET 是「敏感」变量，vercel env pull 拿到的只是占位符，没法从外面调测试站的定时任务。
  if (process.env.CRON_DIRECT === '1') {
    const n = await import('@/lib/jobs/notify');
    const v = await import('@/lib/jobs/verify');
    const j: Record<string, any> = { task };
    if (task === 'dispatch') { j.dispatch = await n.runDispatch(); j.verify = await v.runVerification(new Date(), { onlyQueued: true }); }
    if (task === 'daily') { j.dispatch = await n.runDispatch(); j.expiry = await n.runExpiry(); j.followups = await n.runFollowups(); j.verify = await v.runVerification(); }
    return { status: 200, j };
  }
  const res = await fetch(`${BASE}/api/cron/jobs?task=${task}`, { method: 'POST', headers: { Authorization: `Bearer ${CRON}` } });
  return { status: res.status, j: (await res.json()) as Record<string, any> };
}

let savedSwitches: Record<string, unknown> | null = null;

async function main() {
  const { rows: sw } = await pool.query<{ key: string; value: unknown }>(`SELECT key, value FROM crm_settings WHERE key LIKE 'jobs_%'`);
  savedSwitches = Object.fromEntries(sw.map((r) => [r.key, r.value]));
  await pool.query(`UPDATE crm_settings SET value = 'false' WHERE key IN ('jobs_find_on', 'jobs_work_on')`);
  // D28：收费方式先设成“必须是会员”（原来 requirePaid 开着的测试照旧）；免费次数 2、发活儿不限
  await pool.query(
    `INSERT INTO crm_settings (key, value, updated_by) VALUES ('jobs_work_fee_mode', '"members_only"', 'test'), ('jobs_free_contacts', '2', 'test'), ('jobs_free_posts', 'null', 'test')
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`
  );

  const staff = await person('验收工-工作人员', { staff: true });
  const owner = await person('验收工-房主');
  const noPhone = await person('验收工-没手机', { phone: false });
  const crewBoss = await person('验收工-施工队老板');
  const proA = await person('验收工-持牌公司');
  const worker = await person('验收工-工人');
  const real = await person('DEVJOBS-不是测试身份');
  const designer = await person('验收工-室内设计');
  const opsStaff = await person('验收工-运营', { staff: true, roles: ['ops'] });

  // ── 1. 开关关着 ──
  let r = await call('GET', '/jobs/meta');
  assert.equal(r.status, 200);
  assert.equal(r.j.switches.find, false);
  assert.equal(r.j.homeEntries.length, 7);
  assert.ok(r.j.trades.length >= 40);
  assert.equal(r.j.staffPreview, false);
  assert.ok(r.j.disclaimer.includes('不参与合同与付款'));
  assert.equal(typeof r.j.anyPros, 'boolean');
  assert.equal(r.j.recruitingText, '正在招募各工种的接活人，可先发布活儿等人联系');
  assert.equal(r.j.tradeRecruitingText, '这个工种正在招募接活人');
  assert.ok(r.j.trades.some((t: { open: boolean; hasPros: boolean }) => t.open && !t.hasPros), 'D11：没人的开放工种也给（hasPros=false）');
  ok('meta：开关关、7 个首页入口、资质表、统一声明；D11 冷启动字段（anyPros、招募中文字、没人的工种也给）');
  r = await call('GET', `/jobs/entry?t=${Date.now()}`);
  assert.equal(r.j.show, false);
  ok('D12：两个开关都关，网站菜单 / 首页入口不出（/jobs/entry show=false）');
  // ── 指令 10：家政保洁一组排第一；首页第 1 个入口是「家政保洁」（指向这一组），屋顶让出位置但仍在全部工种里；家电维修（BHGS 登记，B 类） ──
  {
    const m = (await call('GET', '/jobs/meta')).j;
    const gs = [...m.groups].sort((a: { order: number }, b: { order: number }) => a.order - b.order);
    assert.equal(gs[0].key, 'clean');
    assert.equal(gs[0].name, '家政保洁');
    assert.deepEqual([...gs[0].tradeKeys].sort(), ['appliance_repair', 'cleaning', 'gardening', 'junk']);
    assert.ok(!m.groups.some((g: { name: string }) => g.name === '清洁、清运与搬家'));
    assert.equal(m.trades.find((t: { key: string }) => t.key === 'movers').group, 'property');
    assert.equal(m.trades.find((t: { key: string }) => t.key === 'cleaning').scope, '日常保洁、退租清洁、装修后清洁');
    const ar = m.trades.find((t: { key: string }) => t.key === 'appliance_repair');
    assert.ok(ar && ar.name === '家电维修' && ar.group === 'clean' && ar.licType === 'B' && ar.open === true);
    assert.deepEqual(m.homeEntries[0], { label: '家政保洁', icon: 'sparkles', target: { type: 'group', key: 'clean' } });
    assert.deepEqual(m.homeEntries.map((e: { label: string }) => e.label), ['家政保洁', '水管', '电工', '空调暖气', '房屋维修', '装修', '设计']);
    assert.ok(m.trades.some((t: { key: string; open: boolean }) => t.key === 'roofing' && t.open), '屋顶仍在全部工种里');
    const wt = (await call('GET', '/workbench/jobs/trades', staff)).j;
    const ar2 = wt.trades.find((t: { key: string }) => t.key === 'appliance_repair');
    assert.ok(ar2.lookupUrl.startsWith('https://search.dca.ca.gov') && String(ar2.issuer).includes('BHGS') && String(ar2.note).includes('9800'));
    ok('指令 10：「家政保洁」一组排第一（清洁保洁、家电维修、垃圾清运、园艺养护），首页第 1 个入口；屋顶仍在全部工种；家电维修 = BHGS 登记（B 类，一键打开 DCA 查询）');
  }
  r = await call('GET', '/jobs/pros?trade=plumbing');
  assert.equal(r.status, 403);
  assert.equal(r.j.error.code, 'not_open');
  assert.equal(r.j.error.message, '这个功能还没开放');
  ok('开关关时普通人进找工人列表：这个功能还没开放');
  r = await call('GET', '/jobs/pros?trade=plumbing', staff);
  assert.equal(r.status, 200);
  r = await call('GET', '/jobs/meta', staff);
  assert.equal(r.j.staffPreview, true);
  assert.ok(r.j.staffPreviewText.includes('仅工作人员可见'));
  ok('工作人员开关关着也能用，带“仅工作人员可见”');

  // ── 指令 7 · D16：测试站手机验证走得通（只在 VERCEL_ENV=preview；正式站、本地不出现） ──
  {
    const { testFixedCodeOn, TEST_FIXED_CODE, TEST_FIXED_CODE_TEXT, TEST_PHONE_ONLY_TEXT } = await import('@/lib/crm/testFixedCode');
    const { isFictionalTestPhone, testPhoneAllowed } = await import('@/lib/crm/testPhones');
    // D22：名单 = 555-0100～555-0199 虚构号（任何区号）+ 测试库 test_fixed_code_phones
    assert.equal(isFictionalTestPhone('+19495550199'), true);
    assert.equal(isFictionalTestPhone('+12135550100'), true);
    assert.equal(isFictionalTestPhone('+19495550200'), false);
    assert.equal(isFictionalTestPhone('+19495551234'), false);
    assert.equal(isFictionalTestPhone('+16265550123'), true);
    {
      const extra = `+1626${String(Math.floor(1e6 + Math.random() * 8.9e6))}`;
      const { rows: old } = await pool.query<{ value: unknown }>(`SELECT value FROM crm_settings WHERE key = 'test_fixed_code_phones'`);
      assert.equal(await testPhoneAllowed(extra), false);
      await pool.query(`INSERT INTO crm_settings (key, value) VALUES ('test_fixed_code_phones', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [JSON.stringify([extra])]);
      assert.equal(await testPhoneAllowed(extra), true);
      if (old[0]) await pool.query(`UPDATE crm_settings SET value = $1 WHERE key = 'test_fixed_code_phones'`, [JSON.stringify(old[0].value)]);
      else await pool.query(`DELETE FROM crm_settings WHERE key = 'test_fixed_code_phones'`);
    }
    ok('D22：名单 = 555-01xx 虚构号（任何区号）+ 测试库 test_fixed_code_phones；名单外不认');
    const saved = process.env.VERCEL_ENV;
    for (const env of ['production', undefined, 'development']) {
      if (env === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = env;
      assert.equal(testFixedCodeOn(), false, `VERCEL_ENV=${env} 不能有固定验证码`);
    }
    process.env.VERCEL_ENV = 'preview';
    assert.equal(testFixedCodeOn(), true);
    if (saved === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = saved;
    assert.equal(TEST_FIXED_CODE, '246810');
    const preview = /vercel\.app/.test(BASE);
    r = await call('GET', '/meta');
    const vp = await call('GET', '/jobs/meta');
    if (!preview) {
      assert.equal(r.j.testFixedCode, undefined);
      assert.equal(vp.j.testFixedCode, undefined);
      ok('D16：不是测试站时没有固定验证码（testFixedCodeOn 只认 VERCEL_ENV=preview；接口不给 testFixedCode）');
    } else {
      assert.equal(r.j.testFixedCode, true);
      assert.equal(r.j.testFixedCodeText, TEST_FIXED_CODE_TEXT);
      assert.equal(r.j.smsAvailable, true);
      assert.equal(vp.j.testFixedCode, true);
      const fict = async () => {
        for (;;) {
          const p = `+1${200 + Math.floor(Math.random() * 700)}55501${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
          if (!(await phoneTaken(p)) && !(await pool.query(`SELECT 1 FROM contact_methods WHERE value = $1`, [p])).rows[0]) return p;
        }
      };
      // D22：名单外的号码在测试站发不出码、登不了
      const realish = `+1626${String(Math.floor(1e6 + Math.random() * 8.9e6))}`;
      testPhones.push(realish);
      r = await call('POST', '/auth/code/send', null, { channel: 'sms', target: realish });
      assert.equal(r.status, 400, JSON.stringify(r.j));
      assert.equal(r.j.error.code, 'test_phone_only');
      assert.equal(r.j.error.message, TEST_PHONE_ONLY_TEXT);
      r = await call('POST', '/auth/code/verify', null, { channel: 'sms', target: realish, code: '246810' });
      assert.notEqual(r.status, 200);
      r = await call('POST', '/me/contact', noPhone, { phone: realish });
      assert.equal(r.status, 200, JSON.stringify(r.j));
      r = await call('POST', '/me/phone/send', noPhone, {}, MP);
      assert.equal(r.j.error?.code, 'test_phone_only');
      r = await call('POST', '/me/phone/verify', noPhone, { code: '246810' }, MP);
      assert.equal(r.j.error?.code, 'test_phone_only');
      await pool.query(`DELETE FROM contact_methods WHERE contact_id = $1 AND kind = 'phone'`, [noPhone.id]);
      await pool.query(`UPDATE contacts SET phone_e164 = NULL, phone_verified_at = NULL WHERE id = $1`, [noPhone.id]);
      ok('D22：测试站名单外的号码发不出码、登不了（短信登录、验证手机都拦，提示“测试站只认测试号码”）');
      const ph = await fict();
      r = await call('POST', '/me/contact', noPhone, { phone: ph });
      assert.equal(r.status, 200, JSON.stringify(r.j));
      r = await call('GET', '/me/contact', noPhone, undefined, MP);
      assert.equal(r.j.contactInfo.phone.status, 'unconfirmed');
      assert.equal(r.j.contactInfo.phoneVerifyAvailable, true);
      assert.equal(r.j.contactInfo.testFixedCode, true);
      r = await call('POST', '/me/phone/send', noPhone, {}, MP);
      assert.equal(r.status, 200, JSON.stringify(r.j));
      assert.equal(r.j.testFixedCode, true);
      assert.equal(r.j.message, TEST_FIXED_CODE_TEXT);
      r = await call('POST', '/me/phone/verify', noPhone, { code: '123456' }, MP);
      assert.equal(r.status, 400);
      assert.ok(r.j.error.message.includes('246810'));
      r = await call('POST', '/me/phone/verify', noPhone, { code: '246810' }, MP);
      assert.equal(r.status, 200, JSON.stringify(r.j));
      r = await call('GET', '/me/contact', noPhone);
      assert.equal(r.j.contactInfo.phone.status, 'confirmed');
      const { rows: sends } = await pool.query(`SELECT 1 FROM phone_verify_sends WHERE contact_id = $1`, [noPhone.id]);
      assert.equal(sends.length, 0, '测试站不发短信、不记发送');
      // 网站手机号登录：同样固定 246810
      const ph2 = await fict();
      testPhones.push(ph, ph2);
      r = await call('POST', '/auth/code/send', null, { channel: 'sms', target: ph2 });
      assert.equal(r.status, 200, JSON.stringify(r.j));
      assert.equal(r.j.testFixedCode, true);
      r = await call('POST', '/auth/code/verify', null, { channel: 'sms', target: ph2, code: '246810', client: 'miniprogram' });
      assert.equal(r.status, 200, JSON.stringify(r.j));
      contacts.push(r.j.contactId);
      // 测完把这个人的手机号还原成“没有”（后面的测试要用没手机的人）
      await pool.query(`UPDATE contacts SET phone_e164 = NULL, phone_verified_at = NULL WHERE id = $1`, [noPhone.id]);
      await pool.query(`DELETE FROM contact_methods WHERE contact_id = $1 AND kind = 'phone'`, [noPhone.id]);
      ok('D16：测试站手机验证不发短信、验证码固定 246810（错的不行）；接口给 testFixedCode 让小程序显示那行字；网站手机号登录同样');
    }
  }

  // ── 2. 小程序：活儿一律 404 ──
  for (const [m, p] of [['GET', '/jobs/posts'], ['POST', '/jobs/posts'], ['GET', '/jobs/me/posts'], ['POST', '/jobs/upload']] as const) {
    r = await call(m, p, owner, m === 'POST' ? {} : undefined, MP);
    assert.equal(r.status, 404, `${m} ${p}`);
  }
  r = await call('GET', '/jobs/meta', owner, undefined, MP);
  assert.deepEqual(r.j.latest, []);
  assert.ok(!r.j.options.posterRoles.some((x: { key: string }) => x.key === 'crew'));
  ok('小程序版本头调活儿接口 404；meta 不给活儿、不给招工');

  // ── 3. 开关（只限管理员，记谁改的） ──
  r = await call('PATCH', '/workbench/jobs/switches', owner, { find: true });
  assert.equal(r.status, 403);
  r = await call('PATCH', '/workbench/jobs/switches', staff, { find: true, work: true });
  assert.equal(r.status, 200);
  assert.equal(r.j.switches.find, true);
  assert.ok(String(r.j.changes.find.updatedBy).includes('验收工-工作人员'));
  ok('开关：非工作人员不能改；改动记谁、什么时候');

  // ── 4. 登记接活 ──
  r = await call('POST', '/jobs/me/pro', proA, { role: 'company', name: '验收工-持牌公司', trades: ['handyman', 'painting'], cities: ['阿凯迪亚'] });
  assert.equal(r.status, 400);
  r = await call('POST', '/jobs/me/pro', proA, { agree: true, role: 'company', name: '验收工-持牌公司', trades: ['handyman', 'painting'], cities: ['阿凯迪亚'] });
  assert.equal(r.status, 400);
  assert.ok(r.j.error.message.includes('牌照号'));
  ok('登记：不同意规则不行；施工队没牌照号被拒');
  r = await call('GET', '/jobs/me/pro', proA);
  assert.equal(r.j.pro, null);
  assert.ok(r.j.prefill.phone);
  assert.equal(r.j.rules.length, 4);
  ok('我的接活：没登记时带出现有资料（已验证手机号）和规则');
  r = await call('POST', '/jobs/me/pro', proA, {
    agree: true, role: 'company', name: '验收工-持牌公司', trades: ['handyman', 'painting'], cities: ['阿凯迪亚', '圣盖博'], licenseNo: '1050000', years: 12, teamSize: 8
  });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.equal(r.j.pro.status, 'pending');
  assert.equal(r.j.autoCheck.state, 'queued');
  const proAId = r.j.pro.id as string;
  ok('施工队登记 → 核验中，CSLB 自动比对已排队');
  // 改资料要能回填：GET /jobs/me/pro 带回登记过的每一项（网站、小程序一样）
  for (const h of [{}, MP]) {
    r = await call('GET', '/jobs/me/pro', proA, undefined, h);
    const mp = r.j.pro;
    assert.equal(mp.name, '验收工-持牌公司');
    assert.deepEqual(mp.trades, ['handyman', 'painting']);
    assert.deepEqual(mp.cities, ['arcadia', 'san_gabriel']);
    assert.equal(mp.years, 12);
    assert.equal(mp.teamSize, 8, '团队人数要回填');
    assert.equal(mp.licenseNo, '1050000');
    for (const k of ['avatar', 'languages', 'availableNow', 'intro', 'photos', 'insuranceUrl', 'businessRegUrl', 'wechat']) assert.ok(k in mp, `GET /jobs/me/pro 缺 ${k}`);
  }
  ok('GET /jobs/me/pro 带回登记的每一项（名称、头像、工种、城市、年数、语言、现在有空、牌照号、介绍、照片、团队人数、保险、营业登记），小程序头也一样');
  r = await call('POST', '/jobs/me/pro', worker, { agree: true, role: 'worker', name: '验收工-工人', trades: ['painting', 'cleaning'], cities: ['阿凯迪亚'] });
  assert.equal(r.j.pro.status, 'verified');
  assert.equal(r.j.pro.needPay, false);
  assert.ok(!(r.j.pro.badges ?? []).some((b: { kind: string }) => b.kind === 'license'), 'Q33：工人没有牌照，不能出现「执照已核验」');
  ok('工人免费登记、不填牌照，登记即生效（Q33：没有「执照已核验」标记）');
  r = await call('POST', '/jobs/me/pro', designer, { agree: true, role: 'pro_service', name: '验收工-室内设计', trades: ['interior'], cities: ['阿凯迪亚'] });
  assert.equal(r.status, 400);
  assert.ok(r.j.error.message.includes('营业登记'));
  r = await call('POST', '/jobs/me/pro', designer, {
    agree: true, role: 'pro_service', name: '验收工-室内设计', trades: ['interior'], cities: ['阿凯迪亚'], businessRegUrl: 'https://example.com/biz.jpg', insuranceUrl: 'https://example.com/ins.jpg'
  });
  assert.equal(r.j.pro.status, 'pending');
  const designerId = r.j.pro.id as string;
  r = await call('GET', '/jobs/me/pro', designer, undefined, MP);
  assert.equal(r.j.pro.businessRegUrl, 'https://example.com/biz.jpg');
  assert.equal(r.j.pro.insuranceUrl, 'https://example.com/ins.jpg');
  ok('设计与专业服务：C 类工种要营业登记');
  r = await call('POST', '/jobs/me/pro', real, { agree: true, role: 'company', name: 'DEVJOBS-不是测试身份', trades: ['handyman'], cities: ['阿凯迪亚'], licenseNo: '999999' });
  const realProId = r.j.pro.id as string;

  // ── 5. 发布活儿 ──
  r = await call('POST', '/jobs/posts', noPhone, { posterRole: 'owner', trades: ['handyman'], city: '阿凯迪亚', description: '厨房水龙头漏水', timing: 'asap' });
  assert.equal(r.j.error?.code, 'need_phone');
  r = await call('POST', '/jobs/posts', owner, {
    posterRole: 'landlord', turnover: true, trades: ['cleaning', 'handyman', 'painting', 'gardening'], city: '阿凯迪亚',
    description: '租客月底搬走，要全屋清洁、补墙、刷漆、修剪院子。三房两卫。', timing: 'week', budget: '$2000-3000', propertyType: 'house'
  });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.equal(r.j.ids.length, 4);
  assert.ok(r.j.next.includes('24 小时'));
  const [pClean, pHandy, pPaint] = r.j.ids as string[];
  const { rows: t } = await pool.query<{ title: string; batch_id: string }>(`SELECT title, batch_id FROM jobs_posts WHERE id = ANY($1::uuid[]) ORDER BY title`, [r.j.ids]);
  assert.ok(t.every((x) => x.batch_id === t[0].batch_id));
  assert.ok(t.some((x) => x.title === '阿凯迪亚 · 房屋维修 · 租客月底搬走'));
  ok('退租整修按工种拆成 4 条（同一批次），标题“城市 · 工种 · 一句话”；没验证手机号不让发');
  r = await call('POST', '/jobs/posts', owner, { posterRole: 'owner', trades: ['lawyer'], city: '阿凯迪亚', description: '过户', timing: 'asap' });
  assert.equal(r.status, 400);
  ok('地产律师不接受发布活儿');

  r = await call('GET', '/jobs/posts?city=阿凯迪亚');
  assert.ok(r.j.items.some((x: { id: string }) => x.id === pHandy));
  r = await call('GET', `/jobs/posts/${pHandy}`);
  assert.equal(r.j.post.phone, undefined);
  assert.equal(r.j.canContact, false);
  assert.ok(!JSON.stringify(r.j).includes('+1626'));
  ok('活儿列表和详情公开，不含电话');

  // ── 6. 谁能看电话 ──
  r = await call('POST', `/jobs/posts/${pHandy}/contact`, proA);
  assert.equal(r.status, 403);
  assert.equal(r.j.error.code, 'not_eligible');
  assert.ok(r.j.error.message.includes('核验'));
  ok('未核验的人点联系：还在核验');
  r = await call('POST', `/jobs/posts/${pClean}/contact`, worker);
  assert.equal(r.status, 403);
  assert.ok(r.j.error.message.includes('工人可以看施工队招工人的活儿'));
  ok('工人点业主的活儿：一句人话原因');

  // 工作人员核验
  r = await call('GET', '/workbench/jobs/pros?status=pending', staff);
  const qA = r.j.items.find((x: { id: string }) => x.id === proAId);
  assert.ok(qA.officialUrl.includes('LicNum=1050000'));
  assert.ok(qA.checklist.length > 2);
  ok('核验队列：一键打开官方查询页 + 核验清单');
  r = await call('POST', `/workbench/jobs/pros/${proAId}/verify`, staff, { action: 'return' });
  assert.equal(r.status, 400);
  r = await call('POST', `/workbench/jobs/pros/${proAId}/verify`, staff, { action: 'approve', trades: ['handyman'] });
  assert.equal(r.j.pro.status, 'verified');
  r = await call('GET', '/jobs/meta', proA);
  assert.equal(r.j.me.pro.needPay, true);
  assert.equal(r.j.me.pro.listed, false);
  r = await call('POST', `/jobs/posts/${pHandy}/contact`, proA);
  assert.equal(r.status, 403);
  assert.ok(r.j.error.message.includes('缴费会员'));
  ok('核验通过但不是缴费会员：needPay、不上列表、不能看电话');

  r = await call('PATCH', '/workbench/jobs/switches', staff, { requirePaid: false });
  r = await call('GET', '/jobs/meta', proA);
  assert.equal(r.j.me.pro.listed, true);
  assert.ok(r.j.trades.find((x: { key: string }) => x.key === 'handyman').hasPros);
  r = await call('POST', `/jobs/posts/${pHandy}/contact`, proA);
  assert.equal(r.status, 200);
  assert.ok(String(r.j.phone).startsWith('+1626'));
  r = await call('POST', `/jobs/posts/${pPaint}/contact`, proA);
  assert.equal(r.status, 403);
  assert.ok(r.j.error.message.includes('油漆粉刷'));
  ok('关掉“要求缴费会员”后上列表、能看对口活儿电话；没核验的工种不能');
  r = await call('GET', '/jobs/me/posts', owner);
  const mine = r.j.items.find((x: { id: string }) => x.id === pHandy);
  assert.equal(mine.contacts.length, 1);
  assert.equal(mine.contacts[0].name, '验收工-持牌公司');
  ok('谁看过电话有记录，发布人在“我的活儿”里看得到');

  // 找工人列表
  r = await call('GET', '/jobs/pros?trade=handyman&city=圣盖博');
  const card = r.j.items.find((x: { id: string }) => x.id === proAId);
  assert.ok(card);
  assert.equal(card.licenseNo, '1050000');
  assert.ok(card.badges.some((b: { text: string }) => b.text.startsWith('执照已核验 ')));
  assert.ok(!r.j.items.some((x: { name: string }) => x.name === '验收工-工人'));
  r = await call('GET', '/jobs/pros?role=worker&trade=painting');
  assert.ok(r.j.items.some((x: { name: string }) => x.name === '验收工-工人'));
  // 指令 7 · D17：联系接活人不用登录、不用验证手机；每次点击都记（登录记档案，游客记 IP 哈希）
  r = await call('POST', `/jobs/pros/${proAId}/contact`);
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.ok(String(r.j.phone).startsWith('+1626'));
  const { rows: gc } = await pool.query<{ viewer_contact_id: string | null; ip_hash: string | null; client: string }>(
    `SELECT viewer_contact_id, ip_hash, client FROM jobs_pro_clicks WHERE pro_id = $1 ORDER BY created_at DESC LIMIT 1`, [proAId]
  );
  assert.equal(gc[0].viewer_contact_id, null);
  assert.equal(gc[0].client, 'web');
  if (BASE.startsWith('https://')) assert.ok(gc[0].ip_hash && /^[0-9a-f]{32}$/.test(gc[0].ip_hash), '游客记 IP 哈希（不存原始 IP）');
  r = await call('POST', `/jobs/pros/${proAId}/contact`, noPhone, undefined, MP);
  assert.equal(r.status, 200, '小程序头、没验证手机也能看');
  r = await call('POST', `/jobs/pros/${proAId}/contact`, owner);
  assert.ok(r.j.phone);
  const { rows: pv } = await pool.query(`SELECT 1 FROM jobs_contacts WHERE direction = 'pro' AND pro_id = $1 AND viewer_contact_id = $2`, [proAId, owner.id]);
  assert.ok(pv[0]);
  const { rows: cc } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM jobs_pro_clicks WHERE pro_id = $1 AND viewer_contact_id = ANY($2::uuid[])`, [proAId, [owner.id, noPhone.id]]);
  assert.equal(cc[0].n, 2);
  ok('D17：联系接活人游客、小程序（没验证手机）都能看电话；每次点击都记录（登录记档案、游客记 IP 哈希）');
  {
    const pr = await import('@/lib/jobs/pros');
    assert.deepEqual(pr.PRO_CONTACT_LIMITS, { hour: 20, day: 60 });
    const guest = { contactId: null, staff: false, staffName: null, mp: false, switches: { find: true, work: true, requirePaid: true } } as const;
    const ip = `test-${uniq}`;
    const lim = { hour: 2, day: 3 }; // 用小额度测同一套逻辑（正式额度 20 / 60）
    const { rows: ps } = await pool.query<{ id: string }>(`SELECT id FROM jobs_pros WHERE listed ORDER BY created_at LIMIT 4`);
    const ids = ps.map((x) => x.id);
    assert.ok(ids.length >= 3);
    await pr.contactPro(ids[0], guest as never, ip, lim);
    await pr.contactPro(ids[1], guest as never, ip, lim);
    const tooMany = (e: Error & { code?: string }) => e.code === 'too_many_attempts' && e.message === '查看太频繁了，请稍后再试，或加商会微信';
    await assert.rejects(pr.contactPro(ids[2], guest as never, ip, lim), tooMany);
    const { rows: lr } = await pool.query(`SELECT 1 FROM jobs_pro_clicks WHERE pro_id = $1 AND ip_hash = $2 AND limited`, [ids[2], ip]);
    assert.ok(lr[0], '被挡的那次也记一行（limited）');
    assert.ok('phone' in (await pr.contactPro(ids[0], guest as never, ip, lim)), '看过的人再点不算新的');
    await pool.query(`UPDATE jobs_pro_clicks SET created_at = now() - interval '2 hours' WHERE ip_hash = $1`, [ip]);
    assert.ok('phone' in (await pr.contactPro(ids[2], guest as never, ip, lim)), '过了 1 小时，小时额度恢复');
    await assert.rejects(pr.contactPro(ids[3] ?? ids[2], guest as never, `${ip}-x`, { hour: 0, day: 0 }), tooMany);
    if (ids[3]) {
      await assert.rejects(pr.contactPro(ids[3], guest as never, ip, lim), tooMany); // 24 小时 3 个用完
    }
    // 登录的人按身份算，不按 IP 算
    const who = { ...guest, contactId: owner.id };
    assert.ok('phone' in (await pr.contactPro(ids[1], who as never, ip, lim)));
    ok('D17：频率限制——同一身份（游客按同一 IP）1 小时 / 24 小时不同接活人个数有上限，超了一句人话；看过的再点不算；登录的按身份不按 IP');
    await pool.query(`DELETE FROM jobs_pro_clicks WHERE ip_hash LIKE $1`, [`${ip}%`]);
  }

  // 施工队招工
  r = await call('POST', '/jobs/posts', crewBoss, { posterRole: 'crew', trades: ['painting'], city: '阿凯迪亚', description: '外墙油漆', timing: 'week', crewHeadcount: 3, crewDuration: '两周', crewPay: '$25/小时' });
  const pCrew = r.j.ids[0] as string;
  r = await call('POST', `/jobs/posts/${pCrew}/contact`, worker);
  assert.equal(r.status, 200);
  r = await call('POST', `/jobs/posts/${pCrew}/contact`, proA);
  assert.equal(r.status, 403);
  ok('施工队招工：工人能联系，公司不能');

  // ── D10：小程序「通知给我的活儿」 ──
  r = await call('GET', `/jobs/entry?t=${Date.now()}`);
  assert.equal(r.j.show, true);
  const { rows: sec } = await pool.query<{ id: string; sec_status: string; sec_note: string | null; sec_checked_at: Date | null }>(`SELECT id, sec_status, sec_note, sec_checked_at FROM jobs_posts WHERE id = ANY($1::uuid[])`, [[pHandy, pPaint, pCrew]]);
  assert.ok(sec.every((x) => x.sec_status && x.sec_checked_at !== null), JSON.stringify(sec));
  const handySec = sec.find((x) => x.id === pHandy)!;
  r = await call('GET', '/jobs/me/matched', proA, undefined, MP);
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.equal(r.j.eligible, true);
  if (handySec.sec_status !== 'pass') {
    assert.equal(handySec.sec_status, 'unchecked');
    assert.ok(['no_wx_config', 'no_openid', 'error'].includes(String(handySec.sec_note)));
    assert.ok(!r.j.items.some((x: { id: string }) => x.id === pHandy), '未检测的不进 matched');
    ok(`D10：情况说明发布时过内容安全；这里记“未检测”（${handySec.sec_note}），不进 matched`);
  }
  // 模拟内容安全已通过（测试站没有微信密钥）
  await pool.query(`UPDATE jobs_posts SET sec_status = 'pass', sec_note = 'test' WHERE id = ANY($1::uuid[])`, [[pHandy, pPaint, pCrew]]);
  r = await call('GET', '/jobs/me/matched', proA, undefined, MP);
  const mh = r.j.items.find((x: { id: string }) => x.id === pHandy);
  assert.ok(mh, 'D10：已核验工种 + 服务城市对口的业主活儿要出现');
  assert.deepEqual(Object.keys(mh).sort(), ['city', 'contacted', 'createdAt', 'description', 'id', 'timing', 'timingLabel', 'trade', 'tradeName']);
  assert.equal(mh.contacted, true);
  assert.equal(mh.city, '阿凯迪亚');
  assert.ok(!JSON.stringify(r.j).includes('$2000'), '不给预算');
  assert.ok(!r.j.items.some((x: { id: string }) => x.id === pPaint), '没核验的工种不给');
  assert.ok(!r.j.items.some((x: { id: string }) => x.id === pCrew), '招工那一类不给');
  ok('D10：matched 只给对口的业主活儿；字段只有 id/城市/工种/情况说明/什么时候要/发布时间/已联系过；不给预算、照片、招工');
  r = await call('POST', `/jobs/posts/${pHandy}/contact`, proA, undefined, MP);
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.ok(String(r.j.phone).startsWith('+1626'));
  r = await call('POST', `/jobs/posts/${pPaint}/contact`, proA, undefined, MP);
  assert.equal(r.status, 404);
  r = await call('POST', `/jobs/posts/${pCrew}/contact`, worker, undefined, MP);
  assert.equal(r.status, 404);
  r = await call('GET', `/jobs/posts/${pHandy}`, proA, undefined, MP);
  assert.equal(r.status, 404);
  ok('D10：小程序联系发布人只限 matched 里的活儿（其余 404）；活儿详情等其它 posts 接口小程序照旧 404');
  r = await call('GET', '/jobs/me/matched', worker, undefined, MP);
  assert.equal(r.j.eligible, false);
  assert.deepEqual(r.j.items, []);
  r = await call('GET', '/jobs/me/matched', owner, undefined, MP);
  assert.equal(r.j.eligible, false);
  r = await call('GET', '/jobs/me/matched', designer, undefined, MP);
  assert.equal(r.j.eligible, false);
  assert.ok(r.j.reason.includes('核验'));
  r = await call('GET', '/jobs/me/matched', null, undefined, MP);
  assert.equal(r.status, 401);
  await call('PATCH', '/workbench/jobs/switches', staff, { requirePaid: true });
  r = await call('GET', '/jobs/me/matched', proA, undefined, MP);
  assert.equal(r.j.eligible, false);
  assert.equal(r.j.needPay, true);
  r = await call('POST', `/jobs/posts/${pHandy}/contact`, proA, undefined, MP);
  assert.equal(r.status, 404);
  await call('PATCH', '/workbench/jobs/switches', staff, { requirePaid: false });
  await pool.query(`UPDATE jobs_posts SET sec_status = 'review' WHERE id = $1`, [pHandy]);
  r = await call('GET', '/jobs/me/matched', proA, undefined, MP);
  assert.ok(!r.j.items.some((x: { id: string }) => x.id === pHandy), '没过（review/risky）的不进 matched');
  await pool.query(`UPDATE jobs_posts SET sec_status = 'pass' WHERE id = $1`, [pHandy]);
  ok('D10：工人、没登记、核验中、未缴费（开关开）一律不给；内容安全没过的不给');

  // ── 指令 9 · D28：接活儿收费方式（全部免费 / 免费额度 / 必须是会员）+ 免费联系次数 + 非会员免费发活儿条数 ──
  {
    r = await call('PATCH', '/workbench/jobs/switches', owner, { feeMode: 'free_quota' });
    assert.equal(r.status, 403);
    r = await call('PATCH', '/workbench/jobs/switches', staff, { feeMode: 'nope' });
    assert.equal(r.status, 400);
    r = await call('PATCH', '/workbench/jobs/switches', staff, { feeMode: 'free_quota', freeContacts: 2, freePosts: null });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.switches.feeMode, 'free_quota');
    assert.equal(r.j.switches.requirePaid, false);
    assert.equal(r.j.switches.freeContacts, 2);
    assert.equal(r.j.switches.freePosts, null);
    const lg = r.j.log.find((x: { key: string }) => x.key === 'jobs_work_fee_mode');
    assert.ok(lg && lg.actor.includes('验收工-工作人员') && lg.before === 'all_free' && lg.after === 'free_quota', '操作记录：谁、改前改后');
    ok('D28：收费设置只有管理员能改、值不对给人话、立即生效、留操作记录（谁、何时、改前改后）');
    r = await call('GET', '/jobs/meta', proA);
    assert.equal(r.j.switches.feeMode, 'free_quota');
    assert.equal(r.j.me.pro.listed, true, '免费额度：非会员核验通过即上列表');
    assert.equal(r.j.me.pro.needPay, false);
    assert.equal(r.j.me.pro.freeLeft, 2);
    assert.ok(r.j.openTradeCount > 30 && r.j.allTradesText === `全部 ${r.j.openTradeCount} 项 ›`);
    assert.ok(r.j.groups.every((g: { tradeKeys: string[] }) => Array.isArray(g.tradeKeys)));
    // 再发三条同工种同城的活儿
    r = await call('POST', '/jobs/posts', owner, { posterRole: 'owner', trades: ['handyman'], cityKey: 'arcadia', city: '阿凯迪亚', description: '验收工-额度 1', timing: 'asap' });
    const q1 = r.j.ids[0];
    r = await call('POST', '/jobs/posts', owner, { posterRole: 'owner', trades: ['handyman'], city: '阿凯迪亚', description: '验收工-额度 2', timing: 'asap' });
    const q2 = r.j.ids[0];
    r = await call('POST', '/jobs/posts', owner, { posterRole: 'owner', trades: ['handyman'], city: '阿凯迪亚', description: '验收工-额度 3', timing: 'asap' });
    const q3 = r.j.ids[0];
    assert.ok(q1 && q2 && q3);
    await pool.query(`UPDATE jobs_posts SET sec_status = 'pass' WHERE id = ANY($1::uuid[])`, [[q1, q2, q3]]);
    // pHandy 之前（全部免费时）看过：再看不扣
    r = await call('POST', `/jobs/posts/${pHandy}/contact`, proA);
    assert.equal(r.status, 200);
    assert.equal(r.j.freeLeft, 2);
    r = await call('POST', `/jobs/posts/${q1}/contact`, proA);
    assert.equal(r.status, 200);
    assert.equal(r.j.freeLeft, 1);
    assert.equal(r.j.freeLeftText, '还可以免费联系 1 位');
    r = await call('POST', `/jobs/posts/${q1}/contact`, proA);
    assert.equal(r.j.freeLeft, 1, '同一条重复看不扣');
    r = await call('GET', '/jobs/me/pro', proA);
    assert.equal(r.j.freeLeft, 1);
    assert.equal(r.j.pro.freeLeft, 1);
    r = await call('GET', '/jobs/me/matched', proA, undefined, MP);
    assert.equal(r.j.freeLeft, 1);
    assert.ok(!JSON.stringify(r.j).match(/\$|￥|美元/), '小程序返回里不出现金额');
    r = await call('POST', `/jobs/posts/${q2}/contact`, proA, undefined, MP);
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.freeLeft, 0);
    r = await call('POST', `/jobs/posts/${q3}/contact`, proA);
    assert.equal(r.status, 403);
    assert.equal(r.j.error.code, 'quota_used_up');
    assert.equal(r.j.error.message, '免费次数用完了，成为商会会员后可以继续');
    r = await call('GET', `/jobs/posts/${q3}`, proA);
    assert.equal(r.j.canContact, false);
    assert.equal(r.j.reasonCode, 'quota_used_up');
    assert.equal(r.j.needPay, true);
    r = await call('POST', `/jobs/posts/${q1}/contact`, proA);
    assert.equal(r.status, 200, '用完后，看过的那几条照样能看');
    r = await call('GET', '/workbench/jobs/stats', staff);
    assert.ok(r.j.freeQuota.freeUsedPeople >= 1 && r.j.freeQuota.usedUpPeople >= 1);
    ok('D28 免费额度：每看一条新活儿扣一次、重复看不扣、用完 quota_used_up + 人话；/me/pro、matched、详情都给 freeLeft；统计有人数');
    // 必须是会员：非会员不上列表、不能看
    await call('PATCH', '/workbench/jobs/switches', staff, { feeMode: 'members_only' });
    r = await call('GET', '/jobs/meta', proA);
    assert.equal(r.j.me.pro.listed, false);
    assert.equal(r.j.me.pro.freeLeft, null);
    r = await call('POST', `/jobs/posts/${q3}/contact`, proA);
    assert.equal(r.j.error.code, 'not_eligible');
    // 全部免费：不扣、不限
    await call('PATCH', '/workbench/jobs/switches', staff, { feeMode: 'all_free' });
    r = await call('POST', `/jobs/posts/${q3}/contact`, proA);
    assert.equal(r.status, 200);
    assert.equal(r.j.freeLeft, null);
    const { rows: fu } = await pool.query<{ free_used: boolean }>(`SELECT free_used FROM jobs_contacts WHERE post_id = $1 AND viewer_contact_id = $2`, [q3, proA.id]);
    assert.equal(fu[0].free_used, false, '全部免费时不扣');
    ok('D28：必须是会员 → 非会员不上列表、不能看；全部免费 → 不扣不限');
    // 会员一律不限（用完后入会也计入统计）
    await call('PATCH', '/workbench/jobs/switches', staff, { feeMode: 'free_quota' });
    await pool.query(
      `INSERT INTO applications (application_type, application_status, payment_status, email, contact_id, selected_tier_slug, membership_start_date, membership_end_date, payment_plan, notes)
       VALUES ('membership', 'approved', 'paid', $1, $2, 'member', current_date, current_date + 365, 'offline', '验收工-测试会籍（jobs-api-tests，测完删）')`,
      [`jobs-${uniq}-member@example.com`, proA.id]
    );
    r = await call('POST', `/jobs/posts/${q2}/contact`, proA);
    r = await call('GET', '/jobs/meta', proA);
    assert.equal(r.j.me.pro.freeLeft, null, '会员不限');
    r = await call('POST', `/jobs/posts/${q3}/contact`, proA);
    assert.equal(r.status, 200);
    r = await call('GET', '/workbench/jobs/stats', staff);
    assert.ok(r.j.freeQuota.joinedAfterUsedUp >= 1);
    ok('D28：会员一律不限；统计“用完后入会的人数”');
    // 非会员免费发活儿条数（owner 不是会员，已经发过好几次）
    r = await call('PATCH', '/workbench/jobs/switches', staff, { freePosts: 'abc' });
    assert.equal(r.status, 400);
    await call('PATCH', '/workbench/jobs/switches', staff, { freePosts: 1 });
    r = await call('POST', '/jobs/posts', owner, { posterRole: 'owner', trades: ['handyman'], city: '阿凯迪亚', description: '验收工-超了', timing: 'asap' });
    assert.equal(r.status, 403);
    assert.equal(r.j.error.code, 'post_quota_used_up');
    assert.ok(r.j.error.message.includes('成为商会会员后可以继续'));
    r = await call('POST', '/jobs/posts', proA, { posterRole: 'owner', trades: ['handyman'], city: '阿凯迪亚', description: '验收工-会员发', timing: 'asap' });
    assert.equal(r.status, 200, '会员发活儿不限');
    await pool.query(`DELETE FROM jobs_posts WHERE id = ANY($1::uuid[])`, [r.j.ids]);
    r = await call('PATCH', '/workbench/jobs/switches', staff, { freePosts: '' });
    assert.equal(r.j.switches.freePosts, null);
    r = await call('POST', '/jobs/posts', owner, { posterRole: 'owner', trades: ['handyman'], city: '阿凯迪亚', description: '验收工-不限了', timing: 'asap' });
    assert.equal(r.status, 200);
    ok('D28：非会员发活儿限条数时超了给人话；会员不限；留空 = 不限');
    // 恢复成后面测试要的状态：proA 不是会员、全部免费
    await pool.query(`DELETE FROM applications WHERE contact_id = $1`, [proA.id]);
    await call('PATCH', '/workbench/jobs/switches', staff, { feeMode: 'all_free' });
    await pool.query(`DELETE FROM jobs_posts WHERE id = ANY($1::uuid[])`, [[q1, q2, q3]]);
  }

  // ── 指令 7 · D19：网站发的活儿（发布人没有小程序 openid）用查看的接活人身份补检 ──
  {
    const openid = `dev-openid-jobs-${uniq}`;
    await pool.query(`UPDATE contacts SET wechat_openid = $2 WHERE id = $1`, [proA.id, openid]);
    await pool.query(`UPDATE jobs_posts SET sec_status = 'unchecked', sec_note = 'no_openid', sec_checked_at = now() WHERE id = $1`, [pHandy]);
    r = await call('GET', '/jobs/me/matched', proA, undefined, MP);
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.ok(!r.j.items.some((x: { id: string }) => x.id === pHandy), '补检没结果（没配微信密钥）的不显示');
    const { rows: s1 } = await pool.query<{ sec_status: string; sec_note: string }>(`SELECT sec_status, sec_note FROM jobs_posts WHERE id = $1`, [pHandy]);
    assert.deepEqual(s1[0], { sec_status: 'unchecked', sec_note: 'no_openid' }, '没配微信密钥（no_wx_config）时照旧，不记、下次再试');
    const { recheckForViewer } = await import('@/lib/jobs/posts');
    const { rows: pg } = await pool.query<{ trades: string[]; cities: string[] }>(`SELECT verified_trades AS trades, cities FROM jobs_pros WHERE id = $1`, [proAId]);
    const seen: string[] = [];
    const stub = async (text: string, oid: string | null) => { seen.push(`${oid}|${text.slice(0, 4)}`); return { status: 'pass' as const, note: null }; };
    const n1 = await recheckForViewer(pool, proA.id, { proId: proAId, ...pg[0] }, stub);
    assert.ok(n1 >= 1);
    assert.ok(seen.every((x) => x.startsWith(`${openid}|`)), '用查看的接活人的 openid');
    const { rows: s2 } = await pool.query<{ sec_status: string; sec_note: string; sec_checked_at: Date | null }>(`SELECT sec_status, sec_note, sec_checked_at FROM jobs_posts WHERE id = $1`, [pHandy]);
    assert.equal(s2[0].sec_status, 'pass');
    assert.equal(s2[0].sec_note, `viewer:${proAId}`);
    assert.ok(s2[0].sec_checked_at);
    seen.length = 0;
    assert.equal(await recheckForViewer(pool, proA.id, { proId: proAId, ...pg[0] }, stub), 0);
    assert.equal(seen.length, 0, '检一次就记住，不重复检');
    r = await call('GET', '/jobs/me/matched', proA, undefined, MP);
    assert.ok(r.j.items.some((x: { id: string }) => x.id === pHandy), '补检通过后出现');
    // 没过的（risky）不显示
    await pool.query(`UPDATE jobs_posts SET sec_status = 'unchecked', sec_note = 'no_openid' WHERE id = $1`, [pHandy]);
    await recheckForViewer(pool, proA.id, { proId: proAId, ...pg[0] }, async () => ({ status: 'risky' as const, note: null }));
    r = await call('GET', '/jobs/me/matched', proA, undefined, MP);
    assert.ok(!r.j.items.some((x: { id: string }) => x.id === pHandy));
    await pool.query(`UPDATE jobs_posts SET sec_status = 'pass', sec_note = 'test' WHERE id = $1`, [pHandy]);
    await pool.query(`UPDATE contacts SET wechat_openid = NULL WHERE id = $1`, [proA.id]);
    ok('D19：发布人没有 openid 的活儿，接活人在小程序打开时用他的 openid 补检，记 viewer:<pro id>，检一次就记住；没过的不显示；没配微信密钥时不记');
  }

  // ── 7. 通知与保险 ──
  await pool.query(`UPDATE jobs_pros SET status = 'verified', verified_trades = '{handyman}', verified_at = now() WHERE id = $1`, [realProId]);
  await pool.query(`UPDATE jobs_pros SET listed = true WHERE id = $1`, [realProId]);
  r = await call('POST', '/jobs/posts', owner, { posterRole: 'owner', trades: ['handyman'], city: '阿凯迪亚', description: '门关不上', timing: 'asap' });
  const pDoor = r.j.ids[0] as string;
  const { rows: ns } = await pool.query<{ pro_id: string; status: string; detail: string | null }>(`SELECT pro_id, status, detail FROM jobs_notifications WHERE post_id = $1 AND kind = 'dispatch'`, [pDoor]);
  const nA = ns.find((x) => x.pro_id === proAId);
  const nR = ns.find((x) => x.pro_id === realProId);
  assert.ok(nA && nA.status !== 'blocked');
  assert.ok(nR && nR.status === 'blocked' && nR.detail === 'not_test_identity');
  ok('发布即通知对口工种 + 城市；不是测试身份的人一律拦住（blocked）');
  await pool.query(`UPDATE jobs_posts SET notified_at = now() - interval '25 hours', first_contact_at = NULL WHERE id = $1`, [pDoor]);
  // 定时任务里的 CSLB 比对会下载官方总表（几十 MB）：这里不让它跑，CSLB 判定在后面用假的总表单独测
  await pool.query(`UPDATE jobs_pros SET license_state = NULL WHERE contact_id = ANY($1::uuid[])`, [contacts]);
  let c = await cron('dispatch');
  assert.equal(c.status, 200, JSON.stringify(c.j));
  const { rows: ex } = await pool.query(`SELECT 1 FROM ops_exceptions WHERE dedupe_key = $1`, [`jobs_no_contact:${pDoor}`]);
  assert.ok(ex[0]);
  const { rows: rd } = await pool.query<{ notify_round: number }>(`SELECT notify_round FROM jobs_posts WHERE id = $1`, [pDoor]);
  assert.equal(rd[0].notify_round, 2);
  ok('24 小时没人联系：发第二批，提醒工作人员（待跟进）');

  // 到期、续期
  await pool.query(`UPDATE jobs_posts SET expires_at = now() + interval '1 day' WHERE id = $1`, [pDoor]);
  await pool.query(`UPDATE jobs_posts SET expires_at = now() - interval '1 minute' WHERE id = $1`, [pClean]);
  await pool.query(`UPDATE jobs_posts SET created_at = now() - interval '7 days 1 hour' WHERE id = $1`, [pHandy]);
  c = await cron('daily');
  assert.equal(c.status, 200, JSON.stringify(c.j));
  const { rows: st } = await pool.query<{ id: string; status: string; close_reason: string | null; renew_reminded_at: Date | null; renew_token: string }>(
    `SELECT id, status, close_reason, renew_reminded_at, renew_token FROM jobs_posts WHERE id = ANY($1::uuid[])`, [[pDoor, pClean]]
  );
  const sClean = st.find((x) => x.id === pClean)!;
  assert.equal(sClean.status, 'closed');
  assert.equal(sClean.close_reason, 'expired');
  assert.ok(st.find((x) => x.id === pDoor)!.renew_reminded_at);
  ok('14 天到期自动关闭；第 12 天发续期提醒');
  r = await call('PATCH', `/jobs/posts/${pClean}`, null, { renew: true, token: 'x'.repeat(32) });
  assert.equal(r.status, 401);
  r = await call('PATCH', `/jobs/posts/${pClean}`, null, { renew: true, token: sClean.renew_token });
  assert.equal(r.status, 200);
  assert.equal(r.j.post.status, 'open');
  ok('一键续期链接（不用登录，带签名），续期后重新找人中');

  // 第 7 天回访
  const { rows: fu } = await pool.query<{ token: string; side: string }>(`SELECT token, side FROM jobs_followups WHERE post_id = $1`, [pHandy]);
  assert.equal(fu.length, 2);
  r = await call('GET', `/jobs/followup/${fu[0].token}`);
  assert.equal(r.j.followup.questions.length, 3);
  r = await call('POST', `/jobs/followup/${fu[0].token}`, null, { reached: true, deal: true, satisfied: true });
  assert.equal(r.status, 200);
  ok('第 7 天回访发布人和联系过的人，一键回答');

  // 改状态
  r = await call('PATCH', `/jobs/posts/${pHandy}`, proA, { status: 'found' });
  assert.equal(r.status, 403);
  r = await call('PATCH', `/jobs/posts/${pHandy}`, owner, { status: 'found', description: '门锁坏了，要换锁芯' });
  assert.equal(r.j.post.status, 'found');
  assert.ok(r.j.post.title.includes('门锁坏了'));
  ok('只有发布人能改；改描述标题跟着变');

  // 投诉
  r = await call('POST', '/jobs/report', owner, { targetType: 'pro', targetId: proAId, reason: '验收工-测试投诉' });
  assert.equal(r.status, 200);
  r = await call('GET', '/workbench/jobs/reports?status=open', staff);
  assert.ok(r.j.items.some((x: { targetId: string }) => x.targetId === proAId));
  ok('反馈 / 投诉直达工作人员');

  // 工作人员：活儿、统计
  r = await call('GET', '/workbench/jobs/posts', staff, undefined, MP);
  const it = r.j.items.find((x: { id: string }) => x.id === pHandy);
  assert.deepEqual(Object.keys(it).sort(), ['contactCount', 'id', 'note', 'status', 'statusLabel', 'title']);
  r = await call('POST', `/workbench/jobs/posts/${pCrew}`, staff, { action: 'remove', note: '验收工-下架' });
  assert.equal(r.j.post.status, 'removed');
  r = await call('GET', `/jobs/posts/${pCrew}`, worker);
  assert.equal(r.status, 404);
  await call('POST', '/track', owner, { client: 'web', items: [{ name: 'jobs_trade', target: 'handyman' }] });
  r = await call('GET', '/workbench/jobs/stats', staff);
  const sh = r.j.trades.find((x: { key: string }) => x.key === 'handyman');
  assert.ok(sh.clicks >= 1 && sh.posts >= 2 && sh.contacts >= 1);
  ok('工作人员：活儿列表（小程序不给金额）、下架、统计');

  // 城市表：meta 按地区给 key；记录存 key；尔湾单独在橙县；后台增删改排序；用过的删除 = 停用
  r = await call('GET', '/jobs/meta');
  const oc = r.j.cities.find((g: { region: string }) => g.region === '橙县');
  assert.ok(oc.items.some((c: { key: string; name: string }) => c.key === 'irvine' && c.name === '尔湾'));
  const { rows: pk } = await pool.query<{ cities: string[] }>(`SELECT cities FROM jobs_pros WHERE id = $1`, [proAId]);
  assert.deepEqual(pk[0].cities, ['arcadia', 'san_gabriel']);
  r = await call('POST', '/jobs/posts', owner, { posterRole: 'owner', trades: ['handyman'], city: 'Fullerton 随便写', description: '验收工-城市', timing: 'asap' });
  assert.equal(r.status, 400);
  r = await call('POST', '/workbench/jobs/cities', staff, { name: '验收工-新城', region: '橙县' });
  const newCity = r.j.city.key as string;
  r = await call('POST', '/jobs/posts', owner, { posterRole: 'owner', trades: ['handyman'], cityKey: newCity, description: '验收工-新城的活儿', timing: 'asap' });
  const pNew = r.j.ids[0] as string;
  r = await call('POST', '/workbench/jobs/cities', staff, { key: newCity, name: '验收工-改名城', region: '橙县' });
  r = await call('GET', `/jobs/posts?city=${newCity}`);
  assert.equal(r.j.items.find((x: { id: string }) => x.id === pNew)?.city, '验收工-改名城');
  r = await call('DELETE', `/workbench/jobs/cities/${newCity}`, staff);
  assert.equal(r.j.disabled, true);
  r = await call('GET', '/jobs/meta');
  assert.ok(!JSON.stringify(r.j.cities).includes(newCity));
  r = await call('GET', `/jobs/posts?city=${newCity}`);
  assert.ok(r.j.items.some((x: { id: string }) => x.id === pNew));
  r = await call('POST', '/jobs/posts', owner, { posterRole: 'owner', trades: ['handyman'], cityKey: newCity, description: '验收工-停用城', timing: 'asap' });
  assert.equal(r.status, 400);
  r = await call('POST', '/workbench/jobs/cities', staff, { name: '验收工-空城', region: '橙县' });
  const emptyCity = r.j.city.key as string;
  r = await call('GET', '/workbench/jobs/cities', staff);
  const ocAdmin = r.j.regions.find((g: { region: string }) => g.region === '橙县');
  const keys = ocAdmin.items.map((c: { key: string }) => c.key);
  r = await call('PUT', '/workbench/jobs/cities/order', staff, { regions: r.j.regions.map((g: { region: string; items: { key: string }[] }) => ({ region: g.region, keys: g.region === '橙县' ? [emptyCity, ...keys.filter((k: string) => k !== emptyCity)] : g.items.map((c) => c.key) })) });
  assert.equal(r.j.regions.find((g: { region: string }) => g.region === '橙县').items[0].key, emptyCity);
  r = await call('DELETE', `/workbench/jobs/cities/${emptyCity}`, staff);
  assert.equal(r.j.deleted, true);
  r = await call('GET', '/workbench/jobs/cities', staff);
  await call('PUT', '/workbench/jobs/cities/order', staff, { regions: r.j.regions.map((g: { region: string; items: { key: string }[] }) => ({ region: g.region, keys: g.region === '橙县' ? keys.filter((k: string) => k !== emptyCity) : g.items.map((c) => c.key) })) });
  await pool.query(`DELETE FROM jobs_posts WHERE id = $1`, [pNew]);
  await pool.query(`DELETE FROM jobs_cities WHERE key = ANY($1)`, [[newCity, emptyCity]]);
  ok('城市表：meta 按地区给 key（尔湾在橙县）；记录存 key、改名历史跟着变；不在表里的城市不让发；用过的删除 = 停用、没用过的真删；排序');

  // 邀请：默认演练，不发
  r = await call('POST', '/workbench/jobs/invite', opsStaff, { contactIds: [real.id, worker.id] });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.equal(r.j.dryRun, true);
  assert.equal(r.j.wouldSend, 2);
  assert.equal(r.j.sent + r.j.blocked + r.j.failed, 0);
  const { rows: inv } = await pool.query<{ status: string }>(`SELECT status FROM jobs_notifications WHERE kind = 'invite' AND contact_id = ANY($1::uuid[])`, [[real.id, worker.id]]);
  assert.deepEqual(inv.map((x) => x.status), ['dry_run', 'dry_run']);
  r = await call('POST', '/workbench/jobs/invite', opsStaff, { contactIds: [real.id], dryRun: false });
  assert.equal(r.status, 403);
  r = await call('POST', '/workbench/jobs/invite', staff, { contactIds: [real.id, worker.id], dryRun: false });
  assert.equal(r.j.dryRun, false);
  const { rows: inv2 } = await pool.query<{ contact_id: string; status: string; detail: string | null }>(
    `SELECT contact_id, status, detail FROM jobs_notifications WHERE kind = 'invite' AND status <> 'dry_run' AND contact_id = ANY($1::uuid[])`, [[real.id, worker.id]]
  );
  assert.equal(inv2.find((x) => x.contact_id === real.id)?.status, 'blocked');
  assert.notEqual(inv2.find((x) => x.contact_id === worker.id)?.status, 'blocked');
  r = await call('GET', '/workbench/jobs/invite', staff);
  ok('邀请：不传 dryRun:false 只演练（记 dry_run、不发）；真发只限管理员；测试站不是测试身份的人一律拦住');

  // ── 8. 执照过期 / 被停：自动下架 ──
  const { runVerification, ingestCslb, cslbNumbers } = await import('@/lib/jobs/verify');
  const csv = [
    'LicenseNo,LastUpdate,BusinessName,BUS-NAME-2,FullBusinessName,MailingAddress,City,State,County,ZIPCode,country,BusinessPhone,BusinessType,IssueDate,ReissueDate,ExpirationDate,InactivationDate,ReactivationDate,PendingSuspension,PendingClassRemoval,PendingClassReplace,PrimaryStatus,SecondaryStatus,Classifications(s),AsbestosReg,WorkersCompCoverageType,WCInsuranceCompany,WCPolicyNumber,WCEffectiveDate,WCExpirationDate,WCCancellationDate,WCSuspendDate,CBSuretyCompany,CBNumber,CBEffectiveDate,CBCancellationDate,CBAmount',
    '1050000,11/01/2026,TEST CO,,,1 MAIN,ARCADIA,CA,LA,91006,,(626) 000 0000,Corporation,01/01/2020,,01/31/2026,,,,,,CLEAR,,B| C33,,Workers\' Compensation Insurance,SCIF,1,01/01/2026,01/01/2027,,,ACME SURETY,1,01/01/2026,,25000'
  ].join('\n');
  await pool.query(`UPDATE jobs_pros SET license_state = jsonb_build_object('state','queued') WHERE id = $1`, [proAId]);
  // D20：服务器自己不再下载总表——定时任务只数排队的
  const vq = await runVerification(new Date('2026-11-24T20:00:00Z'), { onlyQueued: true });
  assert.ok(Number(vq.cslbQueued) >= 1);
  assert.equal(vq.cslb, undefined);
  assert.ok((await cslbNumbers('queued')).includes('1050000'));
  const [hdr, ...rowsCsv] = csv.split('\n');
  // 总表没下完整（行数太少）：整批不认，谁都不动
  await assert.rejects(ingestCslb({ mode: 'queued', header: hdr, lines: rowsCsv, scanned: 10 }), /没下载完整/);
  const { rows: still } = await pool.query<{ status: string }>(`SELECT status FROM jobs_pros WHERE id = $1`, [proAId]);
  assert.equal(still[0].status, 'verified');
  if (process.env.CRON_DIRECT !== '1' && CRON) {
    const ep = `${BASE}/api/cron/jobs/cslb-ingest`;
    let h = await fetch(`${ep}?mode=queued`);
    assert.equal(h.status, 401);
    h = await fetch(`${ep}?mode=queued`, { headers: { Authorization: `Bearer ${CRON}` } });
    const hj = (await h.json()) as { numbers: string[] };
    assert.ok(hj.numbers.includes('1050000'), 'runner 先问要查哪些牌照号（只有号码）');
    h = await fetch(ep, { method: 'POST', headers: { Authorization: `Bearer ${CRON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'queued', header: hdr, lines: rowsCsv, scanned: 10 }) });
    assert.equal(h.status, 400);
    ok('D20：cslb-ingest 要密钥；GET 给要查的牌照号；总表行数太少整批不认（400）');
  }
  // 共用的测试库里别的窗口也可能有排队等比对的人：比对会把所有排队的人都过一遍（总表里查不到的会被下架），
  // 所以只有排队的全是这次跑建的人时才跑这一段，否则跳过（不动别人的数据）。
  const { rows: others } = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM jobs_pros WHERE license_state->>'state' = 'queued' AND NOT (contact_id = ANY($1::uuid[]))`,
    [contacts]
  );
  if (others[0].n > 0) {
    console.log(`  - 跳过 D20 下架那一段：测试库里还有 ${others[0].n} 个别的窗口的人在排队等比对，不能动他们`);
  } else {
    const out = await ingestCslb({ mode: 'queued', header: hdr, lines: rowsCsv, scanned: 10 }, new Date('2026-11-24T20:00:00Z'), { minScanned: 1 });
    assert.equal(out.checked, 1);
    assert.equal(out.notActive, 1);
    const { rows: pa } = await pool.query<{ status: string; listed: boolean; removed_reason: string }>(`SELECT status, listed, removed_reason FROM jobs_pros WHERE id = $1`, [proAId]);
    assert.equal(pa[0].status, 'removed');
    assert.equal(pa[0].listed, false);
    assert.ok(pa[0].removed_reason.includes('过期'));
    const { rows: ln } = await pool.query(`SELECT 1 FROM jobs_notifications WHERE kind = 'license' AND pro_id = $1`, [proAId]);
    assert.ok(ln[0]);
    ok('D20：runner 送来的总表行显示过期 → 自动下架、通知本人、提醒工作人员');
  }
  // 90 天复核（B、C 类转工作人员）
  await call('POST', `/workbench/jobs/pros/${designerId}/verify`, staff, { action: 'approve' });
  await pool.query(`UPDATE jobs_pros SET next_review_at = now() - interval '1 minute' WHERE id = $1`, [designerId]);
  await runVerification(new Date());
  const { rows: dr } = await pool.query<{ needs_review: boolean }>(`SELECT needs_review FROM jobs_pros WHERE id = $1`, [designerId]);
  assert.equal(dr[0].needs_review, true);
  r = await call('GET', '/jobs/pros?trade=interior');
  const dc = r.j.items.find((x: { id: string }) => x.id === designerId);
  assert.deepEqual(dc.badges.map((b: { kind: string }) => b.kind).slice(0, 3), ['no_state_license', 'business_reg', 'insurance']);
  ok('90 天复核：营业登记类转工作人员；C 类标记分开显示');

  console.log(`\n全部通过：${passed} 项`);
}

main()
  .catch((e) => { console.error('✗ 失败：', e); process.exitCode = 1; })
  .finally(async () => {
    const ids = contacts;
    await pool.query(`DELETE FROM ops_exceptions WHERE ref IN (SELECT id::text FROM jobs_pros WHERE contact_id = ANY($1::uuid[])) OR ref IN (SELECT id::text FROM jobs_posts WHERE contact_id = ANY($1::uuid[]))`, [ids]).catch((e) => console.error(e.message));
    await pool.query(`DELETE FROM jobs_reports WHERE reporter_contact_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
    await pool.query(`DELETE FROM jobs_posts WHERE contact_id = ANY($1::uuid[])`, [ids]).catch((e) => console.error(e.message));
    await pool.query(`DELETE FROM jobs_pros WHERE contact_id = ANY($1::uuid[])`, [ids]).catch((e) => console.error(e.message));
    await pool.query(`DELETE FROM applications WHERE contact_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
    await pool.query(`DELETE FROM jobs_notifications WHERE contact_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
    await pool.query(`DELETE FROM track_events WHERE contact_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
    // 只删这次跑建的工作人员留下的操作记录（按本次的名字 / 邮箱），别的窗口的不碰
    await pool.query(`DELETE FROM crm_audit_log WHERE actor = ANY($1::text[])`, [staffActors]).catch(() => undefined);
    await pool.query(`DELETE FROM sessions WHERE contact_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
    await pool.query(`DELETE FROM staff_roles WHERE email = ANY($1)`, [staffEmails]).catch(() => undefined);
    await pool.query(`DELETE FROM login_codes WHERE target = ANY($1)`, [testPhones]).catch(() => undefined);
    await pool.query(`DELETE FROM jobs_pro_clicks WHERE viewer_contact_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
    await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[])`, [ids]).catch((e) => console.error('contacts', e.message));
    if (savedSwitches) {
      for (const [k, v] of Object.entries(savedSwitches)) await pool.query(`UPDATE crm_settings SET value = $2 WHERE key = $1`, [k, JSON.stringify(v)]).catch(() => undefined);
    }
    await pool.end();
  });
