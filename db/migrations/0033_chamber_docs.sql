-- 0033：商会资料（公司 PPT 介绍等，小程序里可看、可转发；东哥 11/11，1.3.3）
-- 只新建表，可重复执行，不改已有数据。
-- chamber_docs：每份资料（标题、一句话说明、封面、排序、是否公开、PDF 原件、逐页图片、内容红线提醒、打开 / 转发次数）
-- chamber_doc_events：每次打开 / 转发 / 看 PDF 记一行（带推荐人，沿用现有推荐记录口径）
CREATE TABLE IF NOT EXISTS chamber_docs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  title         text NOT NULL,
  summary       text,
  cover_url     text,
  sort_order    integer NOT NULL DEFAULT 0,
  is_public     boolean NOT NULL DEFAULT false,
  pdf_url       text,
  pdf_bytes     integer,
  pages         jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{ url, w, h }]
  red_flags     jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{ page, words: [] }]（PDF 里读到的金额 / 会费 / 收益字样，只提醒）
  text_readable boolean,                              -- PDF 里有没有读得到的文字（图片做的 PDF 读不到，需要人工核）
  open_count    integer NOT NULL DEFAULT 0,
  share_count   integer NOT NULL DEFAULT 0,
  pdf_count     integer NOT NULL DEFAULT 0,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS chamber_doc_events (
  id          bigserial PRIMARY KEY,
  doc_id      uuid NOT NULL REFERENCES chamber_docs(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('open', 'share', 'pdf')),
  contact_id  uuid,
  ref         text,
  channel     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chamber_doc_events_doc_idx ON chamber_doc_events (doc_id, created_at DESC);
