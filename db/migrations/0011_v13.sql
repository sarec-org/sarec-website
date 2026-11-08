-- 0011：SAREC 1.3
-- ------------------------------------------------------------------
-- 只追加，不改动已有数据；旧版小程序 1.2 用到的表和字段全部保留。可重复执行。

-- B. 带一位朋友 ------------------------------------------------------
-- 同行人：单独一条报名（单独占名额、单独签到），标记由谁代报名。
-- 不替朋友建正式账号：只建一份“占位档案”（is_placeholder = true，不能登录、不进营销名单），
-- 朋友第一次自己扫码 / 报名、手机号对上时并入他自己的档案。
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_placeholder boolean NOT NULL DEFAULT false;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS companion_of uuid REFERENCES registrations(id) ON DELETE SET NULL;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS added_by uuid REFERENCES contacts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS registrations_companion_of_idx ON registrations (companion_of) WHERE companion_of IS NOT NULL;
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_source_check;
ALTER TABLE registrations ADD CONSTRAINT registrations_source_check CHECK (source = ANY (ARRAY['online', 'onsite', 'staff', 'companion']));

-- F. 渠道码 + L. 功能排行 ------------------------------------------
-- 渠道：合作商家、合作机构、副会长单位……每个渠道一个 code（c-xxxx），小程序码带 ?channel=c-xxxx。
-- 统计口径沿用 1.2：带来源的访问 → 报名 → 到场 → 入会 / 有效咨询。
-- 归因：报名记录上的 channel_code = 最后一次带来这个人的渠道 / 功能；contacts.first_channel = 首次来源（只写一次）。
CREATE TABLE IF NOT EXISTS channels (
  id          bigserial PRIMARY KEY,
  code        text UNIQUE NOT NULL CHECK (code ~ '^c-[a-z0-9]{3,16}$'),
  name        text NOT NULL,
  kind        text NOT NULL DEFAULT 'merchant' CHECK (kind IN ('merchant', 'org', 'vp_unit', 'partner', 'other')),
  note        text,
  active      boolean NOT NULL DEFAULT true,
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS channel_code text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_channel text;
CREATE INDEX IF NOT EXISTS registrations_channel_code_idx ON registrations (channel_code) WHERE channel_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS track_events_channel_idx ON track_events (channel, created_at) WHERE channel IS NOT NULL;

-- C. 客户上传照片 + 美颜 ---------------------------------------------
-- 客户上传的照片属于用户生成内容：默认只有上传者和工作人员可见（visibility = private）；
-- 上传者勾选“放进活动相册”后公开：自动检查通过（本场已报名的人）直接进相册，否则进后台“内容审核”待办。
-- content_hash：完全相同的照片秒级识别、不重复存；phash：相似照片分组（后台做，不挡分享）。
-- 美颜版：variant_of 指向原照片（只生成本人的分享版，不覆盖相册原图；去重时不当成两张）。
ALTER TABLE event_photos ADD COLUMN IF NOT EXISTS uploader_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE event_photos ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'album';
ALTER TABLE event_photos ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'ok';
ALTER TABLE event_photos ADD COLUMN IF NOT EXISTS content_hash text;
ALTER TABLE event_photos ADD COLUMN IF NOT EXISTS phash text;
ALTER TABLE event_photos ADD COLUMN IF NOT EXISTS original_url text;
ALTER TABLE event_photos ADD COLUMN IF NOT EXISTS variant_of uuid REFERENCES event_photos(id) ON DELETE CASCADE;
ALTER TABLE event_photos ADD COLUMN IF NOT EXISTS variant text;
ALTER TABLE event_photos DROP CONSTRAINT IF EXISTS event_photos_visibility_check;
ALTER TABLE event_photos ADD CONSTRAINT event_photos_visibility_check CHECK (visibility IN ('private', 'album'));
ALTER TABLE event_photos DROP CONSTRAINT IF EXISTS event_photos_review_status_check;
ALTER TABLE event_photos ADD CONSTRAINT event_photos_review_status_check CHECK (review_status IN ('ok', 'review', 'rejected'));
CREATE UNIQUE INDEX IF NOT EXISTS event_photos_hash_uniq ON event_photos (event_id, content_hash) WHERE content_hash IS NOT NULL AND variant_of IS NULL;
CREATE INDEX IF NOT EXISTS event_photos_uploader_idx ON event_photos (uploader_contact_id, event_id) WHERE uploader_contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS event_photos_review_idx ON event_photos (review_status) WHERE review_status = 'review';

-- J. 活动后自动运营 --------------------------------------------------
-- 活动结束后由每天的定时任务自动跑一次：汇总签到和照片 → 照片去重分组、精选建议 → 回顾文章 / 分享文案 / 服务号推文初稿
-- → 助理在后台一次审核 → 发布（网站回顾、小程序相册；服务号推文复制后粘贴发布）→ 汇总需求、生成跟进任务 → 给到场的人推荐下一场。
-- AI 只写初稿，必须人工审核后才发布；小程序里不展示运行时 AI 内容。
CREATE TABLE IF NOT EXISTS event_recaps (
  event_id      uuid PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'drafted' CHECK (status IN ('drafted', 'published')),
  stats         jsonb,
  photo_groups  jsonb,          -- [{ pick: photoId, members: [photoId…] }]
  picks         uuid[],         -- 精选建议（工作人员可增减）
  recap_draft   text,           -- 活动回顾文章初稿
  share_draft   text,           -- 分享 / 邀请文案初稿
  oa_draft      text,           -- 服务号推文初稿
  thanks_draft  text,           -- 给带人来的会员的感谢
  needs         jsonb,          -- 活动中留下的需求汇总
  next_recs     jsonb,          -- 给到场的人推荐的下一场 { slug, title, count }
  drafted_by    text,           -- 'ai:<model>' / 'template'
  drafted_at    timestamptz NOT NULL DEFAULT now(),
  approved_by   text,
  published_at  timestamptz
);
-- 有明确用途的定时 AI 任务：每次调用一条记录（单次上限、计入月预算）
CREATE TABLE IF NOT EXISTS ai_task_log (
  id            bigserial PRIMARY KEY,
  task          text NOT NULL,
  ref           text,
  model         text,
  ok            boolean NOT NULL,
  input_tokens  int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  cost_micros   bigint NOT NULL DEFAULT 0,
  error         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_task_log_created_idx ON ai_task_log (created_at);

-- B 修订（测试 P1-5）：朋友名单只显示邀请人自己填的名字和号码，不回显档案里的真实姓名；
-- 手机号只用来匹配占位档案，不会把正式会员拉来报名。号码属于正式会员时，占位档案不存号码，号码存在这条报名上。
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS companion_name text;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS companion_phone text;
CREATE INDEX IF NOT EXISTS registrations_companion_phone_idx ON registrations (event_id, companion_phone) WHERE companion_phone IS NOT NULL;
