/**
 * 名片模板库目录（“我的名片”页下方按分类横向滑动用）：只列已上线批次的模板。
 * 小图用本人资料出：/api/v1/cards/{token}/image?tpl={id}&thumb=1
 */
import { getPool } from '@/lib/db/client';
import { cardTplBatches } from '@/lib/crm/cards';
import { handler, ok } from '@/lib/crm/http';
import { catalog, featured } from '@/lib/cardtpl/registry';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const batches = await cardTplBatches(getPool());
  // 1.4.0：featured = 默认显示的精选；groups = 「更多样式」里按风格分组的全部（老版本小程序只认 groups）
  return ok({ batches, featured: featured(batches), groups: catalog(batches) });
});
