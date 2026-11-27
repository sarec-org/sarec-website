#!/usr/bin/env node
/**
 * 活动第三批海报模板入库准备（指令 93-3③）：把 海报模板库/活动第三批/ 里过关的模板转成大图 / 小图、传 Vercel Blob，再生成导入数据。
 *
 *   node scripts/poster-templates-batch3.mjs [--env <含 BLOB_READ_WRITE_TOKEN 的 env 文件>] [--src <活动第三批目录>] [--out <输出目录>] [--dry]
 *
 * - 素材：<类目录>/<编号_名字>/底图.png（1024×1536）＋ 坐标.json（org.logo / org.bar / info×3 / qr，0–1 归一化）。`_作废/` 不要。
 *   「留空标题_*」三类（标题要用户自己填）现有模板表 / 出图接口表达不了，默认不入库（见 活动第三批入库.md）。
 * - 分类：按下面 MAP 挂到现有 44 类；对不上的建新分类（NEW_CATS）。一个目录里两种标题分属两个现有分类的，按款名前缀分开挂。
 * - code：e3-<目录简称>-<编号>（和已上线 474 张的 code 不会重名）；图片路径 poster-templates/<分类>/<code>_{t,l}_v1.jpg（版本 1）。
 *   传之前先 head：Blob 上已有这个路径就不重传（断点续传；e3- 前缀是新的，不会是别人的文件）。
 * - 大图 1080×1620、小图 300×450（JPEG），和已上线的一样。
 * - box：现有出图（1.7.0 / PR #116）只认一个信息位 [x0,y0,x1,y1]，这里填「三行信息条＋报名码位」的外框；
 *   主办方条、三行分别的位置、报名码位另存 event_templates_batch3_slots.json，等服务器支持「三处空条分别排字」后再用。
 * - sort：新图排在每个分类最前（-100 + 序号，旧图都是 ≥1），旧图顺序不动。
 * - 输出（默认 ~/.sarec/release171/）：event_templates_batch3.sql（正式库用，无 BEGIN/COMMIT，ON CONFLICT DO NOTHING，
 *   不列 purpose 列——0054 前后都能跑，0054 之后默认值就是 'event'）、event_templates_batch3_import.json、event_templates_batch3_slots.json、
 *   event_templates_batch3_map.csv。
 * - BLOB_READ_WRITE_TOKEN 只读进本进程，不打印、不写进任何输出。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { put, head } from '@vercel/blob';

const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const DRY = process.argv.includes('--dry');
const SRC = arg('--src', path.join(homedir(), 'WeChatProjects/海报模板库/活动第三批'));
const OUT = arg('--out', path.join(homedir(), '.sarec/release171'));
const ENV = arg('--env', '.env.local');
const STAGE = path.join(OUT, 'batch3_images');
const PROGRESS = path.join(OUT, 'event_templates_batch3_upload_progress.json');

/** 新建分类（tier 3，排在现有 44 类后面） */
const NEW_CATS = [
  { key: 'forum', name: '论坛·研讨会', tier: 3, sort: 45 },
  { key: 'signing', name: '签约仪式', tier: 3, sort: 46 },
  { key: 'hiking', name: '徒步', tier: 3, sort: 47 },
  { key: 'laba_xiaonian', name: '腊八·小年', tier: 3, sort: 48 }
];
/** 目录 → [简称, 分类 key 或 (款名前缀 → 分类 key)] */
const MAP = {
  BBQ: ['bbq', 'bbq'],
  OpenHouse看房团: ['openhouse', { 'OPEN HOUSE 开放日': 'open_house', 看房团: 'home_tour' }],
  下午茶: ['tea', 'afternoon_tea'],
  亲子日: ['family', 'family_day'],
  企业家圆桌: ['roundtable', 'roundtable'],
  发布会: ['launch', 'launch'],
  周五的会: ['friday', { 周五分享会: 'sharing', 会员交流会: 'mixer', '周五下午茶 · 分享与牌局': 'sharing' }],
  开业庆典: ['opening', 'grand_opening'],
  徒步: ['hiking', 'hiking'],
  招聘会: ['hiring', 'hiring'],
  掼蛋: ['guandan', 'guandan'],
  月度: ['monthly', 'monthly_meetup'],
  生日宴: ['birthday', 'birthday'],
  答谢年会晚宴: ['gala', { 答谢晚宴: 'appreciation', 年会盛典: 'gala', 会员联谊晚宴: 'gala' }],
  签约仪式: ['signing', 'signing'],
  聚餐酒会: ['dinner', { 会员聚餐: 'dinner', 交流酒会: 'mixer' }],
  讲座公开课: ['seminar', 'seminar'],
  论坛研讨: ['forum', 'forum'],
  高尔夫: ['golf', 'golf'],
  麻将: ['mahjong', 'mahjong'],
  七夕_活动: ['qixi', 'qixi'],
  万圣节_活动: ['halloween', 'halloween'],
  中秋_活动: ['midautumn', 'mid_autumn'],
  儿童节_活动: ['children', 'childrens_day'],
  冬至_活动: ['solstice', 'winter_solstice'],
  劳动节_活动: ['laborday', 'labor_day'],
  圣帕特里克节_活动: ['stpatrick', 'st_patricks'],
  复活节_活动: ['easter', 'easter'],
  妇女节_活动: ['womens', 'womens_day'],
  年前_活动: ['laba', 'laba_xiaonian'],
  情人节_活动: ['valentine', 'valentines'],
  母亲节_活动: ['mother', 'mothers_day'],
  父亲节_活动: ['father', 'fathers_day'],
  独立日_活动: ['july4', 'july4'],
  端午_活动: ['dragonboat', 'dragon_boat'],
  退伍军人节_活动: ['veterans', 'veterans_day'],
  重阳_活动: ['doubleninth', 'double_ninth'],
  阵亡将士纪念日_活动: ['memorial', 'memorial_day']
};
const BLANK = new Set(['留空标题_圆桌', '留空标题_讲座', '留空标题_论坛']);

function loadToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  if (!existsSync(ENV)) throw new Error(`找不到 ${ENV}（里面要有 BLOB_READ_WRITE_TOKEN）`);
  const line = readFileSync(ENV, 'utf8').split('\n').find((l) => l.startsWith('BLOB_READ_WRITE_TOKEN='));
  const v = line ? line.slice('BLOB_READ_WRITE_TOKEN='.length).trim().replace(/^"|"$/g, '') : '';
  if (!v.startsWith('vercel_blob_rw_')) throw new Error(`${ENV} 里没有可用的 BLOB_READ_WRITE_TOKEN`);
  return v;
}

const r4 = (x) => Math.round(x * 10000) / 10000;
const isBox = (b) => Array.isArray(b) && b.length === 4 && b.every((v) => typeof v === 'number' && v >= 0 && v <= 1) && b[0] < b[2] && b[1] < b[3];

// ── 扫目录 ──
const dirs = readdirSync(SRC).filter((d) => !d.startsWith('_') && !d.startsWith('.') && statSync(path.join(SRC, d)).isDirectory());
const skippedBlank = [];
const unknown = dirs.filter((d) => !MAP[d] && !BLANK.has(d));
if (unknown.length) throw new Error(`没配分类的目录：${unknown.join('、')}`);
const items = [];
for (const d of dirs.sort()) {
  const subs = readdirSync(path.join(SRC, d)).filter((s) => /^\d\d_/.test(s) && statSync(path.join(SRC, d, s)).isDirectory()).sort();
  if (BLANK.has(d)) {
    subs.forEach((s) => skippedBlank.push(`${d}/${s}`));
    continue;
  }
  const [slug, target] = MAP[d];
  for (const s of subs) {
    const dir = path.join(SRC, d, s);
    const c = JSON.parse(readFileSync(path.join(dir, '坐标.json'), 'utf8'));
    const nn = s.slice(0, 2);
    const name = String(c['款名'] || s.slice(3)).trim();
    const prefix = s.slice(3, s.lastIndexOf('·') > 3 ? s.lastIndexOf('·') : undefined).trim();
    const cat = typeof target === 'string' ? target : target[prefix];
    if (!cat) throw new Error(`${d}/${s}：款名前缀「${prefix}」没对上分类`);
    const boxes = [c.org?.logo, c.org?.bar, ...(c.info ?? []), c.qr];
    if (c.info?.length !== 3 || !boxes.every(isBox)) throw new Error(`${d}/${s}：坐标.json 缺 org / info×3 / qr 或坐标不对`);
    const info = c.info;
    const outer = [Math.min(info[0][0], c.qr[0]), Math.min(info[0][1], c.qr[1]), Math.max(info[0][2], c.qr[2]), Math.max(info[2][3], c.qr[3])].map(r4);
    if (!existsSync(path.join(dir, '底图.png'))) throw new Error(`缺底图：${dir}`);
    items.push({
      code: `e3-${slug}-${nn}`, dirName: d, sub: s, src: path.join(dir, '底图.png'), category_key: cat, name, box: outer,
      slots: { org_logo: c.org.logo, org_bar: c.org.bar, info: c.info, info_icons: c.info_icons ?? null, qr: c.qr, painted: c['画死的字'] ?? null }
    });
  }
}
const codes = new Set();
for (const it of items) {
  if (codes.has(it.code)) throw new Error(`code 重复：${it.code}`);
  codes.add(it.code);
}
// 每个分类内：新图按目录、编号排，sort = -100 + 序号（都比旧图的 ≥1 小）
const byCat = new Map();
for (const it of items) byCat.set(it.category_key, [...(byCat.get(it.category_key) ?? []), it]);
for (const list of byCat.values()) list.forEach((it, i) => (it.sort = -100 + i + 1));
console.log(`入库：${items.length} 张、${byCat.size} 个分类（新建 ${NEW_CATS.length} 个）；留空标题版不入：${skippedBlank.length} 张`);

