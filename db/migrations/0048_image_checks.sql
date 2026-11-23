-- 0048：用户传的图片"检测完才公开"（指令 36 第 2 条 b，11/22）。
-- 微信已没有同步的图片检测接口（imgSecCheck 1.0 已从官方文档撤掉），只剩异步的 mediaCheckAsync，结果要靠「消息推送」回来。
-- 所以：新传的图先只有本人看得到（"图片检测中"），微信推回"通过"或工作人员在后台放行后才对别人显示。
-- 只加表、放宽两个状态约束（加一个值 'checking'），可重复执行；老数据一行不动。
-- 顺序：先改约束，最后建表——代码以"image_checks 表存在"判断这次迁移跑过没有。

-- 项目 / 案例：checking = 有图片在检测中，只有本人看得到
ALTER TABLE profile_projects DROP CONSTRAINT IF EXISTS profile_projects_status_check;
ALTER TABLE profile_projects ADD CONSTRAINT profile_projects_status_check CHECK (status IN ('ok', 'pending', 'checking', 'rejected', 'taken_down'));

-- 活动相册照片：checking = 图片检测中，只有上传的人看得到
ALTER TABLE event_photos DROP CONSTRAINT IF EXISTS event_photos_review_status_check;
ALTER TABLE event_photos ADD CONSTRAINT event_photos_review_status_check CHECK (review_status IN ('ok', 'review', 'checking', 'rejected'));

-- 每张要检测的图一行。target：project:<项目id> / photo:<照片id> / avatar:<联系人id> / logo:<联系人id> / card_photo:<联系人id> / club_qr:<俱乐部key>
-- 头像、公司 logo、名片项目照片、俱乐部群二维码这种"一个位置一张图"的：通过之前原来那一格不变（别人看到的还是旧图），本人看到新图。
CREATE TABLE IF NOT EXISTS image_checks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url         text NOT NULL,
  target      text NOT NULL,
  contact_id  uuid,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'pass', 'risky', 'rejected', 'superseded')),
  trace_id    text,                 -- 微信 mediaCheckAsync 的任务号，推回结果时按它找
  note        text,                 -- 人话：为什么还在等（测试站不检测 / 没拿到微信身份 / 微信接口出错 / 微信建议人工看一眼）
  meta        jsonb,                -- 群二维码的到期日等
  created_at  timestamptz NOT NULL DEFAULT now(),
  decided_at  timestamptz,
  decided_by  text                  -- machine = 微信推回的结果；其他 = 后台放行 / 下架的工作人员
);
CREATE INDEX IF NOT EXISTS image_checks_url_idx ON image_checks (url);
CREATE INDEX IF NOT EXISTS image_checks_trace_idx ON image_checks (trace_id) WHERE trace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS image_checks_pending_idx ON image_checks (target, created_at DESC) WHERE status = 'pending';
