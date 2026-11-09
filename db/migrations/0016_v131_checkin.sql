-- 0016：1.3.1 A 签到与注册重做（东哥 11/8）
-- ------------------------------------------------------------------
-- 只追加，可重复执行；不改已有列的含义，只加可空的新列和新表。
--  1) 签到选择题题库（后台维护，不写死）：来过的人每次扫码答 1–3 道，按“档案缺什么”排序。
--  2) 每人一个不变的内部编号（contacts.id / member_no）：别的微信登录身份、合并掉的重复档案都用 merged_into 指向它。
--     登录时顺着 merged_into 找到主档案，换微信、换手机号都不丢报名和积分。
--  3) 合并记录（可撤销）：合并时搬走了哪些行都记下来，撤销时原样搬回。
--  4) 常驻地区：本人填写的（region_self）和系统推断的（region_inferred）分开存（E 段也用）。

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS merged_into uuid REFERENCES contacts(id);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS region_self text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS region_inferred text;
CREATE INDEX IF NOT EXISTS contacts_merged_into_idx ON contacts (merged_into) WHERE merged_into IS NOT NULL;

-- 同一场活动：选择题只问一次；“了解入会”只出现一次
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS ck_asked_at timestamptz;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS join_hint_at timestamptz;

CREATE TABLE IF NOT EXISTS checkin_questions (
  key         text PRIMARY KEY,                     -- region / profession / focus / ...
  prompt      text NOT NULL,
  options     text[] NOT NULL,
  sort        integer NOT NULL DEFAULT 100,         -- 越小越先问
  is_active   boolean NOT NULL DEFAULT true,
  allow_text  boolean NOT NULL DEFAULT true,        -- 题下“愿意多写一点”
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO checkin_questions (key, prompt, options, sort) VALUES
  ('region',     '您常住在哪里？',               ARRAY['洛杉矶/橙县','旧金山湾区','纽约','美国其他','中国大陆','其他'], 10),
  ('profession', '您主要做哪一块？',             ARRAY['开发商','经纪','贷款','投资人','律师会计','建筑装修','其他'], 20),
  ('focus',      '您最近最关心什么？',           ARRAY['买房自住','投资出租','开发项目','融资贷款','税务身份','其他'], 30),
  ('heard',      '您是怎么知道商会的？',         ARRAY['朋友介绍','微信群','公众号/视频号','网站搜索','其他'], 40),
  ('frequency',  '您希望多久参加一次活动？',     ARRAY['每月','每季度','有合适主题再来'], 50)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS contact_merges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kept_id     uuid NOT NULL REFERENCES contacts(id),
  merged_id   uuid NOT NULL REFERENCES contacts(id),
  moved       jsonb NOT NULL DEFAULT '{}',          -- {表名: [行 id…]}：撤销时搬回
  added       jsonb NOT NULL DEFAULT '{}',          -- 合并时新加的行（例如重复积分的冲销）：撤销时删除
  reason      text,
  merged_by   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  undone_at   timestamptz,
  undone_by   text
);
CREATE INDEX IF NOT EXISTS contact_merges_kept_idx ON contact_merges (kept_id, created_at DESC);

-- 疑似重复里“不是同一个人”的标记（助理确认过的不再提示）
CREATE TABLE IF NOT EXISTS contact_not_duplicates (
  a_id        uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  b_id        uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  marked_by   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (a_id, b_id)
);
