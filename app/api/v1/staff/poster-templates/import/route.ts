/**
 * POST /api/v1/staff/poster-templates/import（管理员）—— 批量导入模板清单（给测试站灌数据；正式库走双击文件里的 SQL）。
 * 请求体 { categories: [{ key, name, tier, sort }], templates: [{ code, category_key, name, image_url, thumb_url, box, ink, layout, sort, source }] }；
 * 0054 起：分类可带 purpose（'event' 默认 / 'greeting'）、festival_date（'YYYY-MM-DD'，祝福分类用）；模板可带 purpose（不传跟着分类，和分类不一致拒收）、sig_box（祝福落款位）。
 * 按 key / code 已有就跳过（ON CONFLICT DO NOTHING），可重复导。图片要先由 scripts/poster-templates-upload.mjs 传到 Blob。
 */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { importData } from '@/lib/org/posterTemplates';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'admin');
  return ok(await importData(s, await body(req)));
});
