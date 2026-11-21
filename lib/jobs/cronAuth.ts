/**
 * 找工人 · 接活儿 定时任务鉴权：Authorization: Bearer <CRON_SECRET 或 REMINDER_CRON_SECRET>；
 * 测试站（VERCEL_ENV=preview）另认 JOBS_CRON_TEST_SECRET（D14），正式环境即使误配了也不认。
 */
import { createHash, timingSafeEqual } from 'node:crypto';

function matches(provided: string, expected: string | undefined): boolean {
  if (!expected) return false;
  return timingSafeEqual(createHash('sha256').update(provided).digest(), createHash('sha256').update(expected).digest());
}

export function jobsCronAuthorized(req: Request): boolean {
  const m = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  const testSecret = process.env.VERCEL_ENV === 'preview' ? process.env.JOBS_CRON_TEST_SECRET : undefined;
  return !!m && (matches(m[1], process.env.CRON_SECRET) || matches(m[1], process.env.REMINDER_CRON_SECRET) || matches(m[1], testSecret));
}
