import { buildLlmsTxt } from '@/lib/geo/llms';

// /llms.txt —— 构建时静态生成（内容层变更随部署更新），CDN 缓存。
export const dynamic = 'force-static';

export function GET(): Response {
  return new Response(buildLlmsTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'
    }
  });
}
