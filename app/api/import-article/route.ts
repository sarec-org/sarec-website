/**
 * 文章导入 API（M1）—— 解析规范 markdown → 在 cms/ 分支写 YAML + 开 PR。
 * ------------------------------------------------------------------
 * POST body: { markdown, slug, cluster, template, tier?, status?, mode?, accessCode? }
 *   mode='preview'(默认) → 只解析返回结构 + 生成的 YAML,不写仓库(无需 token)。
 *   mode='create'        → 解析 + 在 cms/import-<slug> 分支写文件并开 PR(需 GITHUB_IMPORT_TOKEN)。
 *
 * 三道防线:
 *  - 解析失败 → 400 + 第几行(ImportError.line),绝不静默丢内容。
 *  - 访问码:若配置 IMPORT_ACCESS_CODE,create 模式必须匹配(挡公网滥用);未配置则放行(便于 Preview)。
 *  - 写仓库仅经服务端 token;分支保护仍要求 PR + owner 审批合并(员工无法直落 main)。
 */
import { NextResponse } from 'next/server';
import { stringify } from 'yaml';
import {
  parseArticleMarkdown,
  toKeystaticEntry,
  ImportError,
  type EntryMeta,
} from '@/lib/geo/markdown-import';

const OWNER = 'sarec-org';
const REPO = 'sarec-website';
const BASE = 'main';
const GH = 'https://api.github.com';

// 随导入一起提交的本地图片（M1，批次 3）。path 必须落在受控上传目录内，防目录穿越。
type UploadImage = { path?: string; contentBase64?: string };

type Body = {
  markdown?: string;
  slug?: string;
  cluster?: string;
  template?: EntryMeta['template'];
  layout?: EntryMeta['layout'];
  tier?: EntryMeta['tier'];
  status?: EntryMeta['status'];
  mode?: 'preview' | 'create';
  accessCode?: string;
  images?: UploadImage[];
};

const VALID_TEMPLATES = ['deep', 'brief', 'data'];
const VALID_LAYOUTS = ['classic', 'report', 'compact'];
// 图片只允许写入此受控目录（与前台 publicPath 一致）；拒绝任何越界路径。
const UPLOAD_DIR = 'public/images/research/uploads/';
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 单图上限 3MB（已客户端压缩，正常远小于此）
const MAX_IMAGES = 12;
const VALID_CLUSTERS = [
  'chinese-capital-us-re-risk',
  'eb5-real-estate',
  'la-development-ed1',
  'sec-finder-compliance',
];

function bad(msg: string, extra: Record<string, unknown> = {}, status = 400) {
  return NextResponse.json({ ok: false, error: msg, ...extra }, { status });
}

