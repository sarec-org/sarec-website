-- 0009：SAREC 1.2 H / H2 —— 商会 AI 助手（对话、消息与花费、常见问题库、答案缓存、每日用量、限流、邮件去重）
-- ------------------------------------------------------------------
-- 只新增表和配置项，不改动已有表。
-- 原则：
--   · 只有访客发消息时才可能调用模型；本迁移不建任何定时任务。
--   · 访客 IP 只存加盐哈希（按天加盐），不存明文 IP。
--   · 花费单位：美元的百万分之一（micro-USD，bigint），避免浮点误差。
-- ------------------------------------------------------------------

-- ── 1. 对话 ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_conversations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id       text NOT NULL,                              -- 网站一方 cookie（sarec_av）
  contact_id       uuid REFERENCES contacts(id) ON DELETE SET NULL,
  ip_hash          text,                                       -- 加盐哈希
  user_agent       text,
  page             text,                                       -- home / article / event
  page_slug        text,
  page_title       text,
  lang             text NOT NULL DEFAULT 'zh' CHECK (lang IN ('zh','en')),
  audience         text NOT NULL DEFAULT 'visitor' CHECK (audience IN ('visitor','logged_in','registered','member')),
  turns            integer NOT NULL DEFAULT 0,                 -- 访客提问条数
  summary          text,                                       -- 超过 6 轮后压缩的摘要
  summarized_until bigint NOT NULL DEFAULT 0,                  -- 已压缩到哪条消息 id（含）
  is_lead          boolean NOT NULL DEFAULT false,
  lead_info        jsonb NOT NULL DEFAULT '{}'::jsonb,         -- need / region / timeline / wantsCall / name / phone / email / wechat
  followup_id      uuid REFERENCES followups(id) ON DELETE SET NULL,
  inquiry_id       uuid REFERENCES inquiries(id) ON DELETE SET NULL,
  lead_at          timestamptz,                                -- 访客确认提交线索的时间
  registered_slugs text[] NOT NULL DEFAULT '{}',               -- 通过助手完成报名的活动
  cost_micros      bigint NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_message_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_conv_time ON agent_conversations (last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_conv_visitor ON agent_conversations (visitor_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_conv_lead ON agent_conversations (lead_at DESC) WHERE lead_at IS NOT NULL;

-- ── 2. 消息（每条回答记录级别、模型、token、花费、是否走缓存）────────────────
CREATE TABLE IF NOT EXISTS agent_messages (
  id                 bigserial PRIMARY KEY,
  conversation_id    uuid NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  role               text NOT NULL CHECK (role IN ('user','assistant','event')),
  content            text NOT NULL,
  tier               smallint CHECK (tier IN (0,1,2)),         -- 0 常见问题库/规则 · 1 便宜模型 · 2 好模型
  route              text,                                     -- faq / boundary / cache / model / fallback / limit / budget / lead_rule ...
  model              text,
  input_tokens       integer NOT NULL DEFAULT 0,
  output_tokens      integer NOT NULL DEFAULT 0,
  cache_read_tokens  integer NOT NULL DEFAULT 0,
  cache_write_tokens integer NOT NULL DEFAULT 0,
  cost_micros        bigint NOT NULL DEFAULT 0,
  cached             boolean NOT NULL DEFAULT false,           -- 24 小时答案缓存命中
  faq_id             integer,
  intent             text,
  action             jsonb,                                    -- 给访客的确认卡片（只是提议，访客点击才提交）
  flags              text[] NOT NULL DEFAULT '{}',
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_msg_conv ON agent_messages (conversation_id, id);
CREATE INDEX IF NOT EXISTS idx_agent_msg_time ON agent_messages (created_at DESC);

-- ── 3. 常见问题库（第 0 级，后台可编辑）──────────────────────────────────
-- keywords：任一条命中即算匹配；一条里用 + 连接表示“同时出现”（例：活动+时间）。
-- answer 中可用占位符：{next_event}（数据库最近一场活动）、{events_list}（近期 3 场）。
CREATE TABLE IF NOT EXISTS agent_faq (
  id          serial PRIMARY KEY,
  intent      text UNIQUE NOT NULL,
  title       text NOT NULL,
  keywords    text[] NOT NULL DEFAULT '{}',
  answer_zh   text NOT NULL,
  answer_en   text,
  priority    integer NOT NULL DEFAULT 0,                      -- 同分时优先级高的先
  is_active   boolean NOT NULL DEFAULT true,
  hits        integer NOT NULL DEFAULT 0,
  updated_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 4. 同一问题 24 小时答案缓存（只缓存无上下文的单个问题）────────────────────
CREATE TABLE IF NOT EXISTS agent_answer_cache (
  key         text PRIMARY KEY,                                -- sha256(语言 + 规范化问题 + 档位)
  lang        text NOT NULL,
  question    text NOT NULL,
  reply       text NOT NULL,
  tier        smallint NOT NULL,
  model       text,
  hits        integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agent_cache_exp ON agent_answer_cache (expires_at);

-- ── 5. 每日用量（洛杉矶日期；看板与预算都读这里）─────────────────────────────
CREATE TABLE IF NOT EXISTS agent_daily (
  day          date PRIMARY KEY,
  calls        integer NOT NULL DEFAULT 0,                     -- 回答的访客消息条数
  tier0        integer NOT NULL DEFAULT 0,
  tier1        integer NOT NULL DEFAULT 0,
  tier2        integer NOT NULL DEFAULT 0,
  cache_hits   integer NOT NULL DEFAULT 0,
  model_calls  integer NOT NULL DEFAULT 0,                     -- 实际调用模型次数（含摘要压缩）
  blocked      integer NOT NULL DEFAULT 0,                     -- 确认机器人，直接拦截
  slowed       integer NOT NULL DEFAULT 0,                     -- 可疑，降速 / 人机验证
  limited      integer NOT NULL DEFAULT 0,                     -- 访客超出每日条数
  leads        integer NOT NULL DEFAULT 0,                     -- 访客确认提交的线索
  input_tokens bigint NOT NULL DEFAULT 0,
  output_tokens bigint NOT NULL DEFAULT 0,
  cost_micros  bigint NOT NULL DEFAULT 0
);

-- ── 6. 访客限流 / 可疑判断（按 cookie 与 IP 哈希分别计数，每天一行）────────────
CREATE TABLE IF NOT EXISTS agent_rate (
  key            text NOT NULL,                                -- v:<visitor> / ip:<hash>
  day            date NOT NULL,
  count          integer NOT NULL DEFAULT 0,
  last_at        timestamptz,
  burst_start    timestamptz,
  burst_count    integer NOT NULL DEFAULT 0,
  last_hash      text,
  repeat_count   integer NOT NULL DEFAULT 0,
  strikes        integer NOT NULL DEFAULT 0,                   -- 可疑次数
  verified_until timestamptz,                                  -- 人机验证通过后的免检期
  turnstile_fails integer NOT NULL DEFAULT 0,
  blocked        boolean NOT NULL DEFAULT false,
  PRIMARY KEY (key, day)
);

-- ── 7. 邮件去重（每日汇总、70% 预算提醒）────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_notices (
  key        text PRIMARY KEY,                                 -- digest:2026-11-05 / budget70:day:2026-11-05 / budget70:month:2026-11
  kind       text NOT NULL,
  status     text NOT NULL DEFAULT 'sending' CHECK (status IN ('sending','sent','failed')),
  error      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at    timestamptz
);

-- ── 8. 配置项（后台可改；不存密钥）────────────────────────────────────
INSERT INTO crm_settings (key, value) VALUES
  ('agent_budget_monthly_usd', '30'),
  ('agent_budget_test_pct',    'null')
ON CONFLICT (key) DO NOTHING;

-- ── 9. 常见问题库初始内容（后台可改；不写会员价格、不写任何回报数字）──────────────
INSERT INTO agent_faq (intent, title, keywords, answer_zh, answer_en, priority) VALUES
  ('event_time', '近期活动时间地点',
   ARRAY['活动+时间','活动+地点','活动+哪里','活动+几点','活动+什么时候','什么时候+活动','下一场','近期活动','最近+活动','有什么活动','有活动吗','next event','upcoming event','event+when','event+where'],
   E'{next_event}\n\n想报名的话，直接跟我说“帮我报名”，我会把报名卡片给您，您确认后才会提交。全部活动：/zh/events#open',
   E'{next_event}\n\nIf you would like to register, just say "register me" and I will show a confirmation card — nothing is submitted until you confirm. All events: /zh/events',
   20),
  ('how_register', '怎么报名活动',
   ARRAY['怎么报名','如何报名','报名+流程','报名+怎么','报名+方法','在哪报名','how+register','how+sign up','registration'],
   E'报名在活动页完成：老朋友一键报名，资料自动带出；第一次报名只填三项——姓名、手机和行业（邮箱选填，填了会收到确认邮件）。\n也可以在这里说“帮我报名”，我把报名卡片给您，您确认后才提交。近期活动：/zh/events#open',
   E'Registration is done on the event page: returning guests register in one tap with saved details; first-timers fill in just three fields — name, phone and industry (email optional, for a confirmation email).\nYou can also say "register me" here and I will show a confirmation card; nothing is submitted until you confirm. Upcoming events: /zh/events',
   15),
  ('how_join', '怎么入会',
   ARRAY['怎么入会','如何入会','申请入会','加入商会','入会+流程','入会+怎么','成为会员','怎么+加入','如何+加入','怎么成为会员','join+chamber','become+member','how+join','membership+apply'],
   E'入会全程在线自助：选择档位 → 确认协议 → 在线付款 → 到账生效（刷卡即时生效，Zelle 核对到账后生效）。\n各档权益：/zh/membership　入会页：/zh/join\n拿不准选哪一档，也可以留下联系方式，我请同事和您聊聊。',
   E'Joining is fully online: choose a tier, confirm the agreement, pay online, and membership starts once payment is received (card payments are instant; Zelle after we confirm receipt).\nTier benefits: /zh/membership  Apply: /zh/join\nIf you are unsure which tier fits, leave your contact and a colleague will reach out.',
   15),
  ('address', '商会地址',
   ARRAY['地址','办公室+哪','办公室+在','商会+在哪','怎么去','怎么过去','address','office+where','where+located'],
   E'商会办公室地址：500 S Hacienda Blvd, City of Industry, CA 91745。\n来访前建议先发邮件到 info@sinoamericanrec.org 或致电 +1 (626) 658-6066 约个时间。活动地点以每场活动页为准。',
   E'Our office: 500 S Hacienda Blvd, City of Industry, CA 91745.\nPlease email info@sinoamericanrec.org or call +1 (626) 658-6066 before visiting. Each event''s venue is listed on its event page.',
   10),
  ('contact', '联系方式',
   ARRAY['联系方式','怎么联系','联系你们','电话','邮箱','客服','人工','contact','email','phone','talk to+person'],
   E'邮箱 info@sinoamericanrec.org，电话 +1 (626) 658-6066，1 个工作日内回复。\n也可以直接在这里留下需求和联系方式，我整理好转给同事跟进。',
   E'Email info@sinoamericanrec.org or call +1 (626) 658-6066 — we reply within one business day.\nYou can also leave your need and contact details here and I will pass them to a colleague.',
   8),
  ('benefits', '会员权益',
   ARRAY['会员权益','会员+好处','会员+有什么','会员+福利','权益','入会+好处','member+benefit','benefits'],
   E'会员可以参加商会公开活动、讲座和沙龙，优先收到市场简报和活动通知，加入会员社群；正式会员在办公室开放期间可随时来喝茶交流，可带朋友和客户。\n理事及以上档位另有企业身份展示、官网展示、活动露出与资源协同等（展示、发言类权益经审核与排期后安排）。\n各档详细权益：/zh/membership',
   E'Members can join our public events, talks and salons, receive market briefs and event notices first, and join the member community; paid members are welcome at the office during opening hours, guests included.\nDirector-level tiers and above add company recognition, website listing, event visibility and resource coordination (presentation-type benefits are arranged after review and scheduling).\nFull details: /zh/membership',
   10),
  ('about', '商会是做什么的',
   ARRAY['商会是什么','sarec是什么','你们是做什么','你们做什么','介绍一下商会','介绍+商会','商会+做什么','商会+干什么','商会+是干嘛','你们+干什么','你们+是干嘛','sarec+做什么','what is sarec','about sarec','who are you'],
   E'SAREC 中美房地产商会以商会为入口，围绕中美房地产项目做判断、结构设计和风险控制：提供研究、培训、活动和考察，也提供项目咨询与结构设计；不作为施工开发主体，也不设资金池。\n了解更多：/zh/about',
   E'SAREC (Sino-American Real Estate Chamber) uses the chamber as an entry point and focuses on project judgment, structuring and risk control for cross-border real estate: research, training, events and study tours, plus project advisory and structuring. We are not a developer and do not pool funds.\nMore: /zh/about',
   5)
ON CONFLICT (intent) DO NOTHING;
