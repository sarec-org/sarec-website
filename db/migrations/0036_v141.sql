-- 1.4.1（东哥 11/13 23:28 点头的默认方案）
-- 1) 讲座资料分级：每份资料可选“所有人 / 仅会员”，可挂到某场活动；注册用户看前几页预览
ALTER TABLE chamber_docs ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all';
ALTER TABLE chamber_docs DROP CONSTRAINT IF EXISTS chamber_docs_audience_check;
ALTER TABLE chamber_docs ADD CONSTRAINT chamber_docs_audience_check CHECK (audience IN ('all', 'members'));
ALTER TABLE chamber_docs ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE chamber_docs ADD COLUMN IF NOT EXISTS preview_pages integer NOT NULL DEFAULT 3;

-- 2) 会员保留座位（默认 0 = 和现在一样）
ALTER TABLE events ADD COLUMN IF NOT EXISTS member_reserved_seats integer NOT NULL DEFAULT 0;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_member_reserved_seats_check;
ALTER TABLE events ADD CONSTRAINT events_member_reserved_seats_check CHECK (member_reserved_seats >= 0);

-- 3) 找人：“让商会里的人能搜到我”。NULL = 还没问过（第一次进人脉页问一次），不默认开也不默认关
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS searchable boolean;

-- 4) 工作台到场名单：工作人员当场给客人写的备注
CREATE TABLE IF NOT EXISTS contact_staff_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_staff_notes_contact_idx ON contact_staff_notes (contact_id, created_at DESC);
