#!/usr/bin/env node
/**
 * 1.7.0 节日祝福：把感恩节 3 张祝福底图（不带落款，1024×1536 png）做成小图 300×450、大图 1080×1620（jpg），传 Vercel Blob，
 * 再生成两份导入数据。照 scripts/poster-templates-upload.mjs 的规矩。
 *
 *   node scripts/greetings-thanksgiving-upload.mjs [--env <.env.local 路径>] [--src <感恩节祝福目录>] [--out <输出目录>] [--dry]
 *
 * - 目录里要有 落款位.json（[{ 编号, 款名, 底图, 落款位:[x0,y0,x1,y1] 归一化 }]）。
 * - 图片路径：poster-templates/greet_thanksgiving/greet-thanksgiving-<编号>_{t,l}_v1.jpg（不加随机后缀）。
 *   断点续传：进度文件里有、或 Blob 上已有这个路径的跳过。
 * - BLOB_READ_WRITE_TOKEN 只从 env 文件读进本进程，不打印、不写进任何输出。
 * - 输出（默认 ~/.sarec/release170/）：
 *   ① greetings_templates.sql —— 正式库用：插 3 条 poster_templates（purpose='greeting'，带 sig_box），ON CONFLICT (code) DO NOTHING；
 *      不带 BEGIN/COMMIT（双击文件把它和 0054 放在同一个事务里跑），依赖 0054 先跑（分类 greet_thanksgiving 由 0054 插）。
 *   ② greetings_import.json —— POST /api/v1/staff/poster-templates/import 的请求体（给测试站灌数据）。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { put, head } from '@vercel/blob';

const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const DRY = process.argv.includes('--dry');
const SRC = arg('--src', path.join(homedir(), 'WeChatProjects/海报模板库/给东哥手机看/感恩节祝福_1126'));
const OUT = arg('--out', path.join(homedir(), '.sarec/release170'));
const ENV = arg('--env', '.env.local');
const CAT = 'greet_thanksgiving';
const PROGRESS = path.join(OUT, 'greetings_upload_progress.json');

function loadToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  if (!existsSync(ENV)) throw new Error(`找不到 ${ENV}（里面要有 BLOB_READ_WRITE_TOKEN）`);
  const line = readFileSync(ENV, 'utf8').split('\n').find((l) => l.startsWith('BLOB_READ_WRITE_TOKEN='));
  const v = line ? line.slice('BLOB_READ_WRITE_TOKEN='.length).trim().replace(/^"|"$/g, '') : '';
  if (!v.startsWith('vercel_blob_rw_')) throw new Error(`${ENV} 里没有可用的 BLOB_READ_WRITE_TOKEN`);
  return v;
}

const list = JSON.parse(readFileSync(path.join(SRC, '落款位.json'), 'utf8'));
mkdirSync(OUT, { recursive: true });
const progress = existsSync(PROGRESS) ? JSON.parse(readFileSync(PROGRESS, 'utf8')) : {};
const saveProgress = () => writeFileSync(PROGRESS, JSON.stringify(progress, null, 1));
const r4 = (x) => Math.round(x * 10000) / 10000;

const SIZES = { t: [300, 450], l: [1080, 1620] };
const templates = [];
const jobs = [];
for (const it of list) {
  const code = `greet-thanksgiving-${it['编号']}`;
  const file = path.join(SRC, it['底图']);
  if (!existsSync(file)) throw new Error(`缺文件：${file}`);
  const b = it['落款位'];
  if (!Array.isArray(b) || b.length !== 4 || !b.every((v) => v >= 0 && v <= 1) || b[2] - b[0] < 0.2 || b[3] - b[1] < 0.04) throw new Error(`${code} 落款位不对`);
  const t = { code, category_key: CAT, name: it['款名'], image_url: null, thumb_url: null, purpose: 'greeting', sig_box: b.map(r4), layout: 1, sort: Number(it['编号']), source: 'gen_1126' };
  templates.push(t);
  for (const size of ['t', 'l']) jobs.push({ t, field: size === 't' ? 'thumb_url' : 'image_url', file, size, path: `poster-templates/${CAT}/${code}_${size}_v1.jpg` });
}
console.log(`清单：${templates.length} 张祝福模板、${jobs.length} 个文件`);

const token = DRY ? null : loadToken();
let uploaded = 0;
let skipped = 0;
for (const j of jobs) {
  if (progress[j.path]) {
    j.t[j.field] = progress[j.path];
    skipped++;
    continue;
  }
  const [w, h] = SIZES[j.size];
  const buf = await sharp(j.file).resize(w, h, { fit: 'cover' }).flatten({ background: '#ffffff' }).jpeg({ quality: j.size === 't' ? 82 : 90, mozjpeg: true }).toBuffer();
  if (DRY) {
    j.t[j.field] = `https://DRY.public.blob.vercel-storage.com/${j.path}`;
    console.log(`  ${j.path}：${w}×${h}，${Math.round(buf.length / 1024)}KB（--dry 不传）`);
    continue;
  }
  let url = null;
  try {
    url = (await head(j.path, { token })).url; // Blob 上已经有了
    skipped++;
  } catch {
    for (let a = 1; a <= 3 && !url; a++) {
      try {
        url = (await put(j.path, buf, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: false, token })).url;
        uploaded++;
      } catch (e) {
        if (a === 3) throw new Error(`${j.path} 传了 3 次都没成功：${e?.message ?? e}`);
        await new Promise((r) => setTimeout(r, 1500 * a));
      }
    }
  }
  progress[j.path] = url;
  j.t[j.field] = url;
  saveProgress();
  console.log(`  ${j.path} ✔`);
}
console.log(`传图完成：新传 ${uploaded}，跳过 ${skipped}`);
if (DRY) process.exit(0);

// ② 导入接口请求体（分类 greet_thanksgiving 由 0054 建好，这里不带分类）
writeFileSync(path.join(OUT, 'greetings_import.json'), JSON.stringify({ categories: [], templates }, null, 1));

// ① 正式库 SQL（不带 BEGIN/COMMIT）
const q = (v) => (v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const lines = [
  '-- 1.7.0 节日祝福：感恩节 3 张祝福模板（scripts/greetings-thanksgiving-upload.mjs 生成）。',
  '-- 依赖迁移 0054_greetings.sql 先跑（purpose / sig_box 列、分类 greet_thanksgiving）。按 code 已有就跳过，可重复跑。',
  '-- 不带 BEGIN/COMMIT：双击文件把它和 0054 放在同一个事务里跑。图片已在 Blob（poster-templates/greet_thanksgiving/…_v1.jpg）。'
];
for (const t of templates) {
  lines.push(
    `INSERT INTO poster_templates (code, category_key, name, image_url, thumb_url, box, ink, layout, sort, source, purpose, sig_box) VALUES (` +
      `${q(t.code)}, ${q(t.category_key)}, ${q(t.name)}, ${q(t.image_url)}, ${q(t.thumb_url)}, NULL, NULL, ${t.layout}, ${t.sort}, ${q(t.source)}, 'greeting', ${q(JSON.stringify(t.sig_box))}::jsonb) ON CONFLICT (code) DO NOTHING;`
  );
}
lines.push('');
writeFileSync(path.join(OUT, 'greetings_templates.sql'), lines.join('\n'));
console.log(`已写：${path.join(OUT, 'greetings_templates.sql')}、${path.join(OUT, 'greetings_import.json')}`);
