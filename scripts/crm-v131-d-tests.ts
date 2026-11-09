/**
 * 1.3.1 D 电子名片与名片夹 —— 回归测试（测试库；微信内容安全没有配置，走“未检查”）。只建 DEV131- 数据，按 ID 清理。
 * 用法：DATABASE_URL=<测试库> pnpm dlx tsx scripts/crm-v131-d-tests.ts --i-know-this-is-not-production
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
delete process.env.WX_APPID;
delete process.env.WX_SECRET;
import { getPool } from '@/lib/db/client';
import { guardNotProduction } from './_guard';
guardNotProduction();
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const made = { c: [] as string[], e: [] as string[] };
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };
async function person(name: string) {
  const { rows } = await pool.query<{ id: string }>(`INSERT INTO contacts (name, email, acquisition_source) VALUES ($1, $2, 'test') RETURNING id`, [name, `dev131-${sfx}-${made.c.length}@example.com`]);
  made.c.push(rows[0].id);
  return rows[0].id;
}
const pts = async (id: string) => (await pool.query<{ n: number }>(`SELECT coalesce(sum(points), 0)::int AS n FROM points_ledger WHERE contact_id = $1`, [id])).rows[0].n;

async function main() {
  const cards = await import('@/lib/crm/cards');
  const book = await import('@/lib/crm/cardbook');
  const a = await person('DEV131-甲');
  const b = await person('DEV131-乙');
  const c = await person('DEV131-丙');
  await pool.query(`INSERT INTO profile_answers (contact_id, item_code, value, source) VALUES ($1, 'CK:profession', '{"choice":"开发商"}', 'self_select')`, [a]);
  const ca = await cards.myCard(a);
  assert.equal(ca.template, 'navy');
  assert.equal(ca.industry, '开发商');
  ok('名片默认“深蓝金商务”，行业自动带入签到时选的职业');
  const up = await cards.updateMyCard(a, { template: 'bilingual', nameEn: 'Jia', companyEn: 'DEV131 Dev Co', titleEn: 'Founder', company: 'DEV131 开发公司', title: '创始人', intro: '专做南加州独栋开发' });
  assert.equal(up.template, 'bilingual');
  assert.equal(up.companyEn, 'DEV131 Dev Co');
  await assert.rejects(cards.updateMyCard(a, { template: 'gold' }), /请选择名片模板/);
  await assert.rejects(cards.updateMyCard(a, { projectPhotoUrl: 'https://evil.example.com/x.jpg' }), /项目照片请在名片页上传/);
  for (const t of ['white', 'estate', 'navy']) assert.equal((await cards.updateMyCard(a, { template: t })).template, t);
  ok('4 款模板随时切换（深蓝金商务 / 简约白 / 中英双语 / 地产项目）；英文字段保存；外链项目照片拒绝');
  const pub = await cards.publicCard(ca.token);
  assert.equal(pub.companyEn, 'DEV131 Dev Co');
  assert.equal(pub.phone, null);
  ok('别人扫码看到的名片带模板和英文；没公开的联系方式不显示');
  const ev = (await pool.query<{ id: string; slug: string }>(`INSERT INTO events (slug, title, starts_at, is_listed) VALUES ($1, 'DEV131-交换名片活动', now() - interval '1 hour', false) RETURNING id, slug`, [`dev131d-card-${sfx}`])).rows[0];
  made.e.push(ev.id);
  await assert.rejects(book.requestExchange(a, ca.token), /自己的名片/);
  const nobody = await person('微信用户');
  await assert.rejects(book.requestExchange(nobody, ca.token), /先做一张自己的名片/);
  const r1 = await book.requestExchange(b, ca.token, ev.slug);
  assert.equal(r1.status, 'pending');
  assert.equal((await book.cardBook(b)).total, 0);
  const inc = await book.cardBook(a);
  assert.equal(inc.incoming.length, 1);
  ok('扫码 → “存入名片夹并回递” → 对方同意前双方都还没存（双方同意才互存）');
  const r2 = await book.respondExchange(a, (inc.incoming[0] as { id: string }).id, true);
  assert.equal(r2.status, 'accepted');
  const bb = await book.cardBook(b);
  assert.equal(bb.total, 1);
  assert.equal(bb.groups[0].event, 'DEV131-交换名片活动');
  assert.equal((await book.cardBook(a)).total, 1);
  assert.equal(await pts(a), 2);
  assert.equal(await pts(b), 2);
  ok('对方同意 → 双方互存，按“在哪场活动认识”分组，各记 2 积分');
  const again = await book.requestExchange(b, ca.token);
  assert.equal(again.status, 'accepted');
  assert.equal(await pts(b), 2);
  ok('再扫一次：提示已在名片夹，不重复计分');
  const cc = await cards.myCard(c);
  await book.requestExchange(a, cc.token);
  const mutual = await book.requestExchange(c, ca.token);
  assert.equal(mutual.status, 'accepted');
  ok('两人互相扫了对方 = 双方都同意，直接互存');
  const id = ((await book.cardBook(b)).groups[0].cards[0] as { id: string }).id;
  await book.noteExchange(b, id, '对橙县独栋开发感兴趣');
  const withNote = (await book.cardBook(b)).groups[0].cards[0] as { note: string };
  assert.equal(withNote.note, '对橙县独栋开发感兴趣');
  assert.equal(((await book.cardBook(a)).groups.flatMap((g) => g.cards) as { note: string | null }[]).every((x) => x.note === null), true);
  ok('备注只有自己看得到');
  assert.equal((await book.cardBook(b, '开发公司')).total, 1);
  assert.equal((await book.cardBook(b, '不存在的公司')).total, 0);
  ok('名片夹可搜姓名、公司、行业');
  const d = await person('DEV131-丁');
  await book.requestExchange(d, ca.token);
  const pend = (await book.cardBook(a)).incoming.find((x) => (x as { name: string }).name === 'DEV131-丁') as { id: string };
  await book.respondExchange(a, pend.id, false);
  assert.equal((await book.cardBook(d)).total, 0);
  ok('忽略请求：不互存');
  console.log(`\n全部通过：${passed} 项`);
}
async function cleanup() {
  await pool.query(`DELETE FROM card_exchanges WHERE requester_id = ANY($1::uuid[]) OR target_id = ANY($1::uuid[])`, [made.c]);
  await pool.query(`DELETE FROM points_ledger WHERE contact_id = ANY($1::uuid[])`, [made.c]);
  await pool.query(`DELETE FROM profile_answers WHERE contact_id = ANY($1::uuid[])`, [made.c]);
  await pool.query(`DELETE FROM member_cards WHERE contact_id = ANY($1::uuid[])`, [made.c]);
  await pool.query(`DELETE FROM contact_methods WHERE contact_id = ANY($1::uuid[])`, [made.c]);
  await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[])`, [made.c]);
  await pool.query(`DELETE FROM events WHERE id = ANY($1::uuid[])`, [made.e]);
  console.log('清理完成');
}
main()
  .catch((e) => { console.error('✗ 失败：', e); process.exitCode = 1; })
  .finally(async () => { await cleanup().catch((e) => console.error('清理出错', e)); await pool.end(); });
