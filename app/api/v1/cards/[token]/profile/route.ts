/** GET /api/v1/cards/:token/profile —— 1.5.0 别人看到的个人主页（只给已通过的内容） */
import { publicProfile } from '@/lib/crm/ugc';
import { handler, ok } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (_req: Request, { params }: { params: { token: string } }) => ok({ profile: await publicProfile(params.token) }));