// ── 出大图 / 小图 ──
mkdirSync(STAGE, { recursive: true });
const blobPath = (it, size) => `poster-templates/${it.category_key}/${it.code}_${size}_v1.jpg`;
for (const it of items) {
  it.large = path.join(STAGE, `${it.code}_l.jpg`);
  it.thumb = path.join(STAGE, `${it.code}_t.jpg`);
  if (!existsSync(it.large)) await sharp(it.src).resize(1080, 1620, { fit: 'fill' }).jpeg({ quality: 88, mozjpeg: true }).toFile(it.large);
  if (!existsSync(it.thumb)) await sharp(it.src).resize(300, 450, { fit: 'fill' }).jpeg({ quality: 82, mozjpeg: true }).toFile(it.thumb);
}
console.log(`大图 / 小图已出到 ${STAGE}`);

// ── 传 Blob ──
mkdirSync(OUT, { recursive: true });
const progress = existsSync(PROGRESS) ? JSON.parse(readFileSync(PROGRESS, 'utf8')) : {};
const saveProgress = () => writeFileSync(PROGRESS, JSON.stringify(progress, null, 1));
const jobs = items.flatMap((it) => [
  { it, field: 'thumb_url', file: it.thumb, path: blobPath(it, 't') },
  { it, field: 'image_url', file: it.large, path: blobPath(it, 'l') }
]);
const token = DRY ? null : loadToken();
let done = 0, skipped = 0, uploaded = 0;
async function runJob(j) {
  if (progress[j.path]) {
    j.it[j.field] = progress[j.path];
    skipped++;
  } else if (DRY) {
    j.it[j.field] = `https://DRY.public.blob.vercel-storage.com/${j.path}`;
  } else {
    let url = null;
    try {
      url = (await head(j.path, { token })).url;
      skipped++;
    } catch {
      for (let a = 1; a <= 3 && !url; a++) {
        try {
          url = (await put(j.path, readFileSync(j.file), { access: 'public', contentType: 'image/jpeg', addRandomSuffix: false, token })).url;
          uploaded++;
        } catch (e) {
          if (a === 3) throw new Error(`${j.path} 传了 3 次都没成功：${e?.message ?? e}`);
          await new Promise((r) => setTimeout(r, 1500 * a));
        }
      }
    }
    progress[j.path] = url;
    j.it[j.field] = url;
  }
  if (++done % 50 === 0) {
    if (!DRY) saveProgress();
    console.log(`  ${done}/${jobs.length}（新传 ${uploaded}，跳过 ${skipped}）`);
  }
}
const queue = [...jobs];
await Promise.all(Array.from({ length: 8 }, async () => { while (queue.length) await runJob(queue.shift()); }));
if (!DRY) saveProgress();
console.log(`传图完成：新传 ${uploaded}，跳过 ${skipped}`);
if (DRY) {
  console.log('（--dry：不写输出）', JSON.stringify({ ...items[0], slots: undefined }));
  process.exit(0);
}

