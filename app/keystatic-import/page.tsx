'use client';

/**
 * 粘贴 Markdown 导入页（M1）—— 像 YouTube 上传:贴一次,各框自动就位。
 * ------------------------------------------------------------------
 * 员工流程:粘贴规范 markdown → 选栏目/slug → 「预览解析」看各字段自动就位 →
 * 「创建分支并开 PR」→ 去 Keystatic/PR 检查 → 合并上线。
 * 解析失败会指出第几行;缺 token 时明确提示需老板配置。
 */
import { useState } from 'react';
import styles from './import.module.css';

type PreviewResp = {
  ok: boolean;
  error?: string;
  line?: number | null;
  needsToken?: boolean;
  warnings?: string[];
  fields?: {
    title: string;
    description: string;
    summaryCount: number;
    blockCount: number;
    blockBreakdown: Record<string, number>;
    faqCount: number;
    sourceCount: number;
    publishedAt: string;
    author: { name: string; title?: string };
  };
  yaml?: string;
  prUrl?: string;
  prNumber?: number;
  branch?: string;
};

const CLUSTERS = [
  { value: 'chinese-capital-us-re-risk', label: '中国资本赴美房地产风险' },
  { value: 'eb5-real-estate', label: 'EB-5 与房地产' },
  { value: 'la-development-ed1', label: '洛杉矶开发与 ED1' },
  { value: 'sec-finder-compliance', label: 'SEC Finder 合规' },
];
const TEMPLATES = [
  { value: 'deep', label: 'SAREC 深度' },
  { value: 'brief', label: 'SAREC 快评' },
  { value: 'data', label: 'SAREC 数据追踪' },
];

export default function ImportPage() {
  const [markdown, setMarkdown] = useState('');
  const [slug, setSlug] = useState('');
  const [cluster, setCluster] = useState(CLUSTERS[0].value);
  const [template, setTemplate] = useState(TEMPLATES[0].value);
  const [status, setStatus] = useState('draft');
  const [accessCode, setAccessCode] = useState('');
  const [resp, setResp] = useState<PreviewResp | null>(null);
  const [loading, setLoading] = useState<false | 'preview' | 'create'>(false);

  async function submit(mode: 'preview' | 'create') {
    setLoading(mode);
    setResp(null);
    try {
      const r = await fetch('/api/import-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown, slug, cluster, template, status, mode, accessCode }),
      });
      setResp((await r.json()) as PreviewResp);
    } catch (e) {
      setResp({ ok: false, error: `请求失败:${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  }

  const f = resp?.fields;

  return (
    <main className={styles.page}>
      <h1 className={styles.h1}>粘贴 Markdown 导入</h1>
      <p className={styles.lead}>
        按《SAREC 写作格式规范》粘贴整篇 markdown,系统自动把标题、摘要、正文、数据表、FAQ、
        数据来源各字段填好。先「预览解析」核对,再「创建分支并开 PR」。
      </p>

      <label className={styles.label}>文章正文(Markdown)</label>
      <textarea
        className={styles.textarea}
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        placeholder="# 文章标题&#10;&#10;**摘要判断:** 要点一 · 要点二 · 要点三&#10;&#10;**作者:东哥 · SAREC 中美房地产商会创始人**&#10;**发布日期:2026 年 7 月 | 数据截至:2026 年 7 月 6 日**&#10;&#10;---&#10;&#10;正文……"
        rows={16}
      />

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>URL 标识 slug</label>
          <input
            className={styles.input}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="us-housing-great-reset-2026"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>栏目 / 模板</label>
          <select className={styles.input} value={template} onChange={(e) => setTemplate(e.target.value)}>
            {TEMPLATES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>内容集群</label>
          <select className={styles.input} value={cluster} onChange={(e) => setCluster(e.target.value)}>
            {CLUSTERS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>状态</label>
          <select className={styles.input} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">草稿(推荐)</option>
            <option value="published">已发布</option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>访问码(如已配置)</label>
          <input
            className={styles.input}
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            type="password"
            placeholder="可留空"
          />
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.btnGhost} onClick={() => submit('preview')} disabled={loading !== false}>
          {loading === 'preview' ? '解析中…' : '预览解析'}
        </button>
        <button className={styles.btn} onClick={() => submit('create')} disabled={loading !== false}>
          {loading === 'create' ? '创建中…' : '创建分支并开 PR'}
        </button>
      </div>

      {resp && !resp.ok ? (
        <div className={styles.error}>
          <strong>解析未通过:</strong> {resp.error}
          {resp.line ? <span>(问题在第 {resp.line} 行)</span> : null}
          {resp.needsToken ? (
            <p className={styles.hint}>
              这是配置问题,不是你的内容问题——请联系老板在 Vercel 配置 GITHUB_IMPORT_TOKEN。
            </p>
          ) : null}
        </div>
      ) : null}

      {resp?.ok && f ? (
        <div className={styles.result}>
          {resp.prUrl ? (
            <div className={styles.success}>
              ✓ 已创建分支 <code>{resp.branch}</code> 并开 PR{' '}
              <a href={resp.prUrl} target="_blank" rel="noopener noreferrer">
                #{resp.prNumber} 打开审核 →
              </a>
            </div>
          ) : (
            <div className={styles.previewOk}>✓ 解析成功,各字段已就位(以下为预览,尚未写入仓库)</div>
          )}

          <div className={styles.summary}>
            <div><span>标题</span>{f.title}</div>
            <div><span>SEO 描述</span>{f.description}</div>
            <div><span>作者</span>{f.author.name}{f.author.title ? ` · ${f.author.title}` : ''}</div>
            <div><span>发布日期</span>{f.publishedAt}</div>
            <div><span>摘要要点</span>{f.summaryCount} 条</div>
            <div><span>正文区块</span>{f.blockCount} 块（{Object.entries(f.blockBreakdown).map(([k, v]) => `${k}×${v}`).join(' · ')}）</div>
            <div><span>FAQ</span>{f.faqCount} 条</div>
            <div><span>数据来源</span>{f.sourceCount} 条</div>
          </div>

          {resp.warnings && resp.warnings.length > 0 ? (
            <div className={styles.warn}>
              <strong>提示:</strong>
              <ul>{resp.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
          ) : null}

          <details className={styles.details}>
            <summary>查看生成的 YAML</summary>
            <pre className={styles.yaml}>{resp.yaml}</pre>
          </details>
        </div>
      ) : null}
    </main>
  );
}
