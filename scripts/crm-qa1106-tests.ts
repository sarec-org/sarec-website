/**
 * 11-06 测试报告修复的回归测试（本地库）。
 * 用法：DATABASE_URL=postgres://postgres@127.0.0.1:5544/sarec_crm_dev pnpm dlx tsx scripts/crm-qa1106-tests.ts
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { getPool, withTransaction } from '@/lib/db/client';
import { CrmError, cancelRegistration, checkIn, getEventBySlug } from '@/lib/crm/events';
import { register } from '@/lib/crm/flow';
import { searchPeople } from '@/lib/crm/staff';
import { guardNotProduction } from './_guard';

guardNotProduction();
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const P = String(200 + (randomBytes(2).readUInt16BE() % 700));
let passed = 0;
const ok = (n: string) => {
  passed++;
  console.log(`  ✓ ${n}`);
};
async function wechatUser(tag: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO contacts (name, wechat_openid, acquisition_source) VALUES ('微信用户', $1, 'miniprogram') RETURNING id`,
    [`qa-openid-${tag}-${sfx}`]
  );
  return rows[0].id;
}

async function main() {
  const starts = new Date(Date.now() + 2 * 86400_000);
  const { rows: ev } = await pool.query<{ id: string; slug: string }>(
    `INSERT INTO events (slug, title, starts_at, ends_at, fee_cents, capacity) VALUES ($1, 'QA 满员测试', $2, $3, 0, 1) RETURNING id, slug`,
    [`qa-${sfx}`, starts, new Date(starts.getTime() + 7200_000)]
  );
  const slug = ev[0].slug;
  const evRow = async () => (await withTransaction((db) => getEventBySlug(db, slug)))!;

  console.log('签到台按小程序报名填的手机号 / 邮箱能查到人');
  const a = await wechatUser('a');
  await register(slug, a, { name: `QA甲${sfx}`, roleSub: 'agent', phone: `213${P}0101`, email: `qa-a-${sfx}@example.com` });
  const byPhone = await searchPeople(`213${P}0101`, ev[0].id);
  assert.ok(byPhone.some((r) => r.id === a), '手机号查不到');
  const byTail = await searchPeople(`${P}0101`, ev[0].id);
  assert.ok(byTail.some((r) => r.id === a), '手机后几位查不到');
  const byEmail = await searchPeople(`QA-A-${sfx}@example.com`, ev[0].id);
  assert.ok(byEmail.some((r) => r.id === a && r.reg_status === 'registered'), '邮箱查不到');
  ok('手机号、手机尾号、邮箱（不分大小写）都能查到，带出本场报名状态');

  console.log('满员后：线上报名进候补；现场扫码报名直接签到；候补的人到场也能签到');
  const b = await wechatUser('b');
  await register(slug, b, { name: `QA乙${sfx}`, roleSub: 'agent' });
  assert.equal((await regOf(b)).status, 'waitlisted');
  const r1 = await withTransaction(async (db) => checkIn(db, await evRow(), b));
  assert.equal(r1.kind, 'checked_in', `候补到场应签到成功，实际 ${r1.kind}`);
  const c = await wechatUser('c');
  await register(slug, c, { name: `QA丙${sfx}`, roleSub: 'agent', channel: 'onsite' });
  assert.equal((await regOf(c)).status, 'registered');
  assert.equal((await regOf(c)).source, 'onsite');
  const r2 = await withTransaction(async (db) => checkIn(db, await evRow(), c));
  assert.equal(r2.kind, 'checked_in');
  ok('满员时候补到场转为已报名并签到；现场报名不占名额限制，来源记为 onsite');

  console.log('已签到的人不能取消报名');
  await assert.rejects(
    withTransaction((db) => cancelRegistration(db, ev[0].id, c)),
    (e: unknown) => e instanceof CrmError && e.code === 'already_checked_in'
  );
  assert.equal((await regOf(c)).status, 'registered');
  ok('取消接口返回“您已签到，不能再取消报名”，数据不变');

  console.log('连点“报名并签到”：两个请求同时写联系方式不报错');
  const d = await wechatUser('d');
  const input = { name: `QA丁${sfx}`, roleSub: 'agent', phone: `213${P}0104`, email: `qa-d-${sfx}@example.com`, channel: 'onsite' };
  const res = await Promise.allSettled([register(slug, d, input), register(slug, d, input), register(slug, d, input)]);
  const bad = res.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
  assert.equal(bad.length, 0, `并发报名报错：${bad.map((x) => (x.reason as Error).message).join('; ')}`);
  const { rows: m } = await pool.query(`SELECT kind FROM contact_methods WHERE contact_id = $1 AND is_current`, [d]);
  assert.equal(m.length, 2);
  ok('三次并发提交都成功，每种联系方式只有一条当前值');

  console.log('现场签到连点（报名 + 签到两步，与线上接口顺序一致）：不死锁、不报错');
  const evFixed = await evRow();
  for (let round = 0; round < 5; round++) {
    const e = await wechatUser(`e${round}`);
    const one = async () => {
      await register(slug, e, { name: `QA戊${sfx}`, roleSub: 'agent', phone: `213${P}02${round}5`, email: `qa-e${round}-${sfx}@example.com`, channel: 'onsite' });
      return withTransaction(async (db) => checkIn(db, evFixed, e));
    };
    const rs = await Promise.allSettled(Array.from({ length: 5 }, one));
    const errs = rs.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    assert.equal(errs.length, 0, `第 ${round + 1} 轮报错：${errs.map((x) => (x.reason as Error).message).join('; ')}`);
    const kinds = rs.map((r) => (r as PromiseFulfilledResult<{ kind: string }>).value.kind).sort();
    assert.deepEqual(kinds, ['already', 'already', 'already', 'already', 'checked_in']);
  }
  ok('5 轮 × 5 次并发：每轮 1 次签到成功、4 次“已签到”，没有死锁');

  console.log(`\n全部通过：${passed} 组`);
}
async function regOf(id: string) {
  const { rows } = await pool.query<{ status: string; source: string }>(`SELECT r.status, r.source FROM registrations r JOIN events e ON e.id = r.event_id WHERE e.slug = $1 AND r.contact_id = $2`, [`qa-${sfx}`, id]);
  return rows[0];
}
main()
  .then(() => pool.end())
  .catch(async (e) => {
    console.error('✗', e);
    await pool.end();
    process.exit(1);
  });
