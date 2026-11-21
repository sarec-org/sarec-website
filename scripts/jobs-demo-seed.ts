/**
 * 找工人 · 接活儿 —— 演示数据（D15，给 1.4.3 体验版连测试站用）。**只能对测试库跑。**
 *
 * 放进测试库：
 *   - 首页 7 个入口每个至少 1 个核验通过的演示接活人（名字以「演示-」开头，电话是明显假的 555 号码，介绍里写明“演示数据”）；
 *     他们没有牌照号（不出现“执照已核验”），是缴费会员（演示用会籍，备注写明），所以在“要求缴费会员”开着时也上列表；
 *   - 几条演示活儿（标题、描述里写“演示”，城市含尔湾），发布人「演示-房主」；
 *   - 不发任何通知（直接写库，不走派活）。情况说明照样过内容安全；业主类演示活儿随后在测试库直接标成 pass（sec_note='demo_seed'，测试站没有微信密钥），招工那条不标。
 * 清理：scripts/jobs-demo-clean.ts（按「演示-」前缀和 ID 删）。
 *
 * 用法：DATABASE_URL=<测试库> pnpm dlx tsx scripts/jobs-demo-seed.ts --i-know-this-is-not-production [--reset]
 * 安全：读 ~/.sarec/prod.env 只取数据库主机名做比对（不打印）；和正式库主机相同、或读不到正式库主机名，一律拒绝。
 */
import { writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { getPool } from '@/lib/db/client';
import { guardNotProduction } from './_guard';
import { assertTestDb, DEMO_EMAIL_DOMAIN, DEMO_PREFIX, demoContactIds, removeDemo } from './jobs-demo-lib';

guardNotProduction();
assertTestDb();

type ProSeed = { key: string; name: string; role: 'company' | 'licensed' | 'pro_service'; trades: string[]; cities: string[]; years: number; intro: string; team?: number };
const PROS: ProSeed[] = [
  { key: 'plumbing', name: '演示-尔湾水管公司', role: 'company', trades: ['plumbing'], cities: ['irvine', 'oc_other'], years: 12, team: 6, intro: '演示数据（不是真实商家）：通下水、换热水器、修漏水。' },
  { key: 'electrical', name: '演示-电工师傅', role: 'licensed', trades: ['electrical'], cities: ['irvine', 'diamond_bar'], years: 9, intro: '演示数据（不是真实商家）：加插座、换电箱、装充电桩。' },
  { key: 'hvac', name: '演示-空调暖气公司', role: 'company', trades: ['hvac'], cities: ['irvine', 'rowland_heights'], years: 15, team: 8, intro: '演示数据（不是真实商家）：空调不制冷、暖气检修、换新机。' },
  { key: 'handyman', name: '演示-房屋维修师傅', role: 'licensed', trades: ['handyman', 'painting'], cities: ['irvine', 'oc_other', 'diamond_bar'], years: 7, intro: '演示数据（不是真实商家）：补墙、修门、换锁芯、刷漆。' },
  { key: 'repair', name: '演示-厨卫翻新公司', role: 'company', trades: ['kitchen_bath', 'remodel', 'flooring'], cities: ['irvine', 'diamond_bar'], years: 18, team: 12, intro: '演示数据（不是真实商家）：厨房、卫生间翻新，地板瓷砖。' },
  { key: 'roofing', name: '演示-屋顶防水公司', role: 'company', trades: ['roofing'], cities: ['irvine', 'oc_other'], years: 20, team: 10, intro: '演示数据（不是真实商家）：屋顶漏水、换瓦、防水。' },
  { key: 'design', name: '演示-室内设计工作室', role: 'pro_service', trades: ['interior'], cities: ['irvine', 'oc_other'], years: 6, intro: '演示数据（不是真实商家）：室内设计、软装方案。' }
];

type PostSeed = { role: 'owner' | 'landlord' | 'property' | 'developer' | 'crew'; trade: string; city: string; desc: string; timing: 'asap' | 'week' | 'month' | 'flexible'; budget?: string; crew?: [number, string] };
const POSTS: PostSeed[] = [
  { role: 'owner', trade: 'plumbing', city: 'irvine', desc: '演示：厨房水槽下面漏水，柜子里有积水。', timing: 'asap', budget: '$200-500' },
  { role: 'landlord', trade: 'handyman', city: 'irvine', desc: '演示：租客搬走了，墙上有几个洞要补，两扇门关不严。', timing: 'week' },
  { role: 'property', trade: 'hvac', city: 'irvine', desc: '演示：一套公寓空调不制冷，要上门检查。', timing: 'week' },
  { role: 'owner', trade: 'kitchen_bath', city: 'diamond_bar', desc: '演示：主卫想翻新，换浴缸改淋浴。', timing: 'month', budget: '$8000-15000' },
  { role: 'developer', trade: 'roofing', city: 'irvine', desc: '演示：两栋独立屋屋顶要换，先看现场报价。', timing: 'flexible' },
  { role: 'owner', trade: 'interior', city: 'irvine', desc: '演示：新买的房子想做室内设计和软装。', timing: 'month' },
  { role: 'crew', trade: 'painting', city: 'irvine', desc: '演示：外墙油漆，招工人。', timing: 'week', crew: [3, '两周'] }
];

async function main() {
  const pool = getPool();
  const existing = await demoContactIds(pool);
  if (existing.length) {
    if (!process.argv.includes('--reset')) {
      console.error(`测试库里已经有 ${existing.length} 个演示身份。要重建请加 --reset（会先按「${DEMO_PREFIX}」前缀删掉旧的）。`);
      process.exit(1);
    }
    console.log('先清掉旧的演示数据：', await removeDemo(pool, []));
  }
  const { tradeMap } = await import('@/lib/jobs/trades');
  const { cityNames } = await import('@/lib/jobs/cities');
  const { makeTitle } = await import('@/lib/jobs/posts');
  const { checkDescription, saveSec } = await import('@/lib/jobs/secCheck');
  const trades = await tradeMap(pool);
  const cities = await cityNames(pool);
  for (const p of PROS) for (const t of p.trades) if (!trades.get(t)?.open) throw new Error(`工种 ${t} 不存在或没开放`);

  let n = 0;
  const contact = async (name: string) => {
    n++;
    const phone = `+1949555${String(100 + n).padStart(4, '0')}`; // 949-555-01xx：明显的假号码
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO contacts (name, email, email_verified_at, phone_e164, phone_verified_at, acquisition_source)
       VALUES ($1, $2, now(), $3, now(), 'test') RETURNING id`,
      [name, `demo-jobs-${n}${DEMO_EMAIL_DOMAIN}`, phone]
    );
    return { id: rows[0].id, phone };
  };

  const out: { kind: string; id: string; name: string; extra: string }[] = [];
  for (const p of PROS) {
    const c = await contact(p.name);
    // 演示用会籍：让“要求缴费会员”开着时也上列表（备注写明，清理脚本一起删）
    await pool.query(
      `INSERT INTO applications (application_type, application_status, payment_status, email, contact_id, selected_tier_slug, membership_start_date, membership_end_date, payment_plan, notes)
       VALUES ('membership', 'approved', 'paid', $1, $2, 'member', current_date, current_date + 365, 'offline', '演示数据（找工人·接活儿 体验版），不是真实会员，清理脚本会删')`,
      [`demo-jobs-${n}${DEMO_EMAIL_DOMAIN}`, c.id]
    );
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO jobs_pros (contact_id, role, name, trades, verified_trades, cities, years, languages, available_now, intro, team_size,
          agreed_at, status, verified_at, verified_by, next_review_at, is_paid_member, listed)
       VALUES ($1, $2, $3, $4, $4, $5, $6, '{普通话,English}', true, $7, $8, now(), 'verified', now(), 'demo-seed', now() + interval '90 days', true, true) RETURNING id`,
      [c.id, p.role, p.name, p.trades, p.cities, p.years, p.intro, p.team ?? null]
    );
    out.push({ kind: '接活人', id: rows[0].id, name: p.name, extra: `首页入口 ${p.key}｜工种 ${p.trades.map((k) => trades.get(k)!.name).join('、')}｜城市 ${p.cities.map((k) => cities.get(k) ?? k).join('、')}｜电话 ${c.phone}` });
  }

  const owner = await contact(`${DEMO_PREFIX}房主`);
  const crewBoss = await contact(`${DEMO_PREFIX}施工队`);
  const { POST_DAYS } = await import('@/lib/jobs/constants');
  for (const p of POSTS) {
    const by = p.role === 'crew' ? crewBoss : owner;
    const cityName = cities.get(p.city)!;
    const tName = trades.get(p.trade)!.name;
    const t0 = makeTitle(cityName, tName, p.desc, p.role, p.crew?.[0] ?? null);
    const title = t0.includes('演示') ? t0 : `${t0}（演示）`; // 标题里一定写“演示”（招工的标题不取描述）
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO jobs_posts (batch_id, contact_id, poster_role, trade_key, city_key, city, title, description, timing, budget_range, call_name, phone,
          crew_headcount, crew_duration, expires_at, notify_round, notified_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, '演示', $10, $11, $12, now() + make_interval(days => $13), 1, now()) RETURNING id`,
      [by.id, p.role, p.trade, p.city, cityName, title, p.desc, p.timing, p.budget ?? null, by.phone, p.crew?.[0] ?? null, p.crew?.[1] ?? null, POST_DAYS]
    );
    // 情况说明照样过内容安全：本机 / 测试站没有微信密钥时记“未检测”（不进小程序 matched）
    let sec = await checkDescription(p.desc, null);
    await saveSec(pool, [rows[0].id], sec);
    if (p.role !== 'crew') {
      // 只在演示脚本里：业主类演示活儿直接标成内容安全已通过（测试站没有微信密钥），让体验版「通知给我的活儿」能看到。
      // 运行时的检查逻辑不变；真实活儿照样按 msgSecCheck 结果记。招工那条不标（本来也不进小程序）。
      sec = { status: 'pass', note: 'demo_seed' };
      await pool.query(`UPDATE jobs_posts SET sec_status = 'pass', sec_note = 'demo_seed', sec_checked_at = now() WHERE id = $1`, [rows[0].id]);
    }
    out.push({ kind: '活儿', id: rows[0].id, name: title, extra: `${p.role}｜内容安全 ${sec.status}${sec.note ? `（${sec.note}）` : ''}` });
  }
  out.push({ kind: '发布人', id: owner.id, name: `${DEMO_PREFIX}房主`, extra: `电话 ${owner.phone}` });
  out.push({ kind: '发布人', id: crewBoss.id, name: `${DEMO_PREFIX}施工队`, extra: `电话 ${crewBoss.phone}` });

  const md = [
    `# 找工人·接活儿 演示数据（测试库，${new Date().toISOString().slice(0, 16)}Z 生成）`,
    '',
    '由 scripts/jobs-demo-seed.ts 生成；清理：scripts/jobs-demo-clean.ts（按「演示-」前缀和下面的 ID 删）。',
    '',
    '演示活儿在测试库直接标成内容安全已通过（测试站没有微信密钥）',
    '',
    '| 类别 | ID | 名字 / 标题 | 说明 |',
    '|---|---|---|---|',
    ...out.map((o) => `| ${o.kind} | ${o.id} | ${o.name} | ${o.extra} |`)
  ].join('\n');
  const file = join(homedir(), 'WeChatProjects', '找工人接活_演示数据清单.md');
  writeFileSync(file, md + '\n');
  console.log(md);
  console.log(`\n清单已写到 ${file}`);
}

main()
  .catch((e) => { console.error('✗ 失败：', e); process.exitCode = 1; })
  .finally(() => getPool().end());
