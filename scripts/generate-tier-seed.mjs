#!/usr/bin/env node
/**
 * 生成 db/seed/0001_membership_tiers.sql ——「唯一价格源」的下游产物。
 * ------------------------------------------------------------------
 * 价格数字只存在于 lib/membership/tiers.data.json（tiers.ts 也读它）。
 * 本脚本从同一份 JSON 生成幂等 upsert seed，绝不手写第二份价格。
 * 用法：  node scripts/generate-tier-seed.mjs
 * 改价流程：改 tiers.data.json → 跑本脚本 → 提交生成后的 seed。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA = resolve(ROOT, 'lib/membership/tiers.data.json');
const OUT = resolve(ROOT, 'db/seed/0001_membership_tiers.sql');

const tiers = JSON.parse(readFileSync(DATA, 'utf8'));

const sqlStr = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const sqlNum = (v) => (v === null || v === undefined ? 'NULL' : String(v));
const sqlBool = (v) => (v ? 'true' : 'false');

const rows = tiers
  .map((t) => {
    const cols = [
      sqlStr(t.slug),
      sqlStr(t.category),
      sqlStr(t.nameZh),
      sqlStr(t.nameEn),
      sqlNum(t.standardPriceCents),
      sqlNum(t.currentPriceCents),
      sqlStr(t.currency),
      sqlStr(t.promotionLabel),
      sqlBool(t.isPromotionActive),
      sqlStr(t.stripeProductName),
      sqlNum(t.membershipTermMonths),
      sqlBool(t.supportsSemiAnnual),
      sqlNum(t.firstPaymentAmountCents),
      sqlNum(t.secondPaymentAmountCents),
      sqlBool(t.isActive),
      sqlNum(t.sortOrder)
    ];
    return `  (${cols.join(', ')})`;
  })
  .join(',\n');

const out = `-- SAREC 档位 seed —— 由 scripts/generate-tier-seed.mjs 生成，请勿手工编辑。
-- 单一价格源 = lib/membership/tiers.data.json。改价改 JSON 后重跑脚本。
-- 幂等 upsert；价格一律 cents；svp 仅预留（is_active = false）。

INSERT INTO membership_tiers
  (slug, category, name_zh, name_en,
   standard_price_cents, current_price_cents, currency,
   promotion_label, is_promotion_active,
   stripe_product_name, membership_term_months,
   supports_semi_annual, first_payment_amount_cents, second_payment_amount_cents,
   is_active, sort_order)
VALUES
${rows}
ON CONFLICT (slug) DO UPDATE SET
  category                     = EXCLUDED.category,
  name_zh                      = EXCLUDED.name_zh,
  name_en                      = EXCLUDED.name_en,
  standard_price_cents         = EXCLUDED.standard_price_cents,
  current_price_cents          = EXCLUDED.current_price_cents,
  currency                     = EXCLUDED.currency,
  promotion_label              = EXCLUDED.promotion_label,
  is_promotion_active          = EXCLUDED.is_promotion_active,
  stripe_product_name          = EXCLUDED.stripe_product_name,
  membership_term_months       = EXCLUDED.membership_term_months,
  supports_semi_annual         = EXCLUDED.supports_semi_annual,
  first_payment_amount_cents   = EXCLUDED.first_payment_amount_cents,
  second_payment_amount_cents  = EXCLUDED.second_payment_amount_cents,
  is_active                    = EXCLUDED.is_active,
  sort_order                   = EXCLUDED.sort_order,
  updated_at                   = now();
`;

writeFileSync(OUT, out);
console.log(`generated ${OUT} from ${DATA} (${tiers.length} tiers)`);
