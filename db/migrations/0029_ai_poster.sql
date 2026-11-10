-- 0029：AI 海报（东哥 11/10）
-- 只新建表、追加配置，可重复执行，不改已有数据。
-- poster_gens：每次调画图 / 文字服务记一行（所用指令、服务商、模型、花费、结果图地址），用于“每场上限”和花费日志。
-- event_posters：每场活动当前选中的主视觉 + 文案（片名 / 宣传语 / 演职员表 / 主讲人真实照片）。

CREATE TABLE IF NOT EXISTS poster_gens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  batch_id    uuid NOT NULL,
  kind        text NOT NULL DEFAULT 'image' CHECK (kind IN ('image', 'copy')),
  event_type  text,
  style       text,
  provider    text NOT NULL,
  model       text,
  prompt      text NOT NULL,
  image_url   text,
  result      jsonb,
  cost_usd    numeric(10, 4) NOT NULL DEFAULT 0,
  status      text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'failed')),
  error       text,
  created_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS poster_gens_event_idx ON poster_gens (event_id, created_at DESC);

CREATE TABLE IF NOT EXISTS event_posters (
  event_id          uuid PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  gen_id            uuid REFERENCES poster_gens(id) ON DELETE SET NULL,
  style             text,
  film_title        text,
  tagline           text,
  host              text,
  speaker           text,
  co_host           text,
  speaker_photo_url text,
  image_cap         integer,
  updated_by        uuid,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 每场活动默认最多生成 12 张主视觉（后台可改；单场可在 event_posters.image_cap 单独调）
INSERT INTO crm_settings (key, value) VALUES ('poster_image_cap', '12') ON CONFLICT (key) DO NOTHING;
