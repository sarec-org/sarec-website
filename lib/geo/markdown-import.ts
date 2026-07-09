/**
 * SAREC 写作格式 → 结构化文章解析器（M1）。
 * ------------------------------------------------------------------
 * 把「SAREC 写作格式规范」的 markdown 解析成可直接序列化为 Keystatic YAML 的对象。
 * - 纯函数、零依赖、无 React / 无 Next import（供 API 路由与 node 回归脚本共用）。
 * - 解析失败必须抛 ImportError 并指出第几行(M1.3);绝不静默丢内容。
 * - 产出 blocks 用 Keystatic 形状 { discriminant, value },与 lib/geo/keystatic-adapter 逆向对齐。
 *
 * 支持的语法（详见《SAREC 写作格式规范》）:
 *   # 标题                          → title
 *   **摘要判断:** a · b · c          → summary[] / tldr[] / description
 *   **作者:名 · 头衔**               → author.name / author.title
 *   **发布日期:… | 数据截至:…**      → publishedAt / dataCutoff
 *   ## 小节 / ### 子标题             → sectionHeading
 *   | 多列表 |（含 |---| 分隔）      → chartTable
 *   整行 **加粗**                    → pullQuote
 *   ## 常见问题 + ### 问             → faq[]
 *   ## 数据来源                      → sourceList[]
 *   > 引用（免责声明）               → 丢弃(前台自动带入)
 *   普通段落                         → prose(行内 **加粗** / [链接]() 保留)
 */

export type ImportBlock = { discriminant: string; value: Record<string, unknown> };

export type ParsedArticle = {
  title: string;
  description: string;
  summary: string[];
  tldr: string[];
  author: { name: string; title?: string };
  publishedAt: string;
  dataCutoff?: string;
  oneLine?: string; // 快评:一句话结论
  blocks: ImportBlock[];
  faq: { question: string; answer: string }[];
  sourceList: { name: string; url?: string }[];
  warnings: string[];
};

export class ImportError extends Error {
  line?: number;
  constructor(message: string, line?: number) {
    super(line ? `第 ${line} 行:${message}` : message);
    this.name = 'ImportError';
    this.line = line;
  }
}

// ── 工具 ────────────────────────────────────────────────────────────
const stripBold = (s: string) => s.replace(/^\s*\*\*/, '').replace(/\*\*\s*$/, '').trim();
const isBlank = (s: string) => s.trim().length === 0;
const isHr = (s: string) => /^-{3,}$/.test(s.trim());
const isFullyBold = (s: string) => /^\*\*[^*]+\*\*$/.test(s.trim());
const isTableRow = (s: string) => /^\s*\|.*\|\s*$/.test(s);
const isTableSep = (s: string) => /^\s*\|[\s:|-]+\|\s*$/.test(s) && s.includes('-');

function splitRow(line: string): string[] {
  const t = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return t.split('|').map((c) => c.trim());
}

// 中文/数字日期 → YYYY-MM-DD;无日则补 01。解析不出返回 undefined。
function parseCnDate(raw: string): string | undefined {
  const s = raw.trim();
  const iso = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  const cn = s.match(/(\d{4})\s*年\s*(\d{1,2})\s*月(?:\s*(\d{1,2})\s*日)?/);
  if (cn) return `${cn[1]}-${cn[2].padStart(2, '0')}-${(cn[3] ?? '1').padStart(2, '0')}`;
  const ym = s.match(/(\d{4})[/.](\d{1,2})(?:[/.](\d{1,2}))?/);
  if (ym) return `${ym[1]}-${ym[2].padStart(2, '0')}-${(ym[3] ?? '1').padStart(2, '0')}`;
  return undefined;
}

