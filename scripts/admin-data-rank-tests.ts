/**
 * 指令 14：「数据」页的功能排行、渠道排行不算内部账号 / 审核演示 / 测试账号（和新人 / 到场 / 入会同一条规则：contacts.account_kind）。
 * 本机一次性库跑：DATABASE_URL=postgres://postgres@127.0.0.1:5671/sarec_m pnpm dlx tsx scripts/admin-data-rank-tests.ts
 * 做法：先记下排行；给一个内部账号、一个测试账号造打点、渠道访问、渠道报名到场、入会、咨询 → 排行一个数都不变；
 * 再给一个真实客户造同样的数据 → 排行涨了（证明测试真的测到）。最后按 ID 删掉自己造的数据。
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { featureRanking } from '@/lib/crm/features';
import { listChannels } from '@/lib/crm/channels';
import { dataSummary } from '@/lib/crm/dataSummary';
import { guardNotProduction } from './_guard';

guardNotProduction();
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const P = '验收优-排行';
let passed = 0;
const ok = (n: string) => {
  passed++;
  console.log(`  ✓ ${n}`);
};

type Snap = { feats: Record<string, string>; chan: string | null; top: string };
async function snap(code: string): Promise<Snap> {
  const f = await featureRanking({ days: 30 });
  const feats: Record<string, string> = {};
  for (const r of f.rows) feats[r.key] = JSON.stringify({ times: r.times, people: r.people, brings: r.brings });
  const c = (await listChannels({ days: 30 })).find((x) => x.code === code);
  const s = await dataSummary(30);
  return { feats, chan: c ? JSON.stringify(c.stats) : null, top: JSON.stringify(s.top) };
}

async function main() {
  const code = `c-rank${sfx}`;
  const contacts: string[] = [];
  const { rows: ch } = await pool.query<{ id: number }>(`INSERT INTO channels (code, name, kind, created_by) VALUES ($1, $2, 'merchant', 'test') RETURNING id`, [code, `${P}渠道${sfx}`]);
  const { rows: ev } = await pool.query<{ id: string; slug: string }>(
    `INSERT INTO events (slug, title, starts_at) VALUES ($1, $2, now() - interval '2 days') RETURNING id, slug`,
    [`rank-${sfx}`, `${P}活动${sfx}`]
  );

  /** 给一个人造一整套：首页入口和海报打点、渠道码访问、渠道报名并到场、海报报名、入会、咨询 */
  async function seed(name: string, kind: string | null) {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO contacts (name, phone_e164, email, account_kind, first_channel) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [name, `+1626555${1000 + Math.floor(Math.random() * 8999)}`, `${name}-${sfx}@example.com`, kind, code]
    );
    const id = rows[0].id;
    contacts.push(id);
    for (const [n, target, channel] of [['home_entry', 'events', null], ['poster', null, null], ['visit', ev[0].slug, code], ['visit', ev[0].slug, 'poster']] as const) {
      await pool.query(`INSERT INTO track_events (name, client, contact_id, target, channel) VALUES ($1, 'mp', $2, $3, $4)`, [n, id, target, channel]);
    }
    await pool.query(
      `INSERT INTO registrations (event_id, contact_id, status, source, channel_code, arrival_status, checked_in_at) VALUES ($1, $2, 'registered', 'staff', $3, 'checked_in', now())`,
      [ev[0].id, id, code]
    );
    await pool.query(
      `INSERT INTO applications (application_type, email, contact_id, application_status, payment_status, membership_start_date, membership_end_date, selected_tier_slug)
       VALUES ('membership', $1, $2, 'approved', 'paid', current_date, current_date + 365, 'member')`,
      [`${name}-${sfx}@example.com`, id]
    );
    await pool.query(`INSERT INTO inquiries (source, name, email, message, channel_code, contact_id) VALUES ('web_form', $1, $2, '想了解入会', $3, $4)`, [name, `${name}-${sfx}@example.com`, code, id]);
    return id;
  }

  try {
    console.log('功能排行、渠道排行排除内部 / 测试账号（指令 14）');
    const before = await snap(code);
    await seed(`${P}内部${sfx}`, 'internal');
    await seed(`${P}测试${sfx}`, 'test');
    await seed(`${P}演示${sfx}`, 'review_demo');
    const mid = await snap(code);
    assert.deepEqual(mid.feats, before.feats, '功能排行：内部 / 测试 / 审核演示账号的打点和带来的报名到场入会都不算');
    assert.equal(mid.chan, before.chan, '渠道排行：这些账号的访问、报名、到场、入会、咨询、首次来源都不算');
    assert.equal(mid.top, before.top, '数据页最上面“带来最多的功能和渠道”不变');
    ok('内部账号、测试账号、审核演示账号造了打点、渠道访问、报名到场、入会、咨询：功能排行和渠道排行一个数都不变');

    await seed(`${P}真客户${sfx}`, null);
    const after = await snap(code);
    const st = JSON.parse(after.chan!) as { visits: number; registered: number; arrived: number; joined: number; inquiries: number; firstTouch: number };
    assert.deepEqual(st, { visits: 1, registered: 1, arrived: 1, joined: 1, inquiries: 1, firstTouch: 1 }, '真实客户照算');
    const home = (k: string) => JSON.parse(after.feats[k]).times - JSON.parse(before.feats[k]).times;
    assert.equal(home('home:events'), 1, '真实客户的首页入口点击照算');
    assert.equal(home('poster'), 1, '真实客户的海报打点照算');
    assert.ok(after.top.includes(`${P}渠道${sfx}`) || (JSON.parse(after.top) as unknown[]).length === 5, '真实客户带来的入会让这个渠道进了“带来最多”（前 5 名已满时不硬查）');
    ok('同样的数据换成真实客户：渠道排行访问 / 报名 / 到场 / 入会 / 咨询 / 首次来源各 +1，功能排行也 +1');
  } finally {
    await pool.query(`DELETE FROM inquiries WHERE contact_id = ANY($1::uuid[])`, [contacts]);
    await pool.query(`DELETE FROM applications WHERE contact_id = ANY($1::uuid[])`, [contacts]);
    await pool.query(`DELETE FROM registrations WHERE contact_id = ANY($1::uuid[])`, [contacts]);
    await pool.query(`DELETE FROM track_events WHERE contact_id = ANY($1::uuid[])`, [contacts]);
    await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[])`, [contacts]);
    await pool.query(`DELETE FROM events WHERE id = $1`, [ev[0].id]);
    await pool.query(`DELETE FROM channels WHERE id = $1`, [ch[0].id]);
  }
  console.log(`\n全部通过：${passed} 项`);
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
