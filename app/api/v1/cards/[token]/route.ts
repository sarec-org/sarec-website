/** GET /api/v1/cards/:token —— 扫名片码 / 打开分享名片：公开信息 + 实时会员状态（过期即显示已过期） */
import { publicCard } from '@/lib/crm/cards';
import { handler, ok } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (_req: Request, { params }: { params: { token: string } }) => ok({ card: await publicCard(params.token) }));
