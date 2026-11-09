/**
 * 1.3.1 I：共用触达记录 + 频率控制。
 * - 每次真的推出去一条（微信订阅消息、短信、邮件），记一笔：谁、什么类型、什么渠道、是不是服务通知。
 * - 推广 / 内容类推送（照片上传、通讯等）发之前查一下：这个人 24 小时内已经收到过别的类型 → 这次不推，改成首页显示。
 * - 服务通知（已报名活动的确认、候补递补、开课提醒）照常发，不受限制，但也记账。
 */
import { getPool } from '@/lib/db/client';

type Db = { query: ReturnType<typeof getPool>['query'] };

export async function recordTouch(db: Db, contactId: string | null | undefined, kind: string, channel: string, service = false): Promise<void> {
  if (!contactId) return;
  await db.query(`INSERT INTO contact_touches (contact_id, kind, channel, service) VALUES ($1, $2, $3, $4)`, [contactId, kind, channel, service]).catch(() => undefined);
}

/** 24 小时内收到过别的类型的推送 → 这次推广类推送不发（返回 true 表示“今天已经打扰过了”） */
export async function touchedToday(db: Db, contactId: string, kind: string): Promise<boolean> {
  const { rows } = await db.query(
    `SELECT 1 FROM contact_touches WHERE contact_id = $1 AND kind <> $2 AND created_at > now() - interval '24 hours' LIMIT 1`,
    [contactId, kind]
  ).catch(() => ({ rows: [] as unknown[] }));
  return !!rows[0];
}
