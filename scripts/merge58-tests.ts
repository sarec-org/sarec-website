/**
 * 指令 58（11/24）：合并过档案的人，登录后看到的必须是合并后的完整资料。
 * 场景：旧档案（11/20 填过名片、有头像）合并进主档案（主档案名片空的）。以前名片整份留在旧档案，主档案看到的是空的。
 * 覆盖：① 合并后主档案名片带出旧档案的内容、头像跟过来；② 主档案已经填了的格子不被覆盖；③ 用旧档案的微信登录落到主档案、看到完整名片；
 *       ④ 合并后再改名片照常；⑤ 撤销合并：补过去的格子撤回，撤销前本人又改过的不撤；⑥ 旧档案那份原样留着。
 * 用法：DATABASE_URL=<测试库或本机临时库> pnpm dlx tsx scripts/merge58-tests.ts --i-know-this-is-not-production
 * 测试数据「验收58-」前缀，跑完按 ID 删。
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import type { Staff } from '@/lib/crm/auth';
import { wechatLogin } from '@/lib/crm/auth';
import { mergeContacts, undoMerge } from '@/lib/crm/dupMerge';
import { myCard, updateMyCard } from '@/lib/crm/cards';
import { guardNotProduction } from './_guard';

guardNotProduction();
process.env.CRM_DEV_ECHO_CODES = '1';
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const P = `验收58-${sfx}`;
const ids: string[] = [];
const S: Staff = { contactId: '00000000-0000-0000-0000-000000000000', email: 'test', name: P, roles: ['admin'] };
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };

async function contact(name: string, openid: string | null, avatar: string | null) {
  const { rows } = await pool.query<{ id: string }>(`INSERT INTO contacts (name, wechat_openid, avatar_url) VALUES ($1, $2, $3) RETURNING id`, [`${P}-${name}`, openid, avatar]);
  ids.push(rows[0].id);
  await pool.query(`INSERT INTO member_cards (contact_id) VALUES ($1) ON CONFLICT DO NOTHING`, [rows[0].id]);
  return rows[0].id;
}

async function main() {
  const devCode = `dev-m58${sfx}`;
  const old = await contact('旧', `dev-openid-m58${sfx}`, `https://abc123.public.blob.vercel-storage.com/test/${sfx}-a.jpg`);
  const main1 = await contact('主', null, null);
  await updateMyCard(old, { company: `${P}公司`, title: '会长', intro: '简介', industry: 'real_estate', website: 'https://example.com', template: '90' });
  const before = await myCard(old);
  assert.equal(before.company, `${P}公司`);

  // ① ③
  const r = await mergeContacts(S, main1, old, P);
  const c1 = await myCard(main1);
  assert.equal(c1.company, `${P}公司`); assert.equal(c1.title, '会长'); assert.equal(c1.intro, '简介'); assert.equal(c1.website, 'https://example.com');
  assert.equal(c1.template, '90', '主档案名片没编辑过：模板也跟过来');
  assert.ok(c1.avatarUrl, '头像跟过来');
  ok('合并后主档案名片带出旧档案内容（公司/职务/简介/网站/模板/头像）');
  const lg = await wechatLogin(devCode).catch(() => null);
  if (lg) { assert.equal(lg.contactId, main1); assert.equal((await myCard(lg.contactId)).company, `${P}公司`); ok('用旧档案的微信登录 → 落到主档案、名片完整'); }
  else console.log('  - 跳过微信登录（这台环境没开 dev 登录）');

  // ④ ⑤
  await updateMyCard(main1, { title: '名誉会长' });
  await undoMerge(S, r.mergeId);
  const c2 = await myCard(main1);
  assert.equal(c2.company, null, '撤销：补过去的公司撤回');
  assert.equal(c2.title, '名誉会长', '撤销：本人后来改过的职务不撤');
  const { rows: av } = await pool.query<{ a: string | null }>(`SELECT avatar_url a FROM contacts WHERE id = $1`, [main1]);
  assert.equal(av[0].a, null, '撤销：头像撤回');
  ok('合并后改名片照常；撤销合并只撤补过去且没再改过的格子');
  assert.equal((await myCard(old)).company, `${P}公司`); ok('旧档案那份原样留着');

  // ② 主档案已经填了的不被覆盖（东哥今天重填的情形）
  await updateMyCard(main1, { company: '今天填的公司' });
  const r2 = await mergeContacts(S, main1, old, P);
  const c3 = await myCard(main1);
  assert.equal(c3.company, '今天填的公司'); assert.equal(c3.title, '名誉会长'); assert.equal(c3.intro, '简介'); assert.equal(c3.website, 'https://example.com');
  ok('主档案已经填了的（今天重填的）不覆盖，只补空着的');
  await undoMerge(S, r2.mergeId);
}

main()
  .then(() => console.log(`\n通过 ${passed} 项`))
  .catch((e) => { console.error('失败：', e); process.exitCode = 1; })
  .finally(async () => {
    await pool.query(`DELETE FROM contact_merges WHERE kept_id = ANY($1::uuid[]) OR merged_id = ANY($1::uuid[])`, [ids]);
    await pool.query(`DELETE FROM crm_audit_log WHERE target_id = ANY($1::text[])`, [ids]);
    await pool.query(`DELETE FROM sessions WHERE contact_id = ANY($1::uuid[])`, [ids]);
    await pool.query(`DELETE FROM member_cards WHERE contact_id = ANY($1::uuid[])`, [ids]);
    await pool.query(`UPDATE contacts SET merged_into = NULL WHERE id = ANY($1::uuid[])`, [ids]);
    await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[])`, [ids]);
    await pool.end();
  });
