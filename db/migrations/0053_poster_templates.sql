-- 0053：1.7.0 海报模板库（服务器这一半）。
-- 小程序「出海报」先选一张模板底图（节日、聚会、讲座……），服务器把活动名称、时间、地点、主办方、报名码印在模板的信息位上出成品图。
-- - poster_categories：模板分类（圣诞节、春节……），tier 1/2/3 决定在小程序里排前排后；sort 同 tier 内的顺序。
-- - poster_templates：一张模板 = Blob 里一张大图（1080×1620）+ 一张小图（300×450）。code 是导入用的编号（如 christmas-r5、christmas-S01）。
--   box：信息位 [x0,y0,x1,y1]，0–1 归一化；NULL = 第一批老图，出图时用默认底部区域并垫半透明深色底板。
--   version：换图时 +1（图片地址里带版本号，小程序和 CDN 缓存自动换新）。uses：发布活动时选了这张就 +1。
-- - org_events.poster_tpl：主办方活动选的模板（不选 = 和以前一样出老海报）。模板删掉时置空。
-- - crm_settings.poster_upload_on：「传自己的海报」开关，默认关（要先在微信后台核清服务类目再开）。
-- - org_poster_uploads：主办方「传自己的海报」上传的图（开关关着时接口直接 403）。ai_generated = 上传时主办方自己勾的「这是 AI 生成的图」，
--   勾了出图时照样画「AI 生成」标识。图过微信图片检测（image_checks，target = org_poster:<id>）；**二维码拦截还没做，开开关前要补**。
--   org_events.poster_own：活动用的自己的海报（优先于模板）。
-- 只建新表 / 加列；可重复执行；老数据一行不动。

CREATE TABLE IF NOT EXISTS poster_categories (
  key        text PRIMARY KEY,
  name       text NOT NULL,
  tier       int NOT NULL DEFAULT 3,
  sort       int NOT NULL DEFAULT 0,
  active     boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS poster_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text UNIQUE,
  category_key text NOT NULL REFERENCES poster_categories(key),
  name         text NOT NULL,
  image_url    text NOT NULL,
  thumb_url    text NOT NULL,
  box          jsonb,
  ink          text,
  layout       int NOT NULL DEFAULT 1,
  sort         int NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  source       text,
  version      int NOT NULL DEFAULT 1,
  uses         int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS poster_templates_cat_idx ON poster_templates (category_key, status, sort);

ALTER TABLE org_events ADD COLUMN IF NOT EXISTS poster_tpl uuid REFERENCES poster_templates(id) ON DELETE SET NULL;

INSERT INTO crm_settings (key, value) VALUES ('poster_upload_on', 'false') ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS org_poster_uploads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id    uuid NOT NULL,
  organizer_id  uuid,
  url           text NOT NULL,
  width         int,
  height        int,
  ai_generated  boolean NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS org_poster_uploads_contact_idx ON org_poster_uploads (contact_id, created_at DESC);
ALTER TABLE org_events ADD COLUMN IF NOT EXISTS poster_own uuid REFERENCES org_poster_uploads(id) ON DELETE SET NULL;

