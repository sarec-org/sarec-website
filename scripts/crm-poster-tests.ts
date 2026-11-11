/**
 * AI 海报（东哥 11/10）—— 回归测试（测试库）。画图用占位图（不调外部服务、不花钱），不配 Blob（图存成 data URI）。
 * 只建 DEV-POSTER- 数据，按 ID 清理。
 * 用法：DATABASE_URL=<测试库> pnpm dlx tsx scripts/crm-poster-tests.ts --i-know-this-is-not-production
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { getPool } from '@/lib/db/client';
import { guardNotProduction } from './_guard';
guardNotProduction();
// 测试只用占位图、不上传：清掉可能带进来的画图 / 存储 / 微信配置
for (const k of ['POSTER_IMAGE_PROVIDER', 'POSTER_TEXT_PROVIDER', 'BLOB_READ_WRITE_TOKEN', 'WX_APPID', 'WX_SECRET', 'CLOUDFLARE_AI_TOKEN', 'GEMINI_API_KEY', 'AI_GATEWAY_API_KEY', 'VERCEL_OIDC_TOKEN']) delete process.env[k];
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const made = { e: [] as string[] };
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };

async function main() {
  const { buildPrompt, scrubBrands, SAFETY, STYLES, EVENT_TYPES } = await import('@/lib/poster/styles');
  const { parseIdeas } = await import('@/lib/poster/copy');
  const { fitSize } = await import('@/lib/poster/compose');
  const { imageProvider } = await import('@/lib/poster/providers');
  const svc = await import('@/lib/poster/service');
  const { createEvent } = await import('@/lib/crm/staff');
  const admin = { contactId: '00000000-0000-0000-0000-000000000000', email: 'dev-poster-admin@example.com', name: 'DEV-POSTER-管理员', roles: ['admin'] as 'admin'[] };

  // 1. 指令：每条都带红线和构图；品牌、车型被去掉
  assert.equal(EVENT_TYPES.length, 13);
  assert.equal(STYLES.filter((s) => s.group === 'film').length, 9);
  assert.equal(STYLES.filter((s) => s.group === 'ai').length, 8);
  for (const st of STYLES) {
    const p = buildPrompt({ type: 'lecture', style: st.key, subject: 'Tesla Cybercab robotaxi 特斯拉' });
    assert.ok(p.includes(SAFETY), st.key);
    assert.ok(/no text/i.test(p) && /2:3/.test(p) && /lower 40 percent/.test(p), st.key);
    assert.ok(!/tesla|cybercab|特斯拉/i.test(p), st.key);
  }
  assert.equal(scrubBrands('a Waymo and a BMW'), 'a generic and a generic');
  assert.ok(buildPrompt({ type: 'golf', style: 'sports' }).includes('flagstick'));
  ok('18 个风格 × 13 类活动拼指令：都带“不出现文字 / 真人 / 品牌车标”和“中下部留暗区”；品牌名自动去掉');

  // 2. 文案解析、禁用字样、标题自动缩字
  const ideas = parseIdeas('好的：{"ideas":[{"title":"《无人之境》","tagline":"这条路上，没有司机"},{"title":"x","tagline":"太短"},{"title":"车位革命","tagline":"下一个房客，没有驾照"}]}');
  assert.deepEqual(ideas, [{ title: '无人之境', tagline: '这条路上，没有司机' }, { title: '车位革命', tagline: '下一个房客，没有驾照' }]);
  assert.equal(parseIdeas('不是 JSON').length, 0);
  assert.ok(svc.forbidden('入场免费'));
  assert.ok(svc.forbidden('仅需 $20'));
  assert.ok(svc.forbidden('已报名 30 人'));
  assert.equal(svc.forbidden('这条路上，没有司机'), null);
  assert.ok(fitSize('无人之境', 900, 180) === 180);
  assert.ok(fitSize('谁来做无人车的房东谁来做无人车的房东', 900, 180) < 60);
  ok('文案 5 组解析（去书名号、过滤太短的）；价格 / 免费 / 报名人数拦下；长片名自动缩字');

  // 3. 没配画图服务 → 占位图，流程照样跑
  const ip = imageProvider();
  assert.equal(ip.p.key, 'placeholder');
  assert.ok(ip.note);
  process.env.POSTER_IMAGE_PROVIDER = 'cloudflare';
  assert.equal(imageProvider().p.key, 'placeholder');
  assert.match(imageProvider().note ?? '', /密钥还没填/);
  // 常见填错：整条 curl 测试命令粘贴进令牌 → 不调用、提示格式不对；报错信息里不出现令牌
  const fakeTok = `devtok_${'x'.repeat(30)}`;
  process.env.CLOUDFLARE_ACCOUNT_ID = '0123456789abcdef0123456789abcdef';
  process.env.CLOUDFLARE_AI_TOKEN = `curl "https://api.cloudflare.com/client/v4/user/tokens/verify" -H "Authorization: Bearer ${fakeTok}"`;
  assert.equal(imageProvider().p.key, 'placeholder');
  assert.match(imageProvider().note ?? '', /格式不对/);
  assert.ok(!(imageProvider().note ?? '').includes(fakeTok));
  const { redactSecrets } = await import('@/lib/poster/providers');
  const red = redactSecrets(`Headers.append: "Bearer curl ... Bearer ${fakeTok}" is invalid; cfut_abc123`);
  assert.ok(!red.includes(fakeTok) && !red.includes('cfut_abc123'), red);
  process.env.CLOUDFLARE_AI_TOKEN = fakeTok;
  assert.equal(imageProvider().p.key, 'cloudflare');
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  delete process.env.CLOUDFLARE_AI_TOKEN;
  delete process.env.POSTER_IMAGE_PROVIDER;
  ok('画图服务可切换：没配 / 密钥没到位时自动用占位图并说明原因');

  // 4. 生成一批 4 张、上限、选图、文案、出三种尺寸
  const ev = await createEvent(admin, { title: `DEV-POSTER-Cybercab 来了，谁来做无人车的房东？${sfx}`, startsAt: '2026-11-13T22:00:00.000Z', region: '洛杉矶/橙县', listed: false, locationName: '中美房地产商会 Office', address: '500 S Hacienda Blvd, City of Industry, CA 91745' });
  made.e.push(ev.id);
  let st = await svc.posterState(ev.id);
  assert.equal(st.cap, 12);
  assert.equal(st.used, 0);
  st = await svc.generateBatch(admin, ev.id, { type: 'lecture', style: 'road', subject: 'a sleek driverless electric robotaxi' });
  assert.equal(st.used, 4);
  const first = st.gens.filter((g) => g.kind === 'image');
  assert.equal(new Set(first.map((g) => g.batch_id)).size, 1);
  assert.ok(first.every((g) => g.provider === 'placeholder' && g.prompt.includes('robotaxi') && g.image_url));
  ok('一次出 4 张候选，每张记指令、服务商、花费');

  st = await svc.savePoster(admin, ev.id, { genId: first[0].id, filmTitle: '无人之境', tagline: '这条路上，没有司机', host: 'SAREC 中美房地产商会', speaker: '', coHost: '', imageCap: 5 });
  assert.equal(st.poster?.gen_id, first[0].id);
  assert.equal(st.poster?.style, 'road');
  assert.equal(st.cap, 5);
  st = await svc.generateBatch(admin, ev.id, { type: 'lecture', style: 'neural' });
  assert.equal(st.used, 5); // 剩 1 张额度，只出 1 张
  await assert.rejects(svc.generateBatch(admin, ev.id, { type: 'lecture', style: 'neural' }), /到上限了/);
  await assert.rejects(svc.savePoster(admin, ev.id, { filmTitle: '免费讲座' }), /不能出现价格/);
  await assert.rejects(svc.savePoster(admin, ev.id, { imageCap: 0 }), /1–100/);
  ok('每场上限可调（默认 12）：剩几张出几张，到上限拦下；选中一张记住风格；海报字样过滤');

  for (const [size, w, h] of [['tall', 1080, 1620], ['square', 1080, 1080], ['oa', 900, 383]] as const) {
    const { png } = await svc.renderPoster(ev.id, size);
    const m = await sharp(png).metadata();
    assert.equal(m.width, w);
    assert.equal(m.height, h);
  }
  const t = svc.posterText((await pool.query(`SELECT * FROM events WHERE id = $1`, [ev.id])).rows[0], st.poster);
  assert.equal(t.filmTitle, '无人之境');
  assert.equal(t.timeLine, '下午 1:30 签到 · 2:00 开始（洛杉矶时间）');
  assert.equal(t.credits.speaker, null);
  ok('叠字出图：竖版 1080×1620、方版 1080×1080、公众号头图 900×383；时间行“下午 1:30 签到 · 2:00 开始”；没填主讲不显示');

  const c = await svc.copyIdeas(admin, ev.id, 'lecture');
  assert.equal(c.ideas.length, 0);
  assert.ok(c.note);
  st = await svc.posterState(ev.id);
  assert.ok(st.gens.some((g) => g.kind === 'copy'));
  ok('没接文字模型：文案建议优雅跳过（提示手填），调用也记日志');

  console.log(`\n全部通过：${passed} 项`);
}
async function cleanup() {
  await pool.query(`DELETE FROM poster_gens WHERE event_id = ANY($1::uuid[])`, [made.e]).catch(() => undefined);
  await pool.query(`DELETE FROM event_posters WHERE event_id = ANY($1::uuid[])`, [made.e]).catch(() => undefined);
  await pool.query(`DELETE FROM crm_audit_log WHERE target_id = ANY($1::text[]) OR actor = 'staff:DEV-POSTER-管理员'`, [made.e]).catch(() => undefined);
  await pool.query(`DELETE FROM event_prep_items WHERE event_id = ANY($1::uuid[])`, [made.e]).catch(() => undefined);
  await pool.query(`DELETE FROM event_prep WHERE event_id = ANY($1::uuid[])`, [made.e]).catch(() => undefined);
  await pool.query(`DELETE FROM events WHERE id = ANY($1::uuid[])`, [made.e]);
  const left = (await pool.query(`SELECT count(*)::int n FROM events WHERE id = ANY($1::uuid[])`, [made.e])).rows[0].n;
  console.log(`清理完成（剩余测试活动 ${left}）`);
}
main()
  .catch((e) => { console.error('✗ 失败：', e); process.exitCode = 1; })
  .finally(async () => { await cleanup().catch((e) => console.error('清理出错', e)); await pool.end(); });
