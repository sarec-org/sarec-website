-- 0010：SAREC 1.2 —— 电子名片内容审核（用户生成内容：姓名、公司、职位、业务介绍、微信号、头像）
-- ------------------------------------------------------------------
-- 只新增列，不改已有数据。
-- 先发后审：会员保存后名片即可分享；文本先过微信内容安全接口（msgSecCheck），明显违规的直接拒绝保存，
-- 有疑似问题的照常保存但标“需人工复核”；工作人员在后台“名片审核”逐条查看，可下架 / 恢复 / 清除头像。
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS content_updated_at timestamptz;   -- 名片文字或头像最近一次修改
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;          -- 工作人员最近一次审核
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS reviewed_by text;
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS sec_check text;                    -- 微信内容安全结果：pass / review / skipped / error
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS hidden_at timestamptz;            -- 下架时间（下架后别人打开显示“名片已下架”）
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS hidden_reason text;
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS hidden_by text;
CREATE INDEX IF NOT EXISTS member_cards_review_idx ON member_cards (content_updated_at DESC) WHERE content_updated_at IS NOT NULL;
