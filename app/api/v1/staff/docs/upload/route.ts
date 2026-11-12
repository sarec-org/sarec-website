/**
 * POST /api/v1/staff/docs/upload —— 浏览器直传图片存储的令牌（PDF 常常超过 4.5MB，不能经函数转）。
 * 只给管理员；只收 PDF / JPG / PNG，单个最大 60MB；只能传到 docs/ 目录下。
 */
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { CrmError } from '@/lib/crm/events';
import { handler, requireStaff } from '@/lib/crm/http';
import { BLOB_PREFIX } from '@/lib/crm/photos';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const b = (await req.json()) as HandleUploadBody;
  // 令牌申请时校验身份；上传完成的回调（来自存储服务）不带会话，不做事
  if (b.type === 'blob.generate-client-token') await requireStaff(req, 'admin');
  const r = await handleUpload({
    body: b,
    request: req,
    onBeforeGenerateToken: async (pathname) => {
      if (!pathname.startsWith(`${BLOB_PREFIX}/docs/`)) throw new CrmError('bad_request', '上传路径不对');
      return { allowedContentTypes: ['application/pdf', 'image/jpeg', 'image/png'], maximumSizeInBytes: 60 * 1024 * 1024, addRandomSuffix: true };
    },
    onUploadCompleted: async () => undefined
  });
  return Response.json(r);
});
