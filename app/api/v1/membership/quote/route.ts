/** GET /api/v1/membership/quote?tier=member —— 续费积分抵扣试算（最多抵一半，只用于续费） */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { memberStatus, renewalQuote } from '@/lib/crm/membership';
import { handler, ok, optionalContact, denyMp12 } from '@/lib/crm/http';
import { getTierSeed } from '@/lib/membership/tiers';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await denyMp12(req);
  const tier = getTierSeed(new URL(req.url).searchParams.get('tier') ?? '');
  if (!tier) throw new CrmError('bad_request', '档位不对');
  const me = await optionalContact(req);
  const pool = getPool();
  return ok({ quote: await renewalQuote(pool, me, tier.currentPriceCents), member: me ? await memberStatus(pool, me) : null });
});
