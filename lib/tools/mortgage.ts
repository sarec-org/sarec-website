/**
 * 1.4 网站工具 · 月供与现金流计算器（纯函数，前后端共用，可单测）。
 * ------------------------------------------------------------------
 * 只做算术，不做任何投资建议。结果是粗算：未计空置、维修、物业管理、过户费、PMI、所得税。
 * 默认值（东哥夜间清单）：利率 6.5%、30 年、房产税 1.1%/年、保险按房价 0.35%/年。
 */

export type MortgageInput = {
  price: number;          // 房价（美元）
  downPct: number;        // 首付比例（%）
  ratePct: number;        // 年利率（%）
  years: number;          // 贷款年限
  taxPct: number;         // 房产税率（%/年，按房价）
  insurancePct: number;   // 保险（%/年，按房价）
  hoa: number;            // HOA（美元/月）
  rent: number;           // 预期租金（美元/月）
  mgmtOn: number;         // 东哥 11/15：委托物业管理公司（0 不委托 / 1 委托），默认不委托
  mgmtPct: number;        // 管理费率（%，按每月租金），只能 4–10，步长 1，默认 8
};

export type MortgageResult = {
  downPayment: number;
  loan: number;
  principalInterest: number; // 月供（本金+利息）
  tax: number;               // 月房产税
  insurance: number;         // 月保险
  hoa: number;
  mgmtFee: number;           // 月管理费 = 每月租金 × 管理费率（不委托时 0）
  totalMonthly: number;      // 月总支出（PITI + HOA + 管理费）
  cashFlow: number;          // 月现金流 = 租金 − 月总支出
  annualCashFlow: number;
  cashOnCashPct: number | null; // 年化现金回报 = 年现金流 ÷ 首付；首付为 0 时为 null
  totalInterest: number;     // 贷款期内总利息
};

export const MORTGAGE_DEFAULTS: MortgageInput = {
  price: 800_000,
  downPct: 25,
  ratePct: 6.5,
  years: 30,
  taxPct: 1.1,
  insurancePct: 0.35,
  hoa: 0,
  rent: 4_000,
  mgmtOn: 0,
  mgmtPct: 8
};

/** 合理范围，超出就夹住（防止页面算出 NaN / Infinity） */
export const MORTGAGE_LIMITS: Record<keyof MortgageInput, [number, number]> = {
  price: [0, 100_000_000],
  downPct: [0, 100],
  ratePct: [0, 30],
  years: [1, 40],
  taxPct: [0, 10],
  insurancePct: [0, 10],
  hoa: [0, 100_000],
  rent: [0, 1_000_000],
  mgmtOn: [0, 1],
  mgmtPct: [4, 10]
};

const num = (v: unknown, d: number) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[,\s$]/g, ''));
  return Number.isFinite(n) ? n : d;
};

export function cleanMortgageInput(raw: Partial<Record<keyof MortgageInput, unknown>>): MortgageInput {
  const out = { ...MORTGAGE_DEFAULTS };
  (Object.keys(MORTGAGE_DEFAULTS) as (keyof MortgageInput)[]).forEach((k) => {
    const [lo, hi] = MORTGAGE_LIMITS[k];
    out[k] = Math.min(hi, Math.max(lo, num(raw[k], MORTGAGE_DEFAULTS[k])));
  });
  out.years = Math.round(out.years);
  // 委托管理两项没传（老链接、老存档）时用默认值：不委托、8%（其他字段沿用原来的处理，保证老数字不变）
  const blank = (v: unknown) => v === undefined || v === null || v === '';
  if (blank(raw.mgmtOn)) out.mgmtOn = MORTGAGE_DEFAULTS.mgmtOn;
  if (blank(raw.mgmtPct)) out.mgmtPct = MORTGAGE_DEFAULTS.mgmtPct;
  out.mgmtOn = out.mgmtOn >= 0.5 ? 1 : 0;
  out.mgmtPct = Math.round(out.mgmtPct);
  return out;
}

/** 标准等额本息月供 */
export function monthlyPayment(loan: number, ratePct: number, years: number): number {
  const n = Math.round(years * 12);
  if (loan <= 0 || n <= 0) return 0;
  const r = ratePct / 100 / 12;
  if (r === 0) return loan / n;
  return (loan * r) / (1 - Math.pow(1 + r, -n));
}

export function calcMortgage(raw: Partial<Record<keyof MortgageInput, unknown>>): MortgageResult {
  const i = cleanMortgageInput(raw);
  const downPayment = (i.price * i.downPct) / 100;
  const loan = i.price - downPayment;
  const principalInterest = monthlyPayment(loan, i.ratePct, i.years);
  const tax = (i.price * i.taxPct) / 100 / 12;
  const insurance = (i.price * i.insurancePct) / 100 / 12;
  // 委托管理：管理费按每月租金收（这个计算器没有空置率，所以按月租金）；不委托时 0，所有数字和以前一样
  const mgmtFee = i.mgmtOn ? (i.rent * i.mgmtPct) / 100 : 0;
  const totalMonthly = principalInterest + tax + insurance + i.hoa + mgmtFee;
  const cashFlow = i.rent - totalMonthly;
  const annualCashFlow = cashFlow * 12;
  return {
    downPayment,
    loan,
    principalInterest,
    tax,
    insurance,
    hoa: i.hoa,
    mgmtFee,
    totalMonthly,
    cashFlow,
    annualCashFlow,
    cashOnCashPct: downPayment > 0 ? (annualCashFlow / downPayment) * 100 : null,
    totalInterest: Math.max(0, principalInterest * i.years * 12 - loan)
  };
}

/** 美元千分位，整数 */
/** 负号统一用数学减号“−”（U+2212），金额和百分比在页面、分享图上同一个样子（验收 P3-T1） */
export const MINUS = '\u2212';
export const usd = (n: number) => {
  const v = Math.round(Math.abs(n));
  return `${n < 0 && v !== 0 ? MINUS : ''}$${v.toLocaleString('en-US')}`;
};
export const pct = (n: number | null, digits = 2) => {
  if (n === null || !Number.isFinite(n)) return '—';
  const t = Math.abs(n).toFixed(digits);
  return `${n < 0 && Number(t) !== 0 ? MINUS : ''}${t}%`;
};
