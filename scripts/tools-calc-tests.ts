/** 1.4 工具纯函数单测：pnpm dlx tsx scripts/tools-calc-tests.ts（不连数据库） */
import assert from 'node:assert/strict';
import { calcMortgage, monthlyPayment, cleanMortgageInput, usd, pct } from '../lib/tools/mortgage';

const near = (a: number, b: number, eps = 0.01, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≠ ${b}`);
// 30 年 6.5% 贷 $600,000 → 月供约 $3,792.41（标准等额本息）
near(monthlyPayment(600_000, 6.5, 30), 3792.41, 0.01, 'P&I');
near(monthlyPayment(120_000, 0, 10), 1000, 1e-9, 'zero rate');
const r = calcMortgage({ price: 800_000, downPct: 25, ratePct: 6.5, years: 30, taxPct: 1.1, insurancePct: 0.35, hoa: 200, rent: 4000 });
near(r.downPayment, 200_000); near(r.loan, 600_000);
near(r.tax, 733.33); near(r.insurance, 233.33);
near(r.totalMonthly, 3792.41 + 733.33 + 233.33 + 200, 0.02);
near(r.cashFlow, 4000 - r.totalMonthly);
near(r.cashOnCashPct!, (r.cashFlow * 12 / 200_000) * 100, 1e-9);
// 全款：贷款 0、月供 0
const cash = calcMortgage({ price: 500_000, downPct: 100, rent: 3000 });
assert.equal(cash.principalInterest, 0);
// 0 首付：现金回报无意义 → null
assert.equal(calcMortgage({ price: 500_000, downPct: 0 }).cashOnCashPct, null);
// 乱输入被夹住，不出 NaN
const c = cleanMortgageInput({ price: '1,200,000', downPct: 150, ratePct: 'abc', years: 0 });
assert.equal(c.price, 1_200_000); assert.equal(c.downPct, 100); assert.equal(c.ratePct, 6.5); assert.equal(c.years, 1);
assert.equal(usd(-1234.6), '\u2212$1,235'); assert.equal(usd(-0.4), '$0');
assert.equal(pct(-4.554), '\u22124.55%'); assert.equal(pct(-0.001), '0.00%'); assert.equal(pct(null), '—'); assert.equal(usd(1234567), '$1,234,567');
console.log('✓ mortgage tests passed');
