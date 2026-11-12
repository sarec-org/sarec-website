/** 小程序术语速查：100 条全保留、没有一条带金额 / 利率数字、id 唯一。用法：npx tsx scripts/glossary-mp-tests.ts */
import assert from 'node:assert/strict';
import { GLOSSARY, glossaryForMp } from '@/lib/tools/glossary';
const { terms, cats } = glossaryForMp();
assert.equal(terms.length, GLOSSARY.length, '有词因为带数字被略过了，请在 MP_SAFE 里补小程序说法');
for (const t of terms) assert.ok(!/[0-9%$]|美元|元/.test(t.dz + t.de), `${t.en} 解释里还有数字`);
assert.equal(new Set(terms.map((t) => t.id)).size, terms.length, 'id 重复');
assert.equal(cats.reduce((s, c) => s + c.n, 0), terms.length);
console.log(`✓ 术语速查（小程序版）${terms.length} 条，${cats.length} 个分类，解释里没有金额 / 利率数字，id 唯一`);
