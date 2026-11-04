/**
 * 小程序只读内容接口（lib/mpContent.ts）合规测试：不需要数据库。
 * 用法：pnpm dlx tsx scripts/crm-content-tests.ts
 */
import assert from 'node:assert/strict';
import * as c from '@/lib/mpContent';

let passed = 0;
const ok = (n: string) => {
  passed++;
  console.log(`  ✓ ${n}`);
};
const FIGURES = /(年化|回报率|收益率|\d+(\.\d+)?\s*(%|％)|\$\s?\d|募资|募集|认购|IRR\s*\d)/;
function strings(o: unknown, out: string[] = []): string[] {
  if (typeof o === 'string') out.push(o);
  else if (Array.isArray(o)) o.forEach((x) => strings(x, out));
  else if (o && typeof o === 'object') Object.values(o).forEach((x) => strings(x, out));
  return out;
}

const research = c.contentResearchList();
const services = c.contentServices();
const pages: [string, unknown][] = [
  ['home', c.contentHome()],
  ['about', c.contentAbout()],
  ['services', services],
  ['research', research],
  ['benefits', c.contentBenefits()],
  ['contact', c.contentContact()],
  ...services.items.map((i) => [`services/${i.slug}`, c.contentService(i.slug)] as [string, unknown]),
  ...research.items.map((i) => [`research/${i.slug}`, c.contentResearch(i.slug)] as [string, unknown])
];

console.log('每个栏目都有内容（与网站同源）');
for (const [name, d] of pages) assert.ok(d, `${name} 没有内容`);
assert.ok(research.items.length >= 5, '研究列表至少 5 篇');
assert.equal(services.items.length, 4);
ok(`${pages.length} 个页面都能读到`);

console.log('合规：不出现收益数字、金额、百分比、募资字样');
for (const [name, d] of pages) {
  for (const s of strings(d)) assert.ok(!FIGURES.test(s) || /Cap Rate \/ IRR \/ ROE/.test(s), `${name} 含收益数字：${s.slice(0, 60)}`);
}
ok('所有页面文字都没有收益数字');

console.log('合规：投资 / 融资 / EB-5 / 收益类页面只给简介');
for (const slug of ['eb5', 'cap-rate-irr-roe', 'lp-gp-structure', 'chinese-capital-us-real-estate-10-traps']) {
  const r = c.contentResearch(slug)!;
  assert.equal(r.restricted, true, `${slug} 应只给简介`);
  assert.equal(r.nodes.length, 0);
  assert.ok('notice' in r && String(r.notice).includes('联系商会'));
}
const cap = c.contentService('capital')!;
assert.equal(cap.restricted, true);
assert.equal(cap.nodes.length, 0);
ok('EB-5、收益指标、LP/GP、资本类只显示简介和“联系商会”');

console.log('合规：不输出付款、外部链接');
for (const [name, d] of pages) {
  for (const s of strings(d)) {
    assert.ok(!/https?:\/\//.test(s), `${name} 含外部链接：${s.slice(0, 60)}`);
    assert.ok(!/(Zelle|Stripe|刷卡|付款|转账|支付)/.test(s), `${name} 含付款字样：${s.slice(0, 60)}`);
  }
}
ok('没有外部链接，没有付款字样');

console.log(`\n全部通过：${passed} 组内容测试`);
