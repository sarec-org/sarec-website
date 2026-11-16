/** GET /api/v1/docs/intro —— 商会介绍那一份（后台标的；没标用 sarec-intro）。没有时 doc 为 null（东哥 11/15 R2） */
import { handler, ok, siteUrl } from '@/lib/crm/http';
import { introDoc } from '@/lib/docs/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => ok({ doc: await introDoc(siteUrl(req)) }));
