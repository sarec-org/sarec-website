/**
 * 1.3.3 回归测试（测试库；只建 DEV133- 数据，按 ID 清理）：官方海报、上传主视觉、AI 标识、邀请海报服务器出图、商会资料、术语速查、敏感词提醒。
 * 用法：DATABASE_URL=<测试库> BLOB_READ_WRITE_TOKEN=<存储> npx tsx scripts/crm-133-tests.ts --i-know-this-is-not-production [--http https://sarec-crm-preview.vercel.app] [--pdf <小 PDF 路径>]
 */
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { getPool } from '@/lib/db/client';
import { guardNotProduction } from './_guard';
guardNotProduction();
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const made = { c: [] as string[], e: [] as string[], d: [] as string[] };
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };
const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const httpBase = arg('--http');

async function person(name: string, member = false) {
  const email = `dev133-${sfx}-${made.c.length}@example.com`;
  const { rows } = await pool.query<{ id: string }>(`INSERT INTO contacts (name, email, email_verified_at, acquisition_source) VALUES ($1, $2, now(), 'test') RETURNING id`, [name, email]);
  made.c.push(rows[0].id);
  void member;
  return { id: rows[0].id, email };
}

async function main() {
  const svc = await import('@/lib/poster/service');
  const { createEvent } = await import('@/lib/crm/staff');
  const { createSession } = await import('@/lib/crm/auth');
  const docs = await import('@/lib/docs/service');
  const { glossaryForMp } = await import('@/lib/tools/glossary');

  const st = await person('DEV133-管理员');
  await pool.query(`INSERT INTO staff_roles (email, name, roles) VALUES ($1, 'DEV133', '{admin}')`, [st.email]);
  const admin = { contactId: st.id, email: st.email, name: 'DEV133', roles: ['admin'] as 'admin'[] };
  const ev = await createEvent(admin, { title: `DEV133-Cybercab 来了 ${sfx}`, startsAt: new Date(Date.now() + 5 * 86400_000).toISOString(), listed: false, locationName: '商会会议室', address: '500 S Hacienda Blvd, City of Industry, CA 91745' });
  made.e.push(ev.id);
  await pool.query(`UPDATE events SET cover_url = 'https://example.com/old-cover.jpg' WHERE id = $1`, [ev.id]);

  // 1. 上传自己的图当主视觉：不花钱、不占上限；勾“非 AI”的不加标识
  const img = await sharp({ create: { width: 1024, height: 1536, channels: 3, background: '#3a6ea5' } }).composite([{ input: await sharp({ create: { width: 500, height: 260, channels: 3, background: '#d9c38a' } }).png().toBuffer(), left: 262, top: 560 }]).jpeg().toBuffer();
  let s = await svc.uploadMainImage(admin, ev.id, img, false);
  const up = s.gens.find((g) => g.provider === 'upload')!;
  assert.ok(up && up.ai === false && up.cost_usd === 0);
  assert.equal(s.used, 0, '上传的不占上限');
  assert.equal(s.poster!.gen_id, up.id, '上传后自动选中');
  const plain = await svc.renderPoster(ev.id, 'tall');
  assert.equal(plain.png.includes(Buffer.from('AIGC')), false, '非 AI 图不写 AI 标识');
  s = await svc.uploadMainImage(admin, ev.id, img, true);
  const aiUp = s.gens.find((g) => g.provider === 'upload' && g.ai)!;
  const marked = await svc.renderPoster(ev.id, 'tall');
  assert.ok(marked.png.includes(Buffer.from('tEXtAIGC')), 'AI 图 PNG 里有 AIGC 隐式标识');
  await assert.rejects(svc.uploadMainImage(admin, ev.id, await sharp({ create: { width: 200, height: 200, channels: 3, background: '#000' } }).jpeg().toBuffer(), true), /太小/);
  ok('上传自己的图：不花钱、不占每场上限、自动选中；勾 AI 的成品写入 AIGC 隐式标识，不勾的不写；太小的图拦下');

  // 2. 官方海报：设了 → 封面换成主视觉横版（AI 图带标识），取消 → 封面恢复
  await svc.savePoster(admin, ev.id, { genId: aiUp.id, texts: { filmTitle: '无人之境', filmSubtitle: '车位觉醒', titleEn: 'THE DRIVERLESS LANDLORD', bigDate: '11.13' } });
  s = await svc.setOfficial(admin, ev.id, true);
  assert.equal(s.official?.genId, aiUp.id);
  const cover1 = (await pool.query(`SELECT cover_url FROM events WHERE id = $1`, [ev.id])).rows[0].cover_url as string;
  assert.ok(/public\.blob\.vercel-storage\.com\/test\/cover\/official-/.test(cover1), cover1);
  const coverImg = Buffer.from(await (await fetch(cover1)).arrayBuffer());
  const cm = await sharp(coverImg).metadata();
  assert.equal(cm.width, 1600);
  assert.equal(cm.height, 860);
  s = await svc.setCoverPos(admin, ev.id, 0.2);
  const cover2 = (await pool.query(`SELECT cover_url FROM events WHERE id = $1`, [ev.id])).rows[0].cover_url as string;
  assert.notEqual(cover2, cover1, '改取景位置后封面重出');
  for (const [size, w, h] of [['tall', 1080, 1620], ['square', 1080, 1080], ['oa', 900, 383]] as const) {
    const r = await svc.renderOfficial(ev.id, size);
    const m = await sharp(r!.png).metadata();
    assert.equal(m.width, w);
    assert.equal(m.height, h);
    assert.ok(r!.png.includes(Buffer.from('tEXtAIGC')));
  }
  const v1 = await svc.officialVersion(ev.id);
  assert.ok(v1);
  ok('官方海报：设了以后封面自动换成主视觉横版（1600×860，可调取景位置并重出）；三个尺寸都用官方海报出图并带 AI 标识');

  // 3. 邀请海报（服务器出图）：有官方海报时出图；第二次走缓存；没有官方海报时 posterData.official 为空
  const me = await person('DEV133-邀请人');
  const { inviteVersion, invitePosterImage } = await import('@/lib/crm/invitePoster');
  const { posterData } = await import('@/lib/crm/cards');
  const pd = await posterData(me.id, ev.slug, 'https://sarec-crm-preview.vercel.app');
  assert.ok(pd.official && pd.official.version && pd.official.imageUrl.endsWith(`/api/v1/poster/${encodeURIComponent(ev.slug)}/image`));
  const first = await invitePosterImage(me.id, ev.slug);
  const fm = await sharp(first.jpg).metadata();
  assert.equal(fm.width, 1080);
  assert.equal(fm.height, 1620);
  assert.equal(first.cached, false);
  const second = await invitePosterImage(me.id, ev.slug);
  assert.equal(second.cached, true, '第二次走缓存');
  assert.equal(second.version, first.version);
  assert.equal(await inviteVersion(me.id, ev.slug), first.version);
  await svc.setOfficial(admin, ev.id, false);
  const back = (await pool.query(`SELECT cover_url FROM events WHERE id = $1`, [ev.id])).rows[0].cover_url;
  assert.equal(back, 'https://example.com/old-cover.jpg', '取消官方海报后封面恢复');
  assert.equal((await posterData(me.id, ev.slug, 'https://x')).official, null, '没有官方海报时小程序退回原样式');
  await assert.rejects(invitePosterImage(me.id, ev.slug), /还没有官方海报/);
  await svc.setOfficial(admin, ev.id, true);
  ok('邀请海报服务器出图：1080×1620；第二次直接用缓存；取消官方海报后封面恢复、小程序退回原样式');

  if (httpBase) {
    const token = await createSession(pool, me.id, 'miniprogram');
    const r: Response = await fetch(`${httpBase}/api/v1/poster/${encodeURIComponent(ev.slug)}/image`, { headers: { Authorization: `Bearer ${token}`, 'X-Sarec-Client': 'mp-1.3.3' } });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'image/jpeg');
    assert.ok((await r.arrayBuffer()).byteLength > 50_000);
    const j = await (await fetch(`${httpBase}/api/v1/poster/${encodeURIComponent(ev.slug)}`, { headers: { Authorization: `Bearer ${token}`, 'X-Sarec-Client': 'mp-1.3.3' } })).json();
    assert.ok(j.official?.version);
    assert.equal((await fetch(`${httpBase}/api/v1/poster/${encodeURIComponent(ev.slug)}/image`)).status, 401, '不登录取不到');
    ok('测试站：邀请海报接口带登录头返回 JPEG；素材接口带 official；不登录 401');
  }

  // 4. 商会资料：新建 → 一组图片当页面 → 公开 → 列表 / 单份 / 记次数；PDF 逐页转图 + 红线字样
  const d1 = await docs.saveDoc(admin, null, { slug: `dev133-${sfx}`, title: 'DEV133 商会介绍', summary: '测试用' });
  made.d.push(d1.id);
  await assert.rejects(docs.saveDoc(admin, d1.id, { title: 'DEV133 商会介绍', isPublic: true }), /先上传/);
  const pageImg = await sharp({ create: { width: 2667, height: 1500, channels: 3, background: '#1c2f4a' } }).jpeg().toBuffer();
  let d = await docs.setImagePages(d1.id, [pageImg, pageImg, pageImg]);
  assert.equal(d.pages.length, 3);
  assert.equal(d.text_readable, false);
  d = await docs.saveDoc(admin, d1.id, { title: 'DEV133 商会介绍', summary: '测试用', isPublic: true, sortOrder: -99 });
  const list = await docs.listPublic('https://x');
  assert.ok(list.some((x) => x.slug === d1.slug && x.pageCount === 3));
  const one = await docs.getPublic(d1.slug, 'https://x');
  assert.equal(one.pages.length, 3);
  await docs.track(d1.slug, 'open', { ref: '123', channel: 'share' });
  await docs.track(d1.slug, 'share', { contactId: me.id });
  await docs.track(d1.slug, 'pdf', {});
  const counts = (await pool.query(`SELECT open_count, share_count, pdf_count FROM chamber_docs WHERE id = $1`, [d1.id])).rows[0];
  assert.deepEqual(counts, { open_count: 1, share_count: 1, pdf_count: 1 });
  const evs = (await pool.query(`SELECT kind, ref FROM chamber_doc_events WHERE doc_id = $1 ORDER BY id`, [d1.id])).rows;
  assert.deepEqual(evs[0], { kind: 'open', ref: '123' });
  assert.deepEqual(docs.redWords('年费 US$500，年化收益率 8%'), ['$', '会费', '收益率']);
  assert.deepEqual(docs.redWords('连接中美房地产产业资源'), []);
  assert.equal(docs.siteFileUrl('https://abc123.public.blob.vercel-storage.com/test/docs/x/a.pdf', 'https://sinoamericanrec.org'), 'https://sinoamericanrec.org/files/test/docs/x/a.pdf');
  const pdfPath = arg('--pdf');
  if (pdfPath) {
    const pd2 = await docs.processPdf(d1.id, await readFile(pdfPath), null);
    assert.ok(pd2.pages.length > 0 && pd2.pages[0].w >= 2000, `PDF 转图 ${pd2.pages.length} 页，宽 ${pd2.pages[0]?.w}`);
    console.log(`    （PDF 逐页转图 ${pd2.pages.length} 页，宽 ${pd2.pages[0].w}，读得到字：${pd2.text_readable}，红线页 ${JSON.stringify(pd2.red_flags)}）`);
  }
  ok('商会资料：新建、页面、公开（没页面不能公开）、列表 / 单份、打开 / 转发 / 看 PDF 次数（带推荐人）；红线字样识别；PDF 地址走本站 /files/' + (pdfPath ? '；PDF 逐页转图' : ''));

  if (httpBase) {
    const l = await (await fetch(`${httpBase}/api/v1/docs`)).json();
    assert.ok(l.ok && l.docs.some((x: { slug: string }) => x.slug === d1.slug));
    const g = await (await fetch(`${httpBase}/api/v1/glossary`)).json();
    assert.equal(g.terms.length, 100);
    const t: Response = await fetch(`${httpBase}/api/v1/docs/${d1.slug}/track`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'open' }) });
    assert.equal(t.status, 200);
    ok('测试站：资料列表、术语速查（100 条）、记次数接口都通；不用登录');
  }

  // 5. 术语速查（小程序版）与敏感词提醒
  const g = glossaryForMp();
  assert.equal(g.terms.length, 100);
  assert.ok(g.terms.every((x) => !/[0-9%$]/.test(x.dz + x.de)));
  const { summaryWarn } = await import('@/lib/crm/mpSensitive');
  assert.equal(summaryWarn('周五德州扑克之夜，现金奖励'), '德州扑克、现金');
  assert.equal(summaryWarn('Cybercab 来了，谁来做无人车的房东？'), '');
  ok('术语速查 100 条无金额 / 利率数字；一句话介绍敏感词提醒（德州扑克、现金…）');
  void randomUUID;
  console.log(`\n全部通过：${passed} 项`);
}
async function cleanup() {
  for (const t of ['poster_gens', 'event_posters', 'event_prep_items', 'event_prep', 'registrations']) await pool.query(`DELETE FROM ${t} WHERE event_id = ANY($1::uuid[])`, [made.e]).catch(() => undefined);
  await pool.query(`DELETE FROM crm_audit_log WHERE target_id = ANY($1::text[]) OR actor LIKE '%DEV133%'`, [made.e]).catch(() => undefined);
  await pool.query(`DELETE FROM events WHERE id = ANY($1::uuid[])`, [made.e]);
  await pool.query(`DELETE FROM chamber_docs WHERE id = ANY($1::uuid[])`, [made.d]);
  await pool.query(`DELETE FROM sessions WHERE contact_id = ANY($1::uuid[])`, [made.c]);
  await pool.query(`DELETE FROM staff_roles WHERE email LIKE $1`, [`dev133-${sfx}-%`]);
  for (const t of ['member_cards', 'points_ledger', 'profile_answers', 'contact_methods']) await pool.query(`DELETE FROM ${t} WHERE contact_id = ANY($1::uuid[])`, [made.c]).catch(() => undefined);
  await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[])`, [made.c]);
  const left = (await pool.query(`SELECT (SELECT count(*) FROM events WHERE id = ANY($1::uuid[]))::int + (SELECT count(*) FROM contacts WHERE id = ANY($2::uuid[]))::int + (SELECT count(*) FROM chamber_docs WHERE id = ANY($3::uuid[]))::int AS n`, [made.e, made.c, made.d])).rows[0].n;
  console.log(`清理完成（剩余测试数据 ${left}）`);
}
main()
  .catch((e) => { console.error('✗ 失败：', e); process.exitCode = 1; })
  .finally(async () => { await cleanup().catch((e) => console.error('清理出错', e)); await pool.end(); });