// ── 输出 ──
const tpls = items.map((it) => ({ code: it.code, category_key: it.category_key, name: it.name, image_url: it.image_url, thumb_url: it.thumb_url, box: it.box, ink: null, layout: 1, sort: it.sort, source: '活动第三批' }));
writeFileSync(path.join(OUT, 'event_templates_batch3_import.json'), JSON.stringify({ categories: NEW_CATS, templates: tpls }));
writeFileSync(path.join(OUT, 'event_templates_batch3_slots.json'), JSON.stringify(Object.fromEntries(items.map((it) => [it.code, it.slots])), null, 1));
writeFileSync(
  path.join(OUT, 'event_templates_batch3_map.csv'),
  ['code,分类,目录,款,sort', ...items.map((it) => [it.code, it.category_key, it.dirName, it.sub, it.sort].join(','))].join('\n') + '\n'
);
const q = (v) => (v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const lines = [
  '-- 活动第三批海报模板：正式库导入（scripts/poster-templates-batch3.mjs 生成）。要求：0053 已跑（1.7.0 已上线）。',
  `-- 新建 ${NEW_CATS.length} 个分类、${tpls.length} 张模板；图片已在 Blob（poster-templates/<分类>/e3-…_v1.jpg）。按 key / code 已有就跳过，可重复跑。`,
  '-- 没有 BEGIN/COMMIT（由双击文件 psql -1 包成一个事务）。不写 purpose / badge_pos 等 0054 的列：0054 前后都能跑（0054 之后 purpose 默认 event）。',
  '-- sort = -100+序号：排在每类最前，旧 474 张的 sort（≥1）不动。'
];
for (const c of NEW_CATS) lines.push(`INSERT INTO poster_categories (key, name, tier, sort) VALUES (${q(c.key)}, ${q(c.name)}, ${c.tier}, ${c.sort}) ON CONFLICT DO NOTHING;`);
for (const t of tpls) {
  lines.push(
    `INSERT INTO poster_templates (code, category_key, name, image_url, thumb_url, box, ink, layout, sort, source) VALUES (` +
      `${q(t.code)}, ${q(t.category_key)}, ${q(t.name)}, ${q(t.image_url)}, ${q(t.thumb_url)}, ${q(JSON.stringify(t.box))}::jsonb, NULL, ${t.layout}, ${t.sort}, ${q(t.source)}) ON CONFLICT (code) DO NOTHING;`
  );
}
lines.push('');
writeFileSync(path.join(OUT, 'event_templates_batch3.sql'), lines.join('\n'));
console.log(`已写：${OUT}/event_templates_batch3.sql、_import.json、_slots.json、_map.csv`);
