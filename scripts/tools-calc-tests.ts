/** 1.4 工具纯函数单测：pnpm dlx tsx scripts/tools-calc-tests.ts（不连数据库） */
import assert from 'node:assert/strict';
import { calcMortgage, monthlyPayment, cleanMortgageInput, usd } from '../lib/tools/mortgage';

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
assert.equal(usd(-1234.6), '-$1,235'); assert.equal(usd(1234567), '$1,234,567');
console.log('✓ mortgage tests passed');

// —— 1031 ——
import { calc1031, clean1031Input } from '../lib/tools/exchange1031';
// 卖 150 万，6% 费用 → 净 141 万；成本 80 万、折旧 20 万 → 调整后 60 万；利得 81 万（回收 20 万 + 资本利得 61 万）
const e = calc1031({ salePrice: 1_500_000, sellingCostPct: 6, costBasis: 800_000, depreciation: 200_000, replacementPrice: 1_800_000, cashOut: 0, fedRatePct: 20, niit: true, state: 'CA', stateRatePct: 13.3 });
near(e.netSale, 1_410_000); near(e.adjustedBasis, 600_000); near(e.gain, 810_000);
near(e.recapture, 200_000); near(e.capitalGain, 610_000);
near(e.taxIfSold.recapture, 50_000); near(e.taxIfSold.federal, 122_000); near(e.taxIfSold.niit, 30_780); near(e.taxIfSold.state, 107_730);
near(e.taxIfSold.total, 310_510);
assert.equal(e.boot, 0); near(e.taxNow, 0); near(e.deferred, 310_510); near(e.newBasis, 1_800_000 - 810_000);
// 换房价低于净额 11 万 → boot 11 万，先算折旧回收
const b = calc1031({ salePrice: 1_500_000, sellingCostPct: 6, costBasis: 800_000, depreciation: 200_000, replacementPrice: 1_300_000, fedRatePct: 20, niit: false, state: 'NONE', stateRatePct: 0 });
near(b.boot, 110_000); near(b.taxNow, 27_500); near(b.deferred, b.taxIfSold.total - 27_500);
// 亏损：没有税
const loss = calc1031({ salePrice: 500_000, costBasis: 800_000, depreciation: 0 });
assert.equal(loss.gain, 0); assert.equal(loss.taxIfSold.total, 0); assert.equal(loss.deferred, 0);
// 取出现金超过利得 → boot 封顶为利得
const big = calc1031({ salePrice: 1_000_000, sellingCostPct: 0, costBasis: 900_000, depreciation: 0, replacementPrice: 2_000_000, cashOut: 500_000 });
near(big.boot, 100_000); near(big.deferred, 0);
// 清洗：非法州 → 默认，非法联邦税率 → 20
const ci = clean1031Input({ state: 'XX', fedRatePct: 7, niit: 'false' });
assert.equal(ci.state, 'CA'); assert.equal(ci.fedRatePct, 20); assert.equal(ci.niit, false);
console.log('✓ 1031 tests passed');
