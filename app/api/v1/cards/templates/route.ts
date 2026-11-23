/**
 * 名片模板库目录（“我的名片”页下方按分类横向滑动用）：只列已上线批次的模板。
 * 小图用本人资料出：/api/v1/cards/{token}/image?tpl={id}&thumb=1
 */
import { getPool } from '@/lib/db/client';
import { cardTplBatches } from '@/lib/crm/cards';
import { handler, ok } from '@/lib/crm/http';
import { withEdgeCache } from '@/lib/crm/edgeCache';
import { catalog, featured } from '@/lib/cardtpl/registry';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler(async (req: Request) => {
  const batches = await cardTplBatches(getPool());
  // 1.4.0：featured = 默认显示的精选；groups = 「更多样式」里按风格分组的全部（老版本小程序只认 groups）
  // 指令 31：模板目录不分人，小程序公开地址（c=mp、不带令牌）让边缘缓存 5 分钟
  return withEdgeCache(req, ok({ batches, featured: featured(batches), groups: catalog(batches) }), 300, 3600);
});
