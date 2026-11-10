/**
 * 名片模板库目录（“我的名片”页下方按分类横向滑动用）：只列已上线批次的模板。
 * 小图用本人资料出：/api/v1/cards/{token}/image?tpl={id}&thumb=1
 */
import { getPool } from '@/lib/db/client';
import { cardTplBatches } from '@/lib/crm/cards';
import { handler, ok } from '@/lib/crm/http';
import { catalog } from '@/lib/cardtpl/registry';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const batches = await cardTplBatches(getPool());
  return ok({ batches, groups: catalog(batches) });
});