// ── 主解析 ──────────────────────────────────────────────────────────
export function parseArticleMarkdown(md: string): ParsedArticle {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const warnings: string[] = [];
  let i = 0; // 0-based cursor
  const lineNo = () => i + 1;

  // 跳过前导空行
  while (i < lines.length && isBlank(lines[i])) i++;

  // 1) 标题
  if (i >= lines.length || !/^#\s+/.test(lines[i])) {
    throw new ImportError('缺少文章标题(须以「# 」开头)', lineNo());
  }
  const title = lines[i].replace(/^#\s+/, '').trim();
  if (!title) throw new ImportError('文章标题为空', lineNo());
  i++;

  // 2) 头部元信息(标题后的加粗行,直到正文/分隔线)
  let summary: string[] = [];
  let description = '';
  let author: { name: string; title?: string } | undefined;
  let publishedAt = '';
  let dataCutoff: string | undefined;
  let oneLine = '';

  while (i < lines.length) {
    const raw = lines[i];
    if (isBlank(raw)) { i++; continue; }
    if (isHr(raw)) { i++; break; }
    // 头部行只用 ** 强调 key(如 **摘要判断:** 值),去掉全部 ** 再按前缀识别。
    const inner = raw.replace(/\*\*/g, '').trim();
    if (/^(一句话结论|结论)\s*[:：]/.test(inner)) {
      oneLine = inner.replace(/^(一句话结论|结论)\s*[:：]/, '').trim();
      i++; continue;
    }
    if (/^(摘要判断|摘要|核心判断)\s*[:：]/.test(inner)) {
      const body = inner.replace(/^(摘要判断|摘要|核心判断)\s*[:：]/, '').trim();
      summary = body.split(/\s*·\s*/).map((s) => s.trim()).filter(Boolean);
      description = body.length > 158 ? body.slice(0, 157) + '…' : body;
      i++; continue;
    }
    if (/^作者\s*[:：]/.test(inner)) {
      const body = inner.replace(/^作者\s*[:：]/, '').trim();
      const parts = body.split(/\s*·\s*/).map((s) => s.trim()).filter(Boolean);
      author = { name: parts[0] ?? '' };
      if (parts[1]) author.title = parts[1];
      i++; continue;
    }
    if (/^发布日期\s*[:：]/.test(inner)) {
      const pub = inner.match(/发布日期\s*[:：]\s*([^|｜]+)/);
      if (pub) publishedAt = parseCnDate(pub[1]) ?? '';
      const cut = inner.match(/(数据截[至止])\s*[:：]\s*([^|｜]+)/);
      if (cut) dataCutoff = parseCnDate(cut[2]);
      i++; continue;
    }
    // 头部区仍是加粗行但非已知 key(如某些强调句)→ 跳过,继续找 作者/日期,不误当正文结束。
    if (/^\*\*/.test(raw.trim())) { i++; continue; }
    // 非加粗的普通段落 / 标题 → 头部结束,当前行归入正文。
    break;
  }

  if (!author || !author.name) {
    throw new ImportError('缺少作者行(须为 **作者:姓名 · 头衔**)');
  }
  if (!publishedAt) {
    throw new ImportError('缺少或无法识别发布日期(须为 **发布日期:YYYY 年 M 月 [D 日]**)');
  }
  if (!description) description = title;

  const tldr = [...summary];

  // 3) 正文
  const blocks: ImportBlock[] = [];
  const faq: { question: string; answer: string }[] = [];
  let sourceList: { name: string; url?: string }[] = [];
  let proseParas: string[] = [];

  const flushProse = () => {
    const md = proseParas.map((p) => p.trim()).filter(Boolean).join('\n\n');
    if (md) blocks.push({ discriminant: 'prose', value: { md } });
    proseParas = [];
  };

  // 当前段落缓冲(按空行分段)
  let curPara: string[] = [];
  const endPara = () => {
    if (curPara.length) { proseParas.push(curPara.join('\n')); curPara = []; }
  };

  const isSectionH2 = (s: string) => /^##\s+/.test(s) && !/^###\s+/.test(s);
  const isFaqHeading = (s: string) => isSectionH2(s) && /(常见问题|FAQ|问答)/i.test(s);
  const isSourcesHeading = (s: string) => isSectionH2(s) && /(数据来源|资料来源|参考来源|来源)/.test(s);

  const parseTable = (): ImportBlock => {
    const startLine = lineNo();
    const header = splitRow(lines[i]); i++;
    if (i < lines.length && isTableSep(lines[i])) {
      i++;
    } else {
      warnings.push(`第 ${startLine} 行:表格缺少 |---| 分隔行,已按首行为表头处理`);
    }
    const rows: { cells: string[]; highlight?: boolean }[] = [];
    while (i < lines.length && isTableRow(lines[i]) && !isTableSep(lines[i])) {
      const cells = splitRow(lines[i]);
      if (cells.length !== header.length) {
        throw new ImportError(
          `表格数据列数(${cells.length})与表头列数(${header.length})不一致`,
          lineNo()
        );
      }
      rows.push({ cells });
      i++;
    }
    return { discriminant: 'chartTable', value: { headers: header, rows } };
  };

  const parseFaq = () => {
    i++; // 跳过 "## 常见问题" 行
    let q = '';
    let ans: string[] = [];
    const commit = () => {
      if (q) faq.push({ question: q, answer: ans.map((a) => a.trim()).filter(Boolean).join('\n') });
      q = ''; ans = [];
    };
    while (i < lines.length) {
      const raw = lines[i];
      if (isSectionH2(raw)) break; // 下一个 ## 段(如数据来源)
      if (/^###\s+/.test(raw)) { commit(); q = raw.replace(/^###\s+/, '').trim(); i++; continue; }
      if (isHr(raw)) { i++; continue; }
      if (!isBlank(raw) && q) ans.push(raw.trim());
      i++;
    }
    commit();
  };

  const parseSources = () => {
    i++; // 跳过 "## 数据来源" 行
    const buf: string[] = [];
    while (i < lines.length) {
      const raw = lines[i];
      if (isSectionH2(raw) || isHr(raw)) break;
      if (raw.trim().startsWith('>')) break; // 触到尾部免责引用
      if (!isBlank(raw)) buf.push(raw.trim());
      i++;
    }
    const text = buf.join(' ');
    sourceList = text
      .split(/\s*·\s*|\s{2,}|；|;/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1)
      .map((name) => {
        const m = name.match(/^(.*?)\s*[（(]?(https?:\/\/[^\s)）]+)[)）]?$/);
        return m ? { name: m[1].trim(), url: m[2] } : { name };
      });
  };

  while (i < lines.length) {
    const raw = lines[i];

    if (isFaqHeading(raw)) { endPara(); flushProse(); parseFaq(); continue; }
    if (isSourcesHeading(raw)) { endPara(); flushProse(); parseSources(); continue; }

    if (isBlank(raw)) { endPara(); i++; continue; }
    if (isHr(raw)) { endPara(); flushProse(); i++; continue; }

    // 尾部免责引用 / 系列阅读 → 丢弃(前台自动带入免责)
    if (raw.trim().startsWith('>')) { i++; continue; }
    if (/^\*[^*].*\*$/.test(raw.trim())) { i++; continue; } // *系列阅读:…*

    if (/^###\s+/.test(raw)) {
      endPara(); flushProse();
      blocks.push({ discriminant: 'sectionHeading', value: { text: raw.replace(/^###\s+/, '').trim() } });
      i++; continue;
    }
    if (isSectionH2(raw)) {
      endPara(); flushProse();
      blocks.push({ discriminant: 'sectionHeading', value: { text: raw.replace(/^##\s+/, '').trim() } });
      i++; continue;
    }
    if (isTableRow(raw) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      endPara(); flushProse();
      blocks.push(parseTable());
      continue;
    }
    if (isFullyBold(raw)) {
      endPara(); flushProse();
      blocks.push({ discriminant: 'pullQuote', value: { text: stripBold(raw) } });
      i++; continue;
    }

    // 普通正文行
    curPara.push(raw.trim());
    i++;
  }
  endPara();
  flushProse();

  return {
    title,
    description,
    summary,
    tldr,
    author,
    publishedAt,
    ...(dataCutoff ? { dataCutoff } : {}),
    ...(oneLine ? { oneLine } : {}),
    blocks,
    faq,
    sourceList,
    warnings,
  };
}

// ── 序列化为 Keystatic YAML 结构 ────────────────────────────────────
export type EntryMeta = {
  slug: string;
  cluster: string;
  template: 'deep' | 'brief' | 'data';
  tier?: 'pillar' | 'satellite' | 'note';
  locale?: 'zh' | 'en';
  status?: 'draft' | 'published';
};

// 产出与 content/geo/articles/*.yaml 完全同形的对象(可 yaml.stringify)。
export function toKeystaticEntry(parsed: ParsedArticle, meta: EntryMeta): Record<string, unknown> {
  // 栏目/模板 → Keystatic conditional 形状 { discriminant, value }。
  const templateField = (() => {
    if (meta.template === 'brief') {
      return {
        discriminant: 'brief',
        value: {
          oneLine: parsed.oneLine ?? parsed.summary[0] ?? parsed.description,
          background: '',
          impact: '',
          judgment: '',
        },
      };
    }
    if (meta.template === 'data') {
      const value: Record<string, unknown> = { dataPeriod: parsed.dataCutoff ?? '', changeNote: '' };
      if (parsed.dataCutoff) value.dataCutoff = parsed.dataCutoff;
      return { discriminant: 'data', value };
    }
    // deep(默认)
    const value: Record<string, unknown> = { tldr: parsed.tldr, judgmentChecklist: [] };
    if (parsed.dataCutoff) value.dataCutoff = parsed.dataCutoff;
    return { discriminant: 'deep', value };
  })();

  const entry: Record<string, unknown> = {
    slug: meta.slug,
    locale: meta.locale ?? 'zh',
    cluster: meta.cluster,
    tier: meta.tier ?? 'pillar',
    template: templateField,
    status: meta.status ?? 'draft',
    title: parsed.title,
    description: parsed.description,
    author: parsed.author.title
      ? { name: parsed.author.name, title: parsed.author.title }
      : { name: parsed.author.name },
    publishedAt: parsed.publishedAt,
    summary: parsed.summary,
    blocks: parsed.blocks,
    faq: parsed.faq,
    sourceList: parsed.sourceList,
    sources: [],
    relatedSlugs: [],
    cta: { discriminant: false },
    heroMedia: { discriminant: false },
  };
  return entry;
}
