/** GET /api/v1/org/promise —— 《主办方数据承诺》全文（开通页、报名页「怎么用你的信息」都看这一份） */
import { handler, ok } from '@/lib/crm/http';
import { promise } from '@/lib/org/service';
import { disclosure } from '@/lib/org/texts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async () => ok({ ...promise(), sample: disclosure('XX') }));
