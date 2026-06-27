/**
 * Gate 3A-2 验证脚本 —— content.ts accessor 双轨(TS+YAML)读取验证
 * ------------------------------------------------------------------
 * 加载【真实的 lib/geo/content.ts】(不重写其逻辑),验证:
 *   - 《10 大陷阱》能被 listArticles / getArticle 读到,且 slug 只出现一次;
 *   - 返回的文章来自 YAML 覆盖路径(用 adapter 确定性 key 顺序作指纹证明);
 *   - blocks=83 / qaUnit=6 / sources=11 / status=published / slug/title/summary 不变;
 *   - FAQ 合成输入(qaUnit)完整;sitemap 无重复 slug;旧 TS 文件仍在。
 *
 * 加载方式:Node 25 默认剥离 TS 类型,但无扩展名相对导入需补 .ts —— 用 resolve 钩子解决,
 *          从而 import 到真实 accessor(含其所有 .ts 子依赖),而非脚本内重写。
 *
 * 用法: node scripts/verify-geo-yaml-accessor.mjs
 */
import { register } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

const ROOT = process.cwd();
const SLUG = 'chinese-capital-us-real-estate-10-traps';
const TS_FILE = 'content/geo/articles/chinese-capital-us-real-estate-10-traps.ts';

// resolve 钩子:无扩展名相对导入 → 追加 .ts
const hook = `
export async function resolve(specifier, context, nextResolve) {
  try { return await nextResolve(specifier, context); }
  catch (e) {
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\\.[a-zA-Z]+$/.test(specifier)) {
      return await nextResolve(specifier + '.ts', context);
    }
    throw e;
  }
}`;
register('data:text/javascript,' + encodeURIComponent(hook), import.meta.url);

const fileUrl = (rel) => new URL(rel, 'file://' + ROOT + '/').href;

// 真实 accessor + 原始 TS 文章(基线) + adapter(用于独立证明 YAML 路径)
const accessor = await import(fileUrl('lib/geo/content.ts'));
const tsMod = await import(fileUrl(TS_FILE));
const tsOriginal = tsMod.chineseCapitalUsRealEstate10Traps;
const { fromKeystaticArticle } = await import(fileUrl('lib/geo/keystatic-adapter.ts'));
const YAML_FILE = 'content/geo/articles/chinese-capital-us-real-estate-10-traps.yaml';
const adapterFromYaml = fromKeystaticArticle(parseYaml(readFileSync(join(ROOT, YAML_FILE), 'utf8')));

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass: !!pass, detail });
};

// 1. listArticles 能读取到该 slug,且只出现一次
const all = accessor.listArticles();
const matches = all.filter((a) => a.slug === SLUG);
check('listArticles 含该 slug', matches.length >= 1, `命中 ${matches.length} 篇`);
check('该 slug 在 listArticles 中只出现一次', matches.length === 1, `count=${matches.length}`);

const article = accessor.getArticle(SLUG);
// 2. getArticle 能返回
check('getArticle 返回文章', !!article, article ? 'ok' : 'null');

// 3. 证明来自 YAML 覆盖路径:独立地对 YAML 跑一遍 adapter,
//    断言 accessor 返回对象的「key 插入顺序」== 新跑 adapter 的输出,且 != TS 原对象。
//    adapter 重建对象的 key 顺序是确定性的(slug→…→author→…→blocks→sources→audience→…),
//    与 TS 字面量顺序(…→audience→intent→author→…)不同 → 可唯一区分数据来源。
let yamlOriginProof = { method: '', returnedKeyOrder: '', adapterKeyOrder: '', tsKeyOrder: '' };
if (article) {
  const returnedKeyOrder = Object.keys(article).join(',');
  const adapterKeyOrder = Object.keys(adapterFromYaml).join(',');
  const tsKeyOrder = Object.keys(tsOriginal).join(',');
  yamlOriginProof = {
    method: '独立重跑 fromKeystaticArticle(YAML);accessor 返回对象 key 顺序须 == adapter 输出 且 != TS 原对象',
    returnedKeyOrder,
    adapterKeyOrder,
    tsKeyOrder,
    matchesAdapter: returnedKeyOrder === adapterKeyOrder,
    differsFromTs: returnedKeyOrder !== tsKeyOrder,
  };
  check(
    '返回文章来自 YAML 覆盖路径(非旧 TS)',
    returnedKeyOrder === adapterKeyOrder && returnedKeyOrder !== tsKeyOrder,
    `matchesAdapter=${returnedKeyOrder === adapterKeyOrder}, differsFromTs=${returnedKeyOrder !== tsKeyOrder}`
  );
}

