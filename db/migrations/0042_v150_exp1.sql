-- 1.5.0 体验1 · 第三部分（服务器）：匿名“微信用户”补填姓名手机号的提示节奏
-- 幂等（IF NOT EXISTS），可重复跑；只依赖 contacts 表（0001），不依赖 0037–0041。
--
-- 小程序在合适的时机（首页、我的页，不在签到、出错、付款时）问 GET /api/v1/me/fill-prompt 要不要提示补填；
-- 本人点“以后再说”记一次，7 天内不再提示；点过 3 次以后不再主动提示（本人在「我的」里随时能自己填）。
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS fill_prompt_snoozed_until timestamptz;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS fill_prompt_dismissals int NOT NULL DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS fill_prompt_filled_at timestamptz;
