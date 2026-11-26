#!/usr/bin/env node
/**
 * 1.7.0 海报模板库：把「上线候选」的 474 张模板（每张小图 + 大图）传到 Vercel Blob，再生成两份导入数据。
 *
 *   node scripts/poster-templates-upload.mjs [--env <.env.local 路径>] [--src <上线候选目录>] [--out <输出目录>] [--dry]
 *
 * - 图片路径：poster-templates/<分类>/<编号>_{t,l}_v1.jpg（不加随机后缀；版本 1）。可以断点续传：已经传过的（进度文件里有，
 *   或 Blob 上已经有这个路径）跳过。
 * - BLOB_READ_WRITE_TOKEN 只从 env 文件读进本进程，不打印、不写进任何输出。
 * - 输出（默认 ~/.sarec/release170/）：
 *   ① poster_templates.sql —— 正式库用：建分类 + 插模板，ON CONFLICT DO NOTHING，可重复跑，不含任何密钥；
 *   ② poster_templates_import.json —— POST /api/v1/staff/poster-templates/import 的请求体（给测试站灌数据）。
 * - 清单 box 是 1024×1536 像素坐标，这里除以 1024 / 1536 归一化成 0–1；第一批没有 box（null）。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { put, head } from '@vercel/blob';

const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const DRY = process.argv.includes('--dry');
const SRC = arg('--src', path.join(homedir(), 'WeChatProjects/海报模板库/上线候选'));
const OUT = arg('--out', path.join(homedir(), '.sarec/release170'));
const ENV = arg('--env', '.env.local');
const PROGRESS = path.join(OUT, 'poster_templates_upload_progress.json');

function loadToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  if (!existsSync(ENV)) throw new Error(`找不到 ${ENV}（里面要有 BLOB_READ_WRITE_TOKEN）`);
  const line = readFileSync(ENV, 'utf8').split('\n').find((l) => l.startsWith('BLOB_READ_WRITE_TOKEN='));
  const v = line ? line.slice('BLOB_READ_WRITE_TOKEN='.length).trim().replace(/^"|"$/g, '') : '';
  if (!v.startsWith('vercel_blob_rw_')) throw new Error(`${ENV} 里没有可用的 BLOB_READ_WRITE_TOKEN`);
  return v;
}

const list = JSON.parse(readFileSync(path.join(SRC, '清单.json'), 'utf8'));
mkdirSync(OUT, { recursive: true });
const progress = existsSync(PROGRESS) ? JSON.parse(readFileSync(PROGRESS, 'utf8')) : {};
const saveProgress = () => writeFileSync(PROGRESS, JSON.stringify(progress, null, 1));

const blobPath = (cat, code, size) => `poster-templates/${cat}/${code}_${size}_v1.jpg`;
const r4 = (x) => Math.round(x * 10000) / 10000;
const normBox = (b) => (Array.isArray(b) && b.length === 4 ? [r4(b[0] / 1024), r4(b[1] / 1536), r4(b[2] / 1024), r4(b[3] / 1536)] : null);

// 要传的文件
const jobs = [];
const categories = [];
const templates = [];
list.forEach((c, ci) => {
  categories.push({ key: c.key, name: c.name, tier: c.tier ?? 3, sort: ci + 1 });
  c.items.forEach((it, ii) => {
    const t = { code: it.id, category_key: c.key, name: it.name, image_url: null, thumb_url: null, box: normBox(it.box), ink: it.ink || null, layout: it.layout ?? 1, sort: ii + 1, source: it.source || null };
    templates.push(t);
    jobs.push({ t, field: 'thumb_url', file: path.join(SRC, it.thumb), path: blobPath(c.key, it.id, 't') });
    jobs.push({ t, field: 'image_url', file: path.join(SRC, it.large), path: blobPath(c.key, it.id, 'l') });
  });
});
console.log(`清单：${categories.length} 类、${templates.length} 张模板、${jobs.length} 个文件`);
for (const j of jobs) if (!existsSync(j.file)) throw new Error(`缺文件：${j.file}`);

const token = DRY ? null : loadToken();
let done = 0;
let skipped = 0;
let uploaded = 0;
async function runJob(j) {
  if (progress[j.path]) {
    j.t[j.field] = progress[j.path];
    skipped++;
  } else if (DRY) {
    j.t[j.field] = `https://DRY.public.blob.vercel-storage.com/${j.path}`;
  } else {
    let url = null;
    try {
      url = (await head(j.path, { token })).url; // Blob 上已经有了（上次传完没记进度）
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
    j.t[j.field] = url;
  }
  done++;
  if (done % 50 === 0) {
    saveProgress();
    console.log(`  ${done}/${jobs.length}（新传 ${uploaded}，跳过 ${skipped}）`);
  }
}
const queue = [...jobs];
await Promise.all(Array.from({ length: 8 }, async () => { while (queue.length) await runJob(queue.shift()); }));
if (!DRY) saveProgress();
console.log(`传图完成：新传 ${uploaded}，跳过 ${skipped}`);

if (DRY) {
  console.log('（--dry：只检查清单和文件，不写输出）', JSON.stringify(templates[0]));
  process.exit(0);
}

// ② 导入接口请求体
const body = { categories, templates };
writeFileSync(path.join(OUT, 'poster_templates_import.json'), JSON.stringify(body));

// ① 正式库 SQL
const q = (v) => (v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const lines = [
  '-- 1.7.0 海报模板库：正式库导入（scripts/poster-templates-upload.mjs 生成）。先跑迁移 0053_poster_templates.sql。',
  `-- ${categories.length} 个分类、${templates.length} 张模板；图片已在 Blob（poster-templates/…_v1.jpg）。按 key / code 已有就跳过，可重复跑。`,
  'BEGIN;'
];
for (const c of categories) lines.push(`INSERT INTO poster_categories (key, name, tier, sort) VALUES (${q(c.key)}, ${q(c.name)}, ${c.tier}, ${c.sort}) ON CONFLICT (key) DO NOTHING;`);
for (const t of templates) {
  lines.push(
    `INSERT INTO poster_templates (code, category_key, name, image_url, thumb_url, box, ink, layout, sort, source) VALUES (` +
      `${q(t.code)}, ${q(t.category_key)}, ${q(t.name)}, ${q(t.image_url)}, ${q(t.thumb_url)}, ${t.box ? q(JSON.stringify(t.box)) + '::jsonb' : 'NULL'}, ${q(t.ink)}, ${t.layout}, ${t.sort}, ${q(t.source)}) ON CONFLICT (code) DO NOTHING;`
  );
}
lines.push('COMMIT;', '');
writeFileSync(path.join(OUT, 'poster_templates.sql'), lines.join('\n'));
console.log(`已写：${path.join(OUT, 'poster_templates.sql')}、${path.join(OUT, 'poster_templates_import.json')}`);
