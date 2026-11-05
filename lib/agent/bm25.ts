/**
 * AI 助手 —— 进程内检索：分段 + BM25（中文二字组，不用向量接口）。纯函数。
 */
import { tokenize } from './text';

export type Chunk = {
  id: string;
  source: 'article' | 'research' | 'page' | 'membership' | 'event' | 'faq' | 'news';
  title: string;
  url: string | null;
  text: string;
};

export type Hit = Chunk & { score: number };

type Indexed = { chunk: Chunk; tf: Record<string, number>; len: number };

export class Bm25 {
  private docs: Indexed[] = [];
  private df: Record<string, number> = {};
  private avgdl = 1;
  constructor(chunks: Chunk[], private k1 = 1.4, private b = 0.7) {
    for (const c of chunks) this.add(c);
    this.finish();
  }
  private add(chunk: Chunk) {
    // 标题词加权：标题重复两次计入
    const toks = tokenize(`${chunk.title} ${chunk.title} ${chunk.text}`);
    const tf: Record<string, number> = {};
    for (const t of toks) tf[t] = (tf[t] ?? 0) + 1;
    Object.keys(tf).forEach((t) => (this.df[t] = (this.df[t] ?? 0) + 1));
    this.docs.push({ chunk, tf, len: toks.length });
  }
  private finish() {
    const total = this.docs.reduce((n, d) => n + d.len, 0);
    this.avgdl = this.docs.length ? Math.max(1, total / this.docs.length) : 1;
  }
  get size() {
    return this.docs.length;
  }
  search(query: string, k = 4, minScore = 0.5): Hit[] {
    const q = tokenize(query);
    if (!q.length || !this.docs.length) return [];
    const uniq: string[] = [];
    for (const t of q) if (uniq.indexOf(t) < 0) uniq.push(t);
    const N = this.docs.length;
    const scored: Hit[] = [];
    for (const d of this.docs) {
      let s = 0;
      for (const t of uniq) {
        const f = d.tf[t];
        if (!f) continue;
        const n = this.df[t] ?? 0;
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        s += (idf * f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + (this.b * d.len) / this.avgdl));
      }
      if (s >= minScore) scored.push({ ...d.chunk, score: s });
    }
    scored.sort((a, b) => b.score - a.score);
    // 同一页面最多取 2 段，保证多样性
    const out: Hit[] = [];
    const perUrl: Record<string, number> = {};
    for (const h of scored) {
      const key = h.url ?? h.id;
      if ((perUrl[key] ?? 0) >= 2) continue;
      perUrl[key] = (perUrl[key] ?? 0) + 1;
      out.push(h);
      if (out.length >= k) break;
    }
    return out;
  }
}

/** 按句切段，每段约 maxLen 字。 */
export function chunkText(text: string, maxLen = 450): string[] {
  const clean = text.replace(/\r/g, '').replace(/\n{2,}/g, '\n').trim();
  if (!clean) return [];
  if (clean.length <= maxLen) return [clean];
  const sentences = clean.replace(/([。！？；!?;\n]|\.\s)/g, '$1\u0001').split('\u0001');
  const out: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if (!s) continue;
    if ((cur + s).length > maxLen && cur) {
      out.push(cur.trim());
      cur = '';
    }
    if (s.length > maxLen) {
      for (let i = 0; i < s.length; i += maxLen) out.push(s.slice(i, i + maxLen).trim());
      continue;
    }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

/** 把任意内容对象拍平成文字（跳过链接、图片、编号等非正文字段）。 */
const SKIP_KEY = /^(href|src|image|images|slug|weight|icon|id|url|code|key|intentKey|linkHref|poster|kind|type|tone|layout|template|status|cluster|tier|locale|alt|media|heroMedia|metaTitle|metaDescription|evidence|sources|relatedSlugs|width|height|variant|unit|trend|series|cover|coverImage|gallery)$/i;
export function flattenText(o: unknown, out: string[] = []): string[] {
  if (typeof o === 'string') {
    const t = o.trim();
    if (t && !/^(\/|https?:\/\/|#)/.test(t)) out.push(t);
  } else if (Array.isArray(o)) {
    for (const x of o) flattenText(x, out);
  } else if (o && typeof o === 'object') {
    Object.keys(o as Record<string, unknown>).forEach((k) => {
      if (SKIP_KEY.test(k)) return;
      flattenText((o as Record<string, unknown>)[k], out);
    });
  }
  return out;
}