// 4. 结构不变量
if (article) {
  const blocks = Array.isArray(article.blocks) ? article.blocks.length : -1;
  const qa = (article.blocks || []).filter((b) => b.type === 'qaUnit').length;
  const srcN = Array.isArray(article.sources) ? article.sources.length : -1;
  check('blocks 数量 = 83', blocks === 83, `blocks=${blocks}`);
  check('qaUnit 数量 = 6', qa === 6, `qaUnit=${qa}`);
  check('sources 数量 = 11', srcN === 11, `sources=${srcN}`);
  check('status = published', article.status === 'published', `status=${article.status}`);
  check('slug 不变', article.slug === SLUG && article.slug === tsOriginal.slug, `slug=${article.slug}`);
  check('title 不变(对比 TS 原文)', article.title === tsOriginal.title, `equal=${article.title === tsOriginal.title}`);
  check('summary 数量不变', article.summary.length === tsOriginal.summary.length, `${article.summary.length} vs TS ${tsOriginal.summary.length}`);

  // sources id 列表与 TS 原文逐个一致
  const srcEqual = JSON.stringify(article.sources) === JSON.stringify(tsOriginal.sources);
  check('sources id 列表与 TS 原文一致', srcEqual, srcEqual ? 'identical' : 'DIFFERS');

  // 5. FAQ 合成输入完整:page.tsx 在 article.faq 为空时,从 qaUnit 合成
  //    (question + judgment[+boundary][+riskNote])。验证 6 个 qaUnit 的 question/judgment 均非空。
  const qaBlocks = (article.blocks || []).filter((b) => b.type === 'qaUnit');
  const qaComplete = qaBlocks.length === 6 && qaBlocks.every((b) => b.data.question && b.data.judgment);
  check('FAQ 合成输入(6×qaUnit 的 question/judgment)完整', qaComplete, `qaBlocks=${qaBlocks.length}`);
}

// 6. sitemap 无重复 slug
const sitemap = accessor.listAllContentForSitemap();
const urls = sitemap.map((e) => e.url);
const dupUrls = urls.filter((u, i) => urls.indexOf(u) !== i);
const tenTrapUrl = `/zh/research/${SLUG}`;
check('listAllContentForSitemap 无重复 slug/url', dupUrls.length === 0, `urls=${urls.length}, dup=${JSON.stringify(dupUrls)}`);
check('sitemap 含 10 大陷阱 url 且仅一次', urls.filter((u) => u === tenTrapUrl).length === 1, `count=${urls.filter((u) => u === tenTrapUrl).length}`);

// 7. 旧 TS 文件仍存在
check('旧 TS 文章文件仍保留', existsSync(join(ROOT, TS_FILE)), TS_FILE);

// ── 输出 ──────────────────────────────────────────────────────────────
console.log('===GEO_YAML_ACCESSOR_VERIFY_START===');
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'} | ${r.name}${r.detail ? '  (' + r.detail + ')' : ''}`);
}
console.log('--- YAML 覆盖路径证明 ---');
console.log(JSON.stringify(yamlOriginProof, null, 2));
const failed = results.filter((r) => !r.pass);
console.log(`--- 汇总: ${results.length - failed.length}/${results.length} 通过 ---`);
console.log('===GEO_YAML_ACCESSOR_VERIFY_END===');
if (failed.length > 0) process.exitCode = 1;
