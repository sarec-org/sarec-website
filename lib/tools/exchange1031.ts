/**
 * 1.4 网站工具 · 1031 换房税务速算（纯函数，前后端共用，可单测）。
 * ------------------------------------------------------------------
 * 粗算，以会计师为准。简化口径：
 * - 调整后成本 = 购入成本（含改良）− 累计折旧
 * - 资本利得 = 卖出价 − 卖出费用 − 调整后成本
 * - 折旧回收部分（不超过利得）按联邦 25% 上限；其余按长期资本利得税率（0/15/20%）
 * - 可选 3.8% 净投资收入税（NIIT）；州税按所选州的税率乘全部利得
 * - 换房：新房价格低于卖出净额的差额、或取出的现金，视为"补价（boot）"当年计税；先算折旧回收
 * 不计：AMT、分期、债务减免、州别特殊规则、个人收入档位细节。
 */

export const STATE_PRESETS = [
  { id: 'CA', zh: '加州（最高档 13.3%）', en: 'California (top 13.3%)', rate: 13.3 },
  { id: 'NY', zh: '纽约州（最高档 10.9%）', en: 'New York (top 10.9%)', rate: 10.9 },
  { id: 'NJ', zh: '新泽西州（最高档 10.75%）', en: 'New Jersey (top 10.75%)', rate: 10.75 },
  { id: 'NONE', zh: '无州所得税（德州、佛州、华盛顿州、内华达州等）', en: 'No state income tax (TX, FL, WA, NV…)', rate: 0 },
  { id: 'CUSTOM', zh: '其他州（自己填税率）', en: 'Other state (enter rate)', rate: 5 }
] as const;
export type StateId = (typeof STATE_PRESETS)[number]['id'];

export type Ex1031Input = {
  salePrice: number;        // 卖出价
  sellingCostPct: number;   // 卖出费用（佣金、过户等，% 卖出价）
  costBasis: number;        // 购入成本（含改良）
  depreciation: number;     // 累计已提折旧
  replacementPrice: number; // 新房价格（换入）
  cashOut: number;          // 换房时取出的现金
  fedRatePct: number;       // 长期资本利得税率 0 / 15 / 20
  niit: boolean;            // 是否计 3.8% NIIT
  state: StateId;
  stateRatePct: number;     // 州税率（选预设时自动带出，可改）
};

export type Ex1031Result = {
  netSale: number;
  adjustedBasis: number;
  gain: number;                 // 资本利得（≤0 时为 0）
  recapture: number;            // 折旧回收部分
  capitalGain: number;          // 其余资本利得部分
  taxIfSold: { recapture: number; federal: number; niit: number; state: number; total: number };
  boot: number;                 // 换房补价（当年要计税的部分，≤ 利得）
  taxNow: number;               // 换房后当年粗算应缴
  deferred: number;             // 递延的税额
  deferredGain: number;         // 递延的利得
  newBasis: number;             // 新房结转成本（粗算）
};

export const EX1031_DEFAULTS: Ex1031Input = {
  salePrice: 1_500_000,
  sellingCostPct: 6,
  costBasis: 800_000,
  depreciation: 200_000,
  replacementPrice: 1_800_000,
  cashOut: 0,
  fedRatePct: 20,
  niit: true,
  state: 'CA',
  stateRatePct: 13.3
};

const RECAPTURE_RATE = 25;
const NIIT_RATE = 3.8;

const num = (v: unknown, d: number, lo: number, hi: number) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[,\s$]/g, ''));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};

export function clean1031Input(raw: Partial<Record<keyof Ex1031Input, unknown>>): Ex1031Input {
  const d = EX1031_DEFAULTS;
  const state = (STATE_PRESETS.find((p) => p.id === raw.state)?.id ?? d.state) as StateId;
  const fed = num(raw.fedRatePct, d.fedRatePct, 0, 20);
  return {
    salePrice: num(raw.salePrice, d.salePrice, 0, 1e9),
    sellingCostPct: num(raw.sellingCostPct, d.sellingCostPct, 0, 20),
    costBasis: num(raw.costBasis, d.costBasis, 0, 1e9),
    depreciation: num(raw.depreciation, d.depreciation, 0, 1e9),
    replacementPrice: num(raw.replacementPrice, d.replacementPrice, 0, 1e9),
    cashOut: num(raw.cashOut, d.cashOut, 0, 1e9),
    fedRatePct: [0, 15, 20].includes(fed) ? fed : 20,
    niit: raw.niit === undefined ? d.niit : raw.niit === true || raw.niit === 'true',
    state,
    stateRatePct: num(raw.stateRatePct, d.stateRatePct, 0, 20)
  };
}

function taxOn(amount: number, recapturePart: number, i: Ex1031Input) {
  const rec = Math.min(amount, recapturePart);
  const rest = Math.max(0, amount - rec);
  const recapture = (rec * RECAPTURE_RATE) / 100;
  const federal = (rest * i.fedRatePct) / 100;
  const niit = i.niit ? (amount * NIIT_RATE) / 100 : 0;
  const state = (amount * i.stateRatePct) / 100;
  return { recapture, federal, niit, state, total: recapture + federal + niit + state };
}

export function calc1031(raw: Partial<Record<keyof Ex1031Input, unknown>>): Ex1031Result {
  const i = clean1031Input(raw);
  const netSale = i.salePrice * (1 - i.sellingCostPct / 100);
  const adjustedBasis = Math.max(0, i.costBasis - i.depreciation);
  const gain = Math.max(0, netSale - adjustedBasis);
  const recapture = Math.min(gain, i.depreciation);
  const capitalGain = gain - recapture;
  const taxIfSold = taxOn(gain, recapture, i);
  const boot = Math.min(gain, Math.max(i.cashOut, netSale - i.replacementPrice, 0));
  const now = taxOn(boot, recapture, i);
  const deferredGain = gain - boot;
  return {
    netSale,
    adjustedBasis,
    gain,
    recapture,
    capitalGain,
    taxIfSold,
    boot,
    taxNow: now.total,
    deferred: taxIfSold.total - now.total,
    deferredGain,
    newBasis: Math.max(0, i.replacementPrice - deferredGain)
  };
}
