/**
 * 名片模板库（105 款）—— 回归测试（测试库；只建 DEVTPL- 数据，按 ID 清理；改过的配置项测完还原）。
 * 用法：DATABASE_URL=<测试库> npx tsx scripts/crm-cardtpl-tests.ts --i-know-this-is-not-production [--http https://sarec-crm-preview.vercel.app]
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
const made = { c: [] as string[] };
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };
const httpBase = (() => { const i = process.argv.indexOf('--http'); return i > 0 ? process.argv[i + 1] : null; })();
let prevBatches: unknown = undefined;

async function person(name: string) {
  const { rows } = await pool.query<{ id: string }>(`INSERT INTO contacts (name, email, acquisition_source) VALUES ($1, $2, 'test') RETURNING id`, [name, `devtpl-${sfx}-${made.c.length}@example.com`]);
  made.c.push(rows[0].id);
  return rows[0].id;
}
// 设计稿里的示例资料：真实名片上一个字都不能出现（用别的资料出图时）
const SAMPLE_WORDS = ['王东', '王 东', 'Andy', 'ANDY WANG', '949 787', '逍遥', 'sinoamericanrec', '创始人', 'Founder', '副会长', '中美房地产商会', 'Sino-American', '®', '注册用户', '行业'];

async function main() {
  const { renderTpl } = await import('@/lib/cardtpl/engine');
  const { cardView } = await import('@/lib/cardtpl/view');
  const reg = await import('@/lib/cardtpl/registry');
  const { cardHtml } = await import('@/lib/cardtpl/render');
  const cards = await import('@/lib/crm/cards');

  // 1. 模板引擎
  assert.equal(renderTpl('<b>{{a}}</b>{{#b}}有{{b}}{{/b}}{{^b}}无{{/b}}', { a: '<x>', b: '' }), '<b>&lt;x&gt;</b>无');
  assert.equal(renderTpl('{{#l}}[{{k}}{{v}}]{{/l}}', { l: [{ k: 1, v: 2 }, { k: 3, v: 4 }] }), '[12][34]');
  assert.equal(renderTpl('{{{h}}}', { h: '<i>S</i>' }), '<i>S</i>');
  assert.throws(() => renderTpl('{{#a}}x', {}), /unclosed/);
  ok('模板引擎：转义、有值/没值段落、列表、原样插入、未闭合报错');

  // 2. 目录：105 款，编号与设计稿一致，分两批（第一批 67–105 共 39 款）
  assert.equal(reg.ALL_TEMPLATES.length, 105);
  assert.deepEqual(reg.ALL_TEMPLATES.map((t) => t.id).sort((a, b) => a - b), Array.from({ length: 105 }, (_, i) => i + 1));
  assert.equal(reg.releasedTemplates(1).length, 39);
  assert.ok(reg.releasedTemplates(1).every((t) => t.id >= 67));
  assert.deepEqual(reg.catalog(1).map((g) => g.cat), ['商务精选', '商务经典']);
  assert.deepEqual(reg.catalog(2).map((g) => g.cat), ['商务精选', '商务经典', '设计经典', '大胆款', '第一批']);
  assert.equal(reg.findTemplate('navy')!.id, 90);
  assert.equal(reg.findTemplate('t054')!.id, 54);
  assert.equal(reg.findTemplate('106'), null);
  ok('目录：105 款编号 1–105；第一批 39 款（67–105）；分类顺序；旧模板名对到新编号');

  // 3. 每一款：填别人的资料后，设计稿里的示例资料一个字都不剩；非会员没有等级字样；没填的不占位
  const other = cardView({ name: '李四', nameEn: 'Si Li', title: '经理', company: '测试置业', phone: '626 000 0000', email: 'li@example.com' }, 'data:image/png;base64,AA==');
  const bare = cardView({ name: '张三' }, null);
  for (const t of reg.ALL_TEMPLATES) {
    for (const v of [other, bare]) {
      const html = cardHtml(t, v);
      const body = html.slice(html.indexOf('<div id="stage">'));
      const left = SAMPLE_WORDS.filter((w) => body.includes(w));
      assert.deepEqual(left, [], `${t.id} ${t.name} 残留示例资料：${left.join('、')}`);
      assert.ok(!/SAREC (会员|副会长|理事)/.test(body), `${t.id} 非会员出现了等级`);
      assert.ok([v.name, v.nameSp, v.nameWide].some((n) => body.includes(n)), `${t.id} 没有姓名`);
    }
    const htmlBare = cardHtml(t, bare);
    assert.ok(!htmlBare.includes('626 000') && !htmlBare.includes('li@example.com'), `${t.id} 空资料出现了别人的联系方式`);
  }
  ok('105 款逐一检查：换成别人的资料后不残留设计稿示例（姓名、电话、商会名、®、注册用户、行业）；非会员无等级字样');

  const member = cardView({ name: '李四', tierName: '常务副会长' }, null);
  assert.equal(member.tier, 'SAREC 常务副会长');
  assert.ok(cardHtml(reg.findTemplate(104)!, member).includes('SAREC 常务副会长'));
  ok('会员：右上角等级徽标“SAREC 常务副会长”');

  // 4. 名片资料：模板编号、地址、logo；未上线批次不能选；旧模板名仍可用（1.3.1）
  prevBatches = (await pool.query(`SELECT value FROM crm_settings WHERE key = 'card_tpl_batches'`)).rows[0]?.value;
  await pool.query(`DELETE FROM crm_settings WHERE key = 'card_tpl_batches'`);
  const a = await person('DEVTPL-甲');
  await cards.myCard(a);
  assert.equal((await cards.updateMyCard(a, { template: '104' })).template, '104');
  assert.equal((await cards.updateMyCard(a, { template: 't090' })).template, '90');
  await assert.rejects(cards.updateMyCard(a, { template: '54' }), /请选择名片模板/);
  assert.equal((await cards.updateMyCard(a, { template: 'white' })).template, 'white');
  await cards.updateMyCard(a, { template: '67' });
  await pool.query(`INSERT INTO crm_settings (key, value, updated_by) VALUES ('card_tpl_batches', '2', 'devtpl-test')`);
  assert.equal((await cards.updateMyCard(a, { template: '54' })).template, '54');
  ok('选模板：第一批可选、第二批开放前不能选、开放后可选；旧名字仍接受（旧版小程序）');

  const up = await cards.updateMyCard(a, { address: '美国加州尔湾', titleEn: 'Manager', companyEn: 'DEVTPL Realty', company: 'DEVTPL 置业' });
  assert.equal(up.address, '美国加州尔湾');
  assert.equal(up.showAddress, true);
  assert.equal(up.tierName, null);
  await assert.rejects(cards.updateMyCard(a, { logoUrl: 'https://evil.example.com/x.png' }), /logo/);
  const pub = await cards.publicCard(up.token);
  assert.equal(pub.address, '美国加州尔湾');
  assert.equal(pub.tierName, null);
  await cards.updateMyCard(a, { showAddress: false });
  assert.equal((await cards.publicCard(up.token)).address, null);
  ok('地址可填、默认公开，关掉后对方看不到；logo 只能用本站上传的地址；非会员 tierName 为空');

  // 5. 接口（可选）：测试站出图、目录
  if (httpBase) {
    const cat = await (await fetch(`${httpBase}/api/v1/cards/templates`)).json();
    assert.ok(cat.ok && Array.isArray(cat.groups) && cat.groups.length >= 2);
    for (const q of ['tpl=104', 'tpl=navy', 'tpl=90&fmt=share', 'tpl=67&thumb=1']) {
      const r: Response = await fetch(`${httpBase}/api/v1/cards/${up.token}/image?${q}`);
      assert.equal(r.status, 200, q);
      assert.match(r.headers.get('content-type') || '', /^image\/(png|jpeg)/, q);
      assert.ok((await r.arrayBuffer()).byteLength > 5000, q);
    }
    assert.equal((await fetch(`${httpBase}/api/v1/cards/zzzz/image`)).status, 404);
    ok(`测试站：目录接口、出图（编号 / 旧名字 / 转发 5:4 / 小图）都正常；坏 token 404`);
  }
  console.log(`\n全部通过：${passed} 项`);
}
async function cleanup() {
  if (prevBatches === undefined) await pool.query(`DELETE FROM crm_settings WHERE key = 'card_tpl_batches'`);
  else await pool.query(`UPDATE crm_settings SET value = $1 WHERE key = 'card_tpl_batches'`, [JSON.stringify(prevBatches)]);
  await pool.query(`DELETE FROM points_ledger WHERE contact_id = ANY($1::uuid[])`, [made.c]);
  await pool.query(`DELETE FROM profile_answers WHERE contact_id = ANY($1::uuid[])`, [made.c]);
  await pool.query(`DELETE FROM member_cards WHERE contact_id = ANY($1::uuid[])`, [made.c]);
  await pool.query(`DELETE FROM contact_methods WHERE contact_id = ANY($1::uuid[])`, [made.c]);
  await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[])`, [made.c]);
  console.log('清理完成');
}
main()
  .catch((e) => { console.error('✗ 失败：', e); process.exitCode = 1; })
  .finally(async () => { await cleanup().catch((e) => console.error('清理出错', e)); await pool.end(); });
