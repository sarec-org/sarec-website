-- 名片模板库（105 款）：名片新增 地址、公司 logo；地址可选择是否公开（默认公开，与网站 / 地区一致）。
-- template 列原来存 navy / white / bilingual / estate，现在存模板编号（如 '90'）；旧名字仍可用（服务器对到新模板）。
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS show_address boolean NOT NULL DEFAULT true;
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS logo_url text;
-- 原来只允许四个旧模板名：放开为 旧名字 或 1–3 位模板编号
ALTER TABLE member_cards DROP CONSTRAINT IF EXISTS member_cards_template_check;
ALTER TABLE member_cards ADD CONSTRAINT member_cards_template_check CHECK (template ~ '^(navy|white|bilingual|estate|[0-9]{1,3})$');
