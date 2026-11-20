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
    await pool.query(`INSERT INTO staff_roles (email, name, roles) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`, [email, name, opts.roles ?? ['admin']]);
    staffEmails.push(email);
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
  await pool.query(`UPDATE crm_settings SET value = 'true' WHERE key = 'jobs_require_paid_member'`);

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
  ok('meta：开关关、7 个首页入口、资质表、统一声明');
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
  r = await call('POST', '/jobs/me/pro', worker, { agree: true, role: 'worker', name: '验收工-工人', trades: ['painting', 'cleaning'], cities: ['阿凯迪亚'] });
  assert.equal(r.j.pro.status, 'verified');
  assert.equal(r.j.pro.needPay, false);
  ok('工人免费登记、不填牌照，登记即生效');
  r = await call('POST', '/jobs/me/pro', designer, { agree: true, role: 'pro_service', name: '验收工-室内设计', trades: ['interior'], cities: ['阿凯迪亚'] });
  assert.equal(r.status, 400);
  assert.ok(r.j.error.message.includes('营业登记'));
  r = await call('POST', '/jobs/me/pro', designer, {
    agree: true, role: 'pro_service', name: '验收工-室内设计', trades: ['interior'], cities: ['阿凯迪亚'], businessRegUrl: 'https://example.com/biz.jpg', insuranceUrl: 'https://example.com/ins.jpg'
  });
  assert.equal(r.j.pro.status, 'pending');
  const designerId = r.j.pro.id as string;
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
  r = await call('POST', `/jobs/pros/${proAId}/contact`);
  assert.equal(r.status, 401);
  r = await call('POST', `/jobs/pros/${proAId}/contact`, owner);
  assert.ok(r.j.phone);
  const { rows: pv } = await pool.query(`SELECT 1 FROM jobs_contacts WHERE direction = 'pro' AND pro_id = $1 AND viewer_contact_id = $2`, [proAId, owner.id]);
  assert.ok(pv[0]);
  ok('找工人列表：牌照号 + 执照已核验日期；工人不进业主列表；联系要登录并记录');

  // 施工队招工
  r = await call('POST', '/jobs/posts', crewBoss, { posterRole: 'crew', trades: ['painting'], city: '阿凯迪亚', description: '外墙油漆', timing: 'week', crewHeadcount: 3, crewDuration: '两周', crewPay: '$25/小时' });
  const pCrew = r.j.ids[0] as string;
  r = await call('POST', `/jobs/posts/${pCrew}/contact`, worker);
  assert.equal(r.status, 200);
  r = await call('POST', `/jobs/posts/${pCrew}/contact`, proA);
  assert.equal(r.status, 403);
  ok('施工队招工：工人能联系，公司不能');

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
  const { runVerification } = await import('@/lib/jobs/verify');
  const csv = [
    'LicenseNo,LastUpdate,BusinessName,BUS-NAME-2,FullBusinessName,MailingAddress,City,State,County,ZIPCode,country,BusinessPhone,BusinessType,IssueDate,ReissueDate,ExpirationDate,InactivationDate,ReactivationDate,PendingSuspension,PendingClassRemoval,PendingClassReplace,PrimaryStatus,SecondaryStatus,Classifications(s),AsbestosReg,WorkersCompCoverageType,WCInsuranceCompany,WCPolicyNumber,WCEffectiveDate,WCExpirationDate,WCCancellationDate,WCSuspendDate,CBSuretyCompany,CBNumber,CBEffectiveDate,CBCancellationDate,CBAmount',
    '1050000,11/01/2026,TEST CO,,,1 MAIN,ARCADIA,CA,LA,91006,,(626) 000 0000,Corporation,01/01/2020,,01/31/2026,,,,,,CLEAR,,B| C33,,Workers\' Compensation Insurance,SCIF,1,01/01/2026,01/01/2027,,,ACME SURETY,1,01/01/2026,,25000'
  ].join('\n');
  const fake = (async () => new Response(csv, { status: 200 })) as unknown as typeof fetch;
  await pool.query(`UPDATE jobs_pros SET license_state = jsonb_build_object('state','queued') WHERE id = $1`, [proAId]);
  const out = await runVerification(new Date('2026-11-24T20:00:00Z'), { onlyQueued: true, fetcher: fake });
  assert.deepEqual(out.cslb, { checked: 1, notActive: 1 });
  const { rows: pa } = await pool.query<{ status: string; listed: boolean; removed_reason: string }>(`SELECT status, listed, removed_reason FROM jobs_pros WHERE id = $1`, [proAId]);
  assert.equal(pa[0].status, 'removed');
  assert.equal(pa[0].listed, false);
  assert.ok(pa[0].removed_reason.includes('过期'));
  const { rows: ln } = await pool.query(`SELECT 1 FROM jobs_notifications WHERE kind = 'license' AND pro_id = $1`, [proAId]);
  assert.ok(ln[0]);
  ok('CSLB 官方总表显示过期 → 自动下架、通知本人、提醒工作人员');
  // 90 天复核（B、C 类转工作人员）
  await call('POST', `/workbench/jobs/pros/${designerId}/verify`, staff, { action: 'approve' });
  await pool.query(`UPDATE jobs_pros SET next_review_at = now() - interval '1 minute' WHERE id = $1`, [designerId]);
  await runVerification(new Date(), { fetcher: fake });
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
    await pool.query(`DELETE FROM jobs_notifications WHERE contact_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
    await pool.query(`DELETE FROM track_events WHERE contact_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
    await pool.query(`DELETE FROM crm_audit_log WHERE actor LIKE 'staff:验收工-%'`).catch(() => undefined);
    await pool.query(`DELETE FROM sessions WHERE contact_id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
    await pool.query(`DELETE FROM staff_roles WHERE email = ANY($1)`, [staffEmails]).catch(() => undefined);
    await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[])`, [ids]).catch((e) => console.error('contacts', e.message));
    if (savedSwitches) {
      for (const [k, v] of Object.entries(savedSwitches)) await pool.query(`UPDATE crm_settings SET value = $2 WHERE key = $1`, [k, JSON.stringify(v)]).catch(() => undefined);
    }
    await pool.end();
  });
