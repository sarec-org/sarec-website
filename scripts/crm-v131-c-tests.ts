/**
 * 1.3.1 C 加入商会 —— 回归测试（测试库；Resend / 短信在 fetch 层拦截，不真发）。只建 DEV131- 数据，结束按 ID 删除。
 * 用法：DATABASE_URL=<测试库> pnpm dlx tsx scripts/crm-v131-c-tests.ts --i-know-this-is-not-production
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
const sent: { url: string; body: string }[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
  const u = String((url as { url?: string })?.url ?? url);
  if (u.includes('api.resend.com') || u.includes('api.twilio.com')) { sent.push({ url: u, body: String(init?.body ?? '') }); return new Response(JSON.stringify({ id: 'dev131-x', sid: 'SMdev' }), { status: 200, headers: { 'content-type': 'application/json' } }); }
  return realFetch(url as string, init);
}) as typeof fetch;
process.env.RESEND_API_KEY = 're_dev131_intercepted';
process.env.PREVIEW_EMAIL_ALLOW = 'dev131@example.com,info@sinoamericanrec.org';
process.env.LEAD_NOTIFY_EMAIL = 'dev131@example.com';
process.env.TWILIO_ACCOUNT_SID = 'ACdev131'; process.env.TWILIO_AUTH_TOKEN = 'dev131'; process.env.TWILIO_FROM_NUMBER = '+15550000000';
import { getPool } from '@/lib/db/client';
import { guardNotProduction } from './_guard';
guardNotProduction();
const pool = getPool();
const made: string[] = [];
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };
const staff = { contactId: '00000000-0000-0000-0000-000000000000', email: 'dev131-staff@example.com', name: 'DEV131-助理', roles: ['ops'] as 'ops'[] };
async function main() {
  const j = await import('@/lib/crm/join');
  const { rows } = await pool.query<{ id: string }>(`INSERT INTO contacts (name, phone_e164, wechat_openid, acquisition_source) VALUES ('DEV131-想入会', $1, $2, 'miniprogram') RETURNING id`, [`+1626${String(Date.now()).slice(-7)}`, `dev131-openid-${randomBytes(4).toString('hex')}`]);
  const me = rows[0].id; made.push(me);
  await pool.query(`INSERT INTO profile_answers (contact_id, item_code, value, source) VALUES ($1, 'CK:profession', '{"choice":"开发商"}', 'self_select')`, [me]);
  const pg = await j.joinPage(me);
  assert.equal(pg.prefill.name, 'DEV131-想入会');
  assert.equal(pg.prefill.industry, '开发商');
  assert.ok(pg.prefill.phone);
  assert.ok(pg.benefits.some((b) => b.status === 'soon') && pg.benefits.some((b) => b.status === 'live'));
  assert.ok(!JSON.stringify(pg).match(/\$\d|美元|价格|付款|缴费/));
  ok('权益 + 已有资料自动带入（姓名、职业、手机）；页面数据里没有金额、价格、付款字样；未上线的标“筹备中”');
  await assert.rejects(j.submitJoin(me, { name: '', phone: '' }), /还差：姓名、手机/);
  const r1 = await j.submitJoin(me, { ...pg.prefill, company: 'DEV131 公司', source: 'checkin' });
  assert.equal(r1.message, '已收到申请，工作人员会联系您');
  const r2 = await j.submitJoin(me, { ...pg.prefill, company: 'DEV131 公司 2' });
  assert.equal(r2.id, r1.id);
  const { rows: f } = await pool.query(`SELECT notified_at FROM followups WHERE dedupe_key = $1`, [`join:${r1.id}`]);
  assert.ok(f[0]?.notified_at);
  assert.equal(sent.filter((x) => x.url.includes('resend')).length, 1);
  ok('提交 → “已收到申请，工作人员会联系您”；后台待跟进一条 + 邮件通知 info@ 一次；重复提交只更新不重复通知');
  const s1 = await j.sendJoinLink(staff, r1.id, 'sms');
  assert.ok(s1.ok);
  const sms = sent.find((x) => x.url.includes('twilio'));
  assert.ok(sms && decodeURIComponent(sms.body).includes('/zh/join'));
  const c = await j.sendJoinLink(staff, r1.id, 'copy');
  assert.match(String(c.text), /\/zh\/join/);
  const list = await j.listJoinRequests();
  assert.equal(list.find((x: { id: string }) => x.id === r1.id).status, 'link_sent');
  ok('助理一键发网站缴费链接（短信 / 复制发微信），状态变“已发缴费链接”');
  await pool.query(`UPDATE join_requests SET created_at = now() - interval '8 days' WHERE id = $1`, [r1.id]);
  const before = sent.length;
  const sc = await j.scanJoinFollowups();
  assert.ok(sc.reminded >= 1);
  const { rows: f7 } = await pool.query(`SELECT 1 FROM followups WHERE dedupe_key = $1`, [`join7:${r1.id}`]);
  assert.ok(f7[0]);
  assert.equal(sent.length, before);
  const sc2 = await j.scanJoinFollowups();
  assert.equal((await pool.query(`SELECT count(*)::int AS n FROM followups WHERE dedupe_key = $1`, [`join7:${r1.id}`])).rows[0].n, 1);
  void sc2;
  ok('满 7 天没入会 → 提醒助理跟进一次（只一次），不给客户发任何消息');
  console.log(`\n全部通过：${passed} 项`);
}
async function cleanup() {
  await pool.query(`DELETE FROM followups WHERE contact_id = ANY($1::uuid[])`, [made]);
  await pool.query(`DELETE FROM ops_exceptions WHERE dedupe_key LIKE 'followup_email:%' AND created_at > now() - interval '1 hour' AND ref IS NULL`).catch(() => undefined);
  await pool.query(`DELETE FROM join_requests WHERE contact_id = ANY($1::uuid[])`, [made]);
  await pool.query(`DELETE FROM crm_audit_log WHERE action IN ('join_link_sent','join_status') AND actor = 'staff:DEV131-助理'`);
  await pool.query(`DELETE FROM profile_answers WHERE contact_id = ANY($1::uuid[])`, [made]);
  await pool.query(`DELETE FROM contact_methods WHERE contact_id = ANY($1::uuid[])`, [made]);
  await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[])`, [made]);
  console.log('清理完成');
}
main().catch((e) => { console.error('✗ 失败：', e); process.exitCode = 1; }).finally(async () => { await cleanup().catch((e) => console.error('清理出错', e)); await pool.end(); });
