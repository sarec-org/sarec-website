-- 0022：1.3.1 D 电子名片工具与名片夹
-- ------------------------------------------------------------------
-- 只追加，可重复执行。
--  - 4 款模板：navy 深蓝金商务 / white 简约白 / bilingual 中英双语 / estate 地产项目（可放一张项目照片）。
--  - 字段：姓名、公司、职位、手机、微信、邮箱、行业、一句话介绍（已有资料自动带入）；中英双语多英文名 / 英文公司 / 英文职位。
--  - 交换名片：扫对方名片码 → “存入名片夹并回递我的名片” → 对方同意后双方互存（双方同意才互存）。
--  - 名片夹按“在哪场活动认识”分组，可写一句备注。
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS template text NOT NULL DEFAULT 'navy';
DO $$ BEGIN
  ALTER TABLE member_cards ADD CONSTRAINT member_cards_template_check CHECK (template IN ('navy','white','bilingual','estate'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS company_en text;
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS title_en text;
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS project_photo_url text;

CREATE TABLE IF NOT EXISTS card_exchanges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id    uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,   -- 扫码、点“存入名片夹并回递”的人
  target_id       uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,   -- 被扫名片的人（同意后双方互存）
  event_id        uuid REFERENCES events(id) ON DELETE SET NULL,             -- 在哪场活动认识
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  requester_note  text,
  target_note     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  decided_at      timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS card_exchanges_pair_uidx
  ON card_exchanges (LEAST(requester_id, target_id), GREATEST(requester_id, target_id)) WHERE status <> 'declined';
CREATE INDEX IF NOT EXISTS card_exchanges_target_idx ON card_exchanges (target_id, status);
