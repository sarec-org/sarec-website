-- SAREC 档位 seed —— 由 scripts/generate-tier-seed.mjs 生成，请勿手工编辑。
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
  ('member', 'membership', '会员', 'Member', 20000, 20000, 'usd', NULL, false, 'SAREC Member', 12, false, NULL, NULL, true, 10),
  ('board', 'membership', '理事单位', 'Board Member Organization', 100000, 50000, 'usd', '2026 Launch Rate / 2026 年度推广价', true, 'SAREC Board Member Organization', 12, false, NULL, NULL, true, 20),
  ('exec_board', 'membership', '常务理事单位', 'Executive Board Member Organization', 200000, 100000, 'usd', '2026 Launch Rate / 2026 年度推广价', true, 'SAREC Executive Board Member Organization', 12, false, NULL, NULL, true, 30),
  ('vp', 'membership', '副会长单位', 'Vice President Organization', 600000, 300000, 'usd', '2026 Launch Rate / 2026 年度推广价', true, 'SAREC Vice President Organization', 12, false, NULL, NULL, true, 40),
  ('svp', 'membership', '常务副会长单位', 'Senior Vice President Organization', 0, 0, 'usd', NULL, false, 'SAREC Senior Vice President Organization', 12, false, NULL, NULL, false, 50),
  ('strategic_partner', 'strategic_partner', '战略合作伙伴', 'Strategic Partner', 600000, 600000, 'usd', NULL, false, 'SAREC Strategic Partner', 12, true, 300000, 300000, true, 60)
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
