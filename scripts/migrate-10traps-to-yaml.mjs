/**
 * 一次性迁移/校验脚本 —— 《10 大陷阱》TS → YAML（Gate 3A-1）
 * ------------------------------------------------------------------
 * 机械搬运,不改写文案:
 *   读 content/geo/articles/chinese-capital-us-real-estate-10-traps.ts(对象字面量)
 *   → 转成 Keystatic conditional 形状(blocks: {discriminant,value};cta/heroMedia: {discriminant,value?})
 *   → 写 content/geo/articles/chinese-capital-us-real-estate-10-traps.yaml
 *   → 反向还原(镜像 keystatic-adapter)并与原对象逐字段深比对,输出校验报告 JSON。
 *
 * 不删除旧 TS 文件。slug / 文案 / sources id / block 顺序保持一致。
 * 若无法自动完整迁移 → 抛错停止,绝不手动猜测。
 *
 * 用法: node scripts/migrate-10traps-to-yaml.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = process.cwd();
const TS_PATH = 'content/geo/articles/chinese-capital-us-real-estate-10-traps.ts';
const YAML_PATH = 'content/geo/articles/chinese-capital-us-real-estate-10-traps.yaml';
const EXPECTED_SLUG = 'chinese-capital-us-real-estate-10-traps';

function fail(msg) {
  console.error('MIGRATION_ABORTED: ' + msg);
  process.exit(1);
}

// ── 1. 载入 yaml 库(随 @keystatic 进入 pnpm store)──────────────────────────
const yamlMod = await import(
  new URL('./node_modules/.pnpm/yaml@2.8.3/node_modules/yaml/dist/index.js', `file://${ROOT}/`).href
);
const Y = yamlMod.default && yamlMod.default.stringify ? yamlMod.default : yamlMod;
const stringify = yamlMod.stringify ?? Y.stringify;
const parse = yamlMod.parse ?? Y.parse;
const YamlDocument = yamlMod.Document ?? Y.Document;
if (typeof stringify !== 'function' || typeof parse !== 'function') fail('无法加载 yaml 库 stringify/parse');
if (typeof YamlDocument !== 'function') fail('无法加载 yaml 库 Document(用于日期字段定向加引号)');

// 日期形态字段(text 类型)若未加引号,会被 Keystatic reader 解析成时间戳 → fields.text 校验失败。
// 定向把这些 top-level 字段输出为双引号字符串(QUOTE_DOUBLE),不影响其它字段。
const DATE_STRING_KEYS = ['publishedAt', 'updatedAt'];
function stringifyWithQuotedDates(obj) {
  const doc = new YamlDocument(obj);
  for (const key of DATE_STRING_KEYS) {
    const node = doc.get(key, true); // keepScalar=true → 返回 Scalar 节点
    if (node && typeof node === 'object' && 'value' in node) {
      node.type = 'QUOTE_DOUBLE';
    }
  }
  return doc.toString({ lineWidth: 0 });
}

// ── 2. 机械载入 TS 对象(仅剥离 import type 与 : Article 注解,字面量原样保留)──
const tsText = readFileSync(join(ROOT, TS_PATH), 'utf8');
const stripped = tsText
  .replace(/^\s*import\s+type[^\n]*\n/m, '')
  .replace(/export\s+const\s+\w+\s*:\s*Article\s*=/, 'export default');
if (!/export default\s*\{/.test(stripped)) fail('未能从 TS 文件定位到对象字面量(export const ...: Article = {...})');

const tmpDir = mkdtempSync(join(tmpdir(), 'sarec-10traps-'));
const tmpModule = join(tmpDir, 'article.mjs');
writeFileSync(tmpModule, stripped, 'utf8');
const original = (await import('file://' + tmpModule)).default;
if (!original || typeof original !== 'object') fail('载入的 TS 对象为空');

// ── 3. 转 Keystatic conditional 形状(机械搬运,字段值不改写)───────────────────
function present(obj, ...keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}
function toKeystaticShape(a) {
  if (!Array.isArray(a.blocks)) fail('原文章缺少 blocks 数组');
  return {
    slug: a.slug,
    locale: a.locale,
    cluster: a.cluster,
    tier: a.tier,
    status: a.status,
    title: a.title,
    description: a.description,
    ...present(a, 'audience', 'intent'),
    author: { name: a.author.name, ...present(a.author, 'title', 'profileUrl') },
    publishedAt: a.publishedAt,
    ...present(a, 'updatedAt'),
    summary: a.summary,
    blocks: a.blocks.map((b) => ({ discriminant: b.type, value: b.data })),
    ...(a.faq !== undefined ? { faq: a.faq } : {}),
    sources: a.sources,
    ...(a.relatedSlugs !== undefined ? { relatedSlugs: a.relatedSlugs } : {}),
    cta: a.cta !== undefined ? { discriminant: true, value: a.cta } : { discriminant: false },
    heroMedia: a.heroMedia !== undefined ? { discriminant: true, value: a.heroMedia } : { discriminant: false },
  };
}
const ksShape = toKeystaticShape(original);

// ── 4. 写 YAML ───────────────────────────────────────────────────────────────
const yamlText = stringifyWithQuotedDates(ksShape);
writeFileSync(join(ROOT, YAML_PATH), yamlText, 'utf8');

// ── 5. 反向还原(镜像 keystatic-adapter 的核心映射)并校验 ──────────────────────
const reparsed = parse(readFileSync(join(ROOT, YAML_PATH), 'utf8'));
function inverse(k) {
  const a = { ...k };
  a.blocks = (k.blocks ?? []).map((b) => ({ type: b.discriminant, data: b.value }));
  a.cta = k.cta && k.cta.discriminant === true ? k.cta.value : undefined;
  a.heroMedia = k.heroMedia && k.heroMedia.discriminant === true ? k.heroMedia.value : undefined;
  if (a.cta === undefined) delete a.cta;
  if (a.heroMedia === undefined) delete a.heroMedia;
  return a;
}
const restored = inverse(reparsed);

// 顺序无关深比对
function sortDeep(x) {
  if (Array.isArray(x)) return x.map(sortDeep);
  if (x && typeof x === 'object') {
    const out = {};
    for (const k of Object.keys(x).sort()) out[k] = sortDeep(x[k]);
    return out;
  }
  return x;
}
const deepEqual = JSON.stringify(sortDeep(original)) === JSON.stringify(sortDeep(restored));

// ── 6. 报告指标 ──────────────────────────────────────────────────────────────
const origTypes = original.blocks.map((b) => b.type);
const restoredTypes = restored.blocks.map((b) => b.type);
const qaOrig = origTypes.filter((t) => t === 'qaUnit').length;
const qaRestored = restoredTypes.filter((t) => t === 'qaUnit').length;

function eqArr(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
}

const report = {
  tsPath: TS_PATH,
  yamlPath: YAML_PATH,
  yamlBytes: Buffer.byteLength(yamlText, 'utf8'),
  slug: { orig: original.slug, restored: restored.slug, expected: EXPECTED_SLUG, ok: original.slug === EXPECTED_SLUG && restored.slug === EXPECTED_SLUG },
  title: { equal: original.title === restored.title },
  description: { equal: original.description === restored.description },
  seoTitleEqualsTitle: original.title === restored.title,
  summary: { origLen: original.summary.length, restoredLen: restored.summary.length, equal: eqArr(original.summary, restored.summary) },
  blocksCount: { orig: origTypes.length, restored: restoredTypes.length, equal: origTypes.length === restoredTypes.length },
  blockTypeSequenceEqual: eqArr(origTypes, restoredTypes),
  qaUnitCount: { orig: qaOrig, restored: qaRestored, equal: qaOrig === qaRestored },
  sources: { orig: original.sources, restored: restored.sources, equal: eqArr(original.sources, restored.sources) },
  faq: { origPresent: original.faq !== undefined, origLen: original.faq ? original.faq.length : 0 },
  cta: { origPresent: original.cta !== undefined, restoredPresent: restored.cta !== undefined },
  heroMedia: { origPresent: original.heroMedia !== undefined, restoredPresent: restored.heroMedia !== undefined },
  optionalScalars: {
    audience: original.audience === restored.audience,
    intent: original.intent === restored.intent,
    publishedAt: original.publishedAt === restored.publishedAt,
    updatedAt: original.updatedAt === restored.updatedAt,
    author: JSON.stringify(original.author) === JSON.stringify(restored.author),
    cluster: original.cluster === restored.cluster,
    tier: original.tier === restored.tier,
    status: original.status === restored.status,
    locale: original.locale === restored.locale,
  },
  origFieldKeys: Object.keys(original).sort(),
  restoredFieldKeys: Object.keys(restored).sort(),
  deepEqualRoundTrip: deepEqual,
};

console.log('===10TRAPS_MIGRATION_REPORT_JSON_START===');
console.log(JSON.stringify(report, null, 2));
console.log('===10TRAPS_MIGRATION_REPORT_JSON_END===');

if (!deepEqual) {
  console.error('WARNING: round-trip 深比对不一致,请人工检查,不要直接采用此 YAML。');
  process.exitCode = 2;
}
