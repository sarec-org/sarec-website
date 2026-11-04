-- 微信订阅消息：新增“报名成功确认”（kind = 'confirm'，报名后立即推送一次）
ALTER TABLE event_reminder_subs DROP CONSTRAINT IF EXISTS event_reminder_subs_kind_check;
ALTER TABLE event_reminder_subs ADD CONSTRAINT event_reminder_subs_kind_check CHECK (kind IN ('confirm','day_before','two_hours'));
