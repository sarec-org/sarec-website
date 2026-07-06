-- ============================================================
-- SAREC Membership Operations Workflow V1 — 运营状态字段
-- ------------------------------------------------------------
-- 只【新增】列,不改现有结构、不动现有数据(additive, nullable)。
-- operations_status 运营流转状态(秘书工作台用),取值:
--   paid_under_review   已付款 / 待审核（webhook 付款成功后自动置:普通会员）
--   need_more_info      需补资料
--   needs_owner_review  需东哥确认（webhook 付款成功后自动置:理事及以上 / 战略合作伙伴）
--   approved            已通过
--   onboarding_completed 已完成入会
--   rejected            已拒绝
--   refund_pending      退款待确认
-- 现有记录 operations_status 为 NULL(工作台按「待处理/未分类」呈现),不回填。
-- ============================================================

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS operations_status text,
  ADD COLUMN IF NOT EXISTS operations_notes  text,
  ADD COLUMN IF NOT EXISTS reviewed_by       text,
  ADD COLUMN IF NOT EXISTS reviewed_at       timestamptz;

-- 工作台默认按运营状态 + 付款时间检索,建索引加速。
CREATE INDEX IF NOT EXISTS idx_applications_operations_status
  ON applications (operations_status);
