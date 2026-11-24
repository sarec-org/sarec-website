/**
 * 指令 56：删掉的照片不再挡同一张重传；一次删好几张。测试库＋测试前缀 Blob（test/），跑完按 ID / 地址删。
 * 用法：DATABASE_URL=<测试库> BLOB_READ_WRITE_TOKEN=<预览的> pnpm dlx tsx scripts/photo56-tests.ts --i-know-this-is-not-production
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { del } from '@vercel/blob';
import { getPool } from '@/lib/db/client';
import * as gate from '@/lib/crm/imageGate';
import { deleteMyPhoto, listMyPhotos, uploadMyPhoto } from '@/lib/crm/customerPhotos';
import { POST as batchDelete } from '@/app/api/v1/me/photos/delete/route';
import { guardNotProduction } from './_guard';

guardNotProduction();
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const P = `验收十一-${sfx}`;
const cids: string[] = []; let evId = ''; const urls: string[] = [];
let passed = 0; const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };
const jpg = (r: number, g: number, b: number) => sharp({ create: { width: 64, height: 48, channels: 3, background: { r, g, b } } }).jpeg().toBuffer();

async function main() {
  gate.__setForTest(async () => `trace-${sfx}-${Date.now()}`, () => true);
  const slug = `ys11-${sfx}`;
  const e = await pool.query<{ id: string }>(`INSERT INTO events (slug, title, starts_at, ends_at, event_status, is_listed) VALUES ($1, $2, now() - interval '1 hour', now() + interval '2 hours', 'scheduled', false) RETURNING id`, [slug, `${P}活动`]);
  evId = e.rows[0].id;
  const c = await pool.query<{ id: string }>(`INSERT INTO contacts (name, wechat_openid) VALUES ($1, $2) RETURNING id`, [`${P}-传图的人`, `o56${sfx}`]);
  const me = c.rows[0].id; cids.push(me);
  await pool.query(`INSERT INTO registrations (event_id, contact_id, status) VALUES ($1, $2, 'registered')`, [evId, me]);
  const img = await jpg(200, 30, 30);

  const p1 = await uploadMyPhoto(me, slug, img, { toAlbum: true }); urls.push(p1.url, p1.thumb);
  assert.ok(!p1.duplicate);
  const again = await uploadMyPhoto(me, slug, img, { toAlbum: true });
  assert.equal(again.duplicate, true, '还在的照片再传：提示已经传过了'); ok('还在的同一张再传：照旧提示"已经传过了"');

  await deleteMyPhoto(me, p1.id);
  const p2 = await uploadMyPhoto(me, slug, img, { toAlbum: true }); urls.push(p2.url, p2.thumb);
  assert.ok(!p2.duplicate, '删了以后能重传'); assert.notEqual(p2.id, p1.id); assert.ok(p2.checking, '重传的照样过微信检测');
  ok('删了以后同一张能重传（当新照片存、照样过检测）');

  // 以前删掉的（指纹还在）——模拟东哥现在被挡的情况
  const img2 = await jpg(30, 200, 30);
  const p3 = await uploadMyPhoto(me, slug, img2, { toAlbum: true }); urls.push(p3.url, p3.thumb);
  await pool.query(`UPDATE event_photos SET is_hidden = true, visibility = 'private' WHERE id = $1`, [p3.id]); // 老办法删的：指纹没清
  const p4 = await uploadMyPhoto(me, slug, img2, { toAlbum: true }); urls.push(p4.url, p4.thumb);
  assert.ok(!p4.duplicate); ok('修复前删掉的（指纹还在）也能马上重传');

  // 微信判不通过撤下的：照旧挡
  const img3 = await jpg(30, 30, 200);
  const p5 = await uploadMyPhoto(me, slug, img3, { toAlbum: true }); urls.push(p5.url, p5.thumb);
  await pool.query(`UPDATE event_photos SET is_hidden = true, review_status = 'rejected' WHERE id = $1`, [p5.id]);
  const p6 = await uploadMyPhoto(me, slug, img3, { toAlbum: true });
  assert.equal(p6.duplicate, true); ok('微信判不通过撤下的同一张：照旧挡');

  // 一次删好几张
  const tokRow = await pool.query<{ t: string }>(`SELECT 1 AS t`); void tokRow;
  const before = (await listMyPhotos(me, slug)).length;
  const { createSession } = await import('@/lib/crm/auth');
  const token = await createSession(pool as never, me, 'miniprogram');
  const r = await batchDelete(new Request('https://x/api/v1/me/photos/delete', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [p2.id, p4.id, '00000000-0000-0000-0000-000000000000'] }) }));
  const j = await r.json(); const d = j.data ?? j;
  assert.equal(d.deleted, 2); assert.equal(d.failed.length, 1);
  assert.equal((await listMyPhotos(me, slug)).length, before - 2);
  ok('一次删好几张：自己的 2 张删掉，不是自己的那个编号删不了');
  console.log(`\n全部通过：${passed} 项`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(async () => {
  await pool.query(`DELETE FROM ugc_actions WHERE note LIKE $1`, [`trace-${sfx}%`]);
  await pool.query(`DELETE FROM image_checks WHERE contact_id = ANY($1::uuid[])`, [cids]);
  await pool.query(`DELETE FROM event_photos WHERE event_id = $1`, [evId]);
  await pool.query(`DELETE FROM registrations WHERE event_id = $1`, [evId]);
  await pool.query(`DELETE FROM sessions WHERE contact_id = ANY($1::uuid[])`, [cids]);
  await pool.query(`DELETE FROM events WHERE id = $1`, [evId]);
  await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[])`, [cids]);
  const real = urls.filter((u) => u && u.includes('/test/'));
  if (real.length) await del(real).catch((e) => console.error('删 Blob 出错', e.message));
  console.log(`清理：活动、照片、身份已删；测试图 ${real.length} 个已删`); await pool.end();
});