async function gh(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${GH}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return bad('请求体不是合法 JSON');
  }

  const { markdown, slug, cluster, template, layout, tier, status, mode = 'preview' } = body;

  if (!markdown || markdown.trim().length < 10) return bad('markdown 内容为空');
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    return bad('slug 必填,且只能用小写字母/数字/连字符(如 us-housing-great-reset-2026)');
  }
  if (!cluster || !VALID_CLUSTERS.includes(cluster)) return bad('内容集群(cluster)无效');
  if (!template || !VALID_TEMPLATES.includes(template)) return bad('栏目/模板(template)无效');
  if (layout && !VALID_LAYOUTS.includes(layout)) return bad('版式(layout)无效');

  // 校验随导入提交的图片：路径受控、大小受限、base64 合法。
  const images = Array.isArray(body.images) ? body.images : [];
  if (images.length > MAX_IMAGES) return bad(`一次最多导入 ${MAX_IMAGES} 张图片`);
  for (const img of images) {
    if (!img || typeof img.path !== 'string' || typeof img.contentBase64 !== 'string') {
      return bad('图片数据格式不正确');
    }
    const p = img.path.replace(/^\/+/, '');
    if (!p.startsWith(UPLOAD_DIR) || p.includes('..') || !/^[\w./-]+\.(webp|jpg|jpeg|png)$/i.test(p)) {
      return bad(`图片路径不合法:${img.path}(必须位于 ${UPLOAD_DIR} 下)`);
    }
    const bytes = Buffer.byteLength(img.contentBase64, 'base64');
    if (bytes === 0) return bad(`图片内容为空:${img.path}`);
    if (bytes > MAX_IMAGE_BYTES) return bad(`图片过大(${Math.round(bytes / 1024)}KB):${img.path},请压缩后再传`);
  }

  // 1) 解析(失败带行号)
  let parsed;
  try {
    parsed = parseArticleMarkdown(markdown);
  } catch (err) {
    if (err instanceof ImportError) return bad(err.message, { line: err.line ?? null });
    return bad(`解析失败:${(err as Error).message}`);
  }

  const meta: EntryMeta = {
    slug,
    cluster,
    template,
    layout: layout ?? 'classic',
    tier: tier ?? 'pillar',
    status: status ?? 'draft',
  };
  const entry = toKeystaticEntry(parsed, meta);
  const yamlText = stringify(entry);

  const preview = {
    ok: true as const,
    warnings: parsed.warnings,
    fields: {
      title: parsed.title,
      description: parsed.description,
      summaryCount: parsed.summary.length,
      blockCount: parsed.blocks.length,
      blockBreakdown: parsed.blocks.reduce<Record<string, number>>((m, b) => {
        m[b.discriminant] = (m[b.discriminant] ?? 0) + 1;
        return m;
      }, {}),
      faqCount: parsed.faq.length,
      sourceCount: parsed.sourceList.length,
      imageCount: images.length,
      publishedAt: parsed.publishedAt,
      author: parsed.author,
    },
    yaml: yamlText,
  };

  if (mode === 'preview') return NextResponse.json(preview);

  // ── create 模式:访问码 + token 校验 ──
  const accessCode = process.env.IMPORT_ACCESS_CODE;
  if (accessCode && body.accessCode !== accessCode) {
    return bad('访问码不正确', {}, 403);
  }
  const token = process.env.GITHUB_IMPORT_TOKEN;
  if (!token) {
    return bad(
      '未配置 GITHUB_IMPORT_TOKEN,无法自动开 PR。请老板在 Vercel 环境变量中配置该 token(见员工说明)。',
      { needsToken: true },
      501
    );
  }

  const branch = `cms/import-${slug}`;
  const path = `content/geo/articles/${slug}.yaml`;

  try {
    // 基分支最新 sha
    const baseRef = await gh(`/repos/${OWNER}/${REPO}/git/ref/heads/${BASE}`, token);
    if (!baseRef.res.ok) return bad(`读取 ${BASE} 分支失败:${baseRef.json?.message ?? baseRef.res.status}`, {}, 502);
    const baseSha = baseRef.json.object.sha;

    // 文件是否已存在(避免覆盖已有文章)
    const exists = await gh(`/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}?ref=${BASE}`, token);
    if (exists.res.ok) return bad(`slug 已存在(${path}),请换一个 slug`, {}, 409);

    // 建分支(已存在则复用)
    const mk = await gh(`/repos/${OWNER}/${REPO}/git/refs`, token, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
    });
    if (!mk.res.ok && mk.res.status !== 422) {
      return bad(`建分支失败:${mk.json?.message ?? mk.res.status}`, {}, 502);
    }

    // 先提交图片(如有):逐张写入受控上传目录。已存在同名则复用(不覆盖),保证幂等重试安全。
    for (const img of images) {
      const imgPath = img.path!.replace(/^\/+/, '');
      const already = await gh(
        `/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(imgPath)}?ref=${branch}`,
        token
      );
      if (already.res.ok) continue; // 该图已在分支上,跳过
      const putImg = await gh(`/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(imgPath)}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          message: `feat(content): 导入 ${slug} 配图 ${imgPath.split('/').pop()}`,
          content: img.contentBase64,
          branch,
        }),
      });
      if (!putImg.res.ok) {
        return bad(`写入图片失败(${imgPath}):${putImg.json?.message ?? putImg.res.status}`, {}, 502);
      }
    }

    // 写文件
    const put = await gh(`/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`, token, {
      method: 'PUT',
      body: JSON.stringify({
        message: `feat(content): 导入文章 ${slug}(自动生成草稿,待审）`,
        content: Buffer.from(yamlText, 'utf8').toString('base64'),
        branch,
      }),
    });
    if (!put.res.ok) return bad(`写入文件失败:${put.json?.message ?? put.res.status}`, {}, 502);

    // 开 PR
    const pr = await gh(`/repos/${OWNER}/${REPO}/pulls`, token, {
      method: 'POST',
      body: JSON.stringify({
        title: `[导入] ${parsed.title}`,
        head: branch,
        base: BASE,
        body:
          `由「粘贴 markdown 导入」自动生成的草稿文章。\n\n` +
          `- slug: \`${slug}\`\n- 栏目/模板: \`${template}\`\n- 区块数: ${parsed.blocks.length} · FAQ: ${parsed.faq.length} · 来源: ${parsed.sourceList.length}\n\n` +
          `请在 Keystatic 后台打开本分支检查(各字段已自动填好),确认无误后合并即上线。`,
      }),
    });
    if (!pr.res.ok) return bad(`开 PR 失败:${pr.json?.message ?? pr.res.status}`, {}, 502);

    return NextResponse.json({ ...preview, branch, prUrl: pr.json.html_url, prNumber: pr.json.number });
  } catch (err) {
    return bad(`GitHub 操作异常:${(err as Error).message}`, {}, 502);
  }
}
