'use client';

/**
 * 粘贴 Markdown 导入页（M1）—— 像 YouTube / 朋友圈:贴一次或拖图进来,各框自动就位。
 * ------------------------------------------------------------------
 * 员工流程:粘贴规范 markdown（或拖 .md 文件）→ 需要配图就拖张图进来 / 从品牌插画库选一张 →
 * 写一句 alt → 图片自动插进正文 → 选栏目/版式/slug → 「预览解析」→「创建分支并开 PR」→ 检查 → 合并上线。
 * 图片在浏览器端压缩到合理尺寸后随导入提交进仓库;alt 必填（GEO 要求）;解析失败会指出第几行。
 */
import { useRef, useState } from 'react';
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
    imageCount: number;
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
const LAYOUTS = [
  { value: 'classic', label: '经典版' },
  { value: 'report', label: '报告版(侧边目录)' },
  { value: 'compact', label: '简报版(TL;DR 置顶)' },
];

// SAREC 品牌插画库（内置 SVG，抽象专业风，不含真人/真实场景，合规）。
const ILLUSTRATIONS = [
  { file: 'skyline-dusk.svg', label: '城市天际线', alt: '抽象城市天际线插画' },
  { file: 'data-grid.svg', label: '数据折线', alt: '抽象数据网格与折线插画' },
  { file: 'finance-arc.svg', label: '增长曲线', alt: '抽象增长曲线插画' },
  { file: 'city-blocks.svg', label: '城市街区', alt: '抽象城市街区俯视插画' },
  { file: 'capital-flow.svg', label: '资本网络', alt: '抽象资本流动网络插画' },
  { file: 'market-wave.svg', label: '市场波动', alt: '抽象市场波动面积图插画' },
  { file: 'tower-abstract.svg', label: '高层建筑', alt: '抽象高层建筑插画' },
  { file: 'index-bars.svg', label: '指数柱图', alt: '抽象指数柱状图插画' },
  { file: 'globe-network.svg', label: '跨境连接', alt: '抽象跨境连接地球插画' },
  { file: 'document-lines.svg', label: '文件条款', alt: '抽象文件与条款插画' },
  { file: 'compass-nodes.svg', label: '罗盘坐标', alt: '抽象罗盘与坐标插画' },
  { file: 'bridge-span.svg', label: '桥梁连接', alt: '抽象桥梁连接插画' },
];

const UPLOAD_PUBLIC = '/images/research/uploads';
const MAX_DIM = 1600; // 压缩后长边上限（web 用途足够清晰）

type Pending = {
  kind: 'upload' | 'illustration';
  src: string; // 前台路径，如 /images/research/uploads/img-x.webp 或 /illustrations/sarec/x.svg
  preview: string; // 缩略图 URL（upload=dataURL；illustration=同 src）
  base64?: string; // 仅 upload：压缩后 base64（不含 data: 前缀），随导入提交
  alt: string;
};

// 浏览器端读取 File → dataURL。
function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ''));
    r.onerror = () => reject(new Error('读取图片失败'));
    r.readAsDataURL(file);
  });
}

// 用 canvas 压缩图片:长边缩到 MAX_DIM,优先 webp(不支持则 jpeg)。返回 {base64, dataUrl, ext}。
async function compressImage(file: File): Promise<{ base64: string; dataUrl: string; ext: string }> {
  const srcUrl = await readAsDataURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new window.Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('图片解码失败'));
    im.src = srcUrl;
  });
  const scale = Math.max(img.width, img.height) > MAX_DIM ? MAX_DIM / Math.max(img.width, img.height) : 1;
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器不支持 canvas，无法压缩');
  ctx.drawImage(img, 0, 0, w, h);
  let ext = 'webp';
  let out = canvas.toDataURL('image/webp', 0.82);
  if (!out.startsWith('data:image/webp')) {
    ext = 'jpg';
    out = canvas.toDataURL('image/jpeg', 0.85);
  }
  return { base64: out.split(',')[1] ?? '', dataUrl: out, ext };
}

export default function ImportPage() {
  const [markdown, setMarkdown] = useState('');
  const [slug, setSlug] = useState('');
  const [cluster, setCluster] = useState(CLUSTERS[0].value);
  const [template, setTemplate] = useState(TEMPLATES[0].value);
  const [layout, setLayout] = useState(LAYOUTS[0].value);
  const [status, setStatus] = useState('draft');
  const [accessCode, setAccessCode] = useState('');
  const [resp, setResp] = useState<PreviewResp | null>(null);
  const [loading, setLoading] = useState<false | 'preview' | 'create'>(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // 图片相关
  const [pending, setPending] = useState<Pending | null>(null);
  const [imgBusy, setImgBusy] = useState(false);
  const [imgError, setImgError] = useState('');
  const [insertedImages, setInsertedImages] = useState<{ path: string; contentBase64: string }[]>([]);
  const [insertedLog, setInsertedLog] = useState<{ src: string; alt: string }[]>([]);
  const [imgDragOver, setImgDragOver] = useState(false);
  const imgFileRef = useRef<HTMLInputElement>(null);
  const imgCounter = useRef(0);

  // 读入 .md 文件 → 填入 markdown 框（与粘贴等同）。
  function loadFile(file: File) {
    setFileError('');
    const okName = /\.(md|markdown|txt)$/i.test(file.name);
    const okType = /text\/(markdown|plain|x-markdown)/.test(file.type);
    if (!okName && !okType) {
      setFileError(`只支持 .md / .markdown / .txt 文件(你选的是「${file.name}」)`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setMarkdown(String(reader.result ?? ''));
      setFileName(file.name);
      setResp(null);
      if (!slug) {
        const base = file.name
          .replace(/\.(md|markdown|txt)$/i, '')
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/^-+|-+$/g, '');
        if (base) setSlug(base);
      }
    };
    reader.onerror = () => setFileError('文件读取失败,请重试或改用粘贴。');
    reader.readAsText(file, 'utf-8');
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  }

  // 选/拖入一张图片 → 压缩 → 进入待插入状态（等填 alt）。
  async function onSelectImage(file: File) {
    setImgError('');
    if (!/^image\//.test(file.type) && !/\.(png|jpe?g|webp|gif)$/i.test(file.name)) {
      setImgError(`只支持图片文件(png / jpg / webp),你选的是「${file.name}」`);
      return;
    }
    setImgBusy(true);
    try {
      const { base64, dataUrl, ext } = await compressImage(file);
      const name = `img-${Date.now()}-${imgCounter.current++}.${ext}`;
      setPending({ kind: 'upload', src: `${UPLOAD_PUBLIC}/${name}`, preview: dataUrl, base64, alt: '' });
    } catch (e) {
      setImgError(`图片处理失败:${(e as Error).message}`);
    } finally {
      setImgBusy(false);
    }
  }

  function pickIllustration(ill: (typeof ILLUSTRATIONS)[number]) {
    setImgError('');
    const src = `/illustrations/sarec/${ill.file}`;
    setPending({ kind: 'illustration', src, preview: src, alt: ill.alt });
  }

  // 确认插入:alt 必填 → 在正文末尾追加 ![alt](src) → upload 型加入待提交列表。
  function confirmInsert() {
    if (!pending) return;
    const alt = pending.alt.trim();
    if (!alt) {
      setImgError('请先填写 alt 图片描述(GEO 要求必填)');
      return;
    }
    setMarkdown((md) => `${md.replace(/\s*$/, '')}\n\n![${alt}](${pending.src})\n`);
    if (pending.kind === 'upload' && pending.base64) {
      setInsertedImages((arr) => [...arr, { path: `public${pending.src}`, contentBase64: pending.base64! }]);
    }
    setInsertedLog((arr) => [...arr, { src: pending.src, alt }]);
    setPending(null);
    setImgError('');
    setResp(null);
  }

  async function submit(mode: 'preview' | 'create') {
    setLoading(mode);
    setResp(null);
    try {
      const r = await fetch('/api/import-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown,
          slug,
          cluster,
          template,
          layout,
          status,
          accessCode,
          mode,
          images: mode === 'create' ? insertedImages : [],
        }),
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
        数据来源各字段填好。需要配图就拖张图进来或从品牌插画库选一张,写一句 alt 即插入正文。
        先「预览解析」核对,再「创建分支并开 PR」。
      </p>

      <label className={styles.label}>文章正文(Markdown)</label>

      <div
        className={`${styles.dropzone} ${dragOver ? styles.dropzoneActive : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click();
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) loadFile(file);
            e.target.value = '';
          }}
        />
        <span className={styles.dropIcon}>⬆︎</span>
        <span>
          把 <strong>.md 文件</strong>拖到这里,或<strong>点击选择文件</strong>
          {fileName ? <span className={styles.fileName}>已载入:{fileName}</span> : null}
        </span>
        <span className={styles.dropHint}>与粘贴等同 · 支持 .md / .markdown / .txt</span>
      </div>
      {fileError ? (
        <div className={styles.error} style={{ marginBottom: '1rem' }}>
          {fileError}
        </div>
      ) : null}

      <textarea
        className={styles.textarea}
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        placeholder="# 文章标题&#10;&#10;**摘要判断:** 要点一 · 要点二 · 要点三&#10;&#10;**作者:东哥 · SAREC 中美房地产商会创始人**&#10;**发布日期:2026 年 7 月 | 数据截至:2026 年 7 月 6 日**&#10;&#10;---&#10;&#10;正文……"
        rows={16}
      />

      {/* ── 配图（M1/M2）—— 上传本地图或选品牌插画,写 alt 自动插入正文 ── */}
      <div className={styles.imgPanel}>
        <label className={styles.label}>配图(可选)—— 拖图上传 / 选品牌插画,写一句 alt 即插入正文</label>

        <div
          className={`${styles.imgDrop} ${imgDragOver ? styles.dropzoneActive : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setImgDragOver(true);
          }}
          onDragLeave={() => setImgDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setImgDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) onSelectImage(file);
          }}
          onClick={() => imgFileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') imgFileRef.current?.click();
          }}
        >
          <input
            ref={imgFileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onSelectImage(file);
              e.target.value = '';
            }}
          />
          <span className={styles.dropIcon}>🖼</span>
          <span>
            {imgBusy ? '压缩中…' : (
              <>
                把<strong>图片</strong>拖到这里,或<strong>点击选择</strong>
              </>
            )}
          </span>
          <span className={styles.dropHint}>自动压缩到合适尺寸(长边≤{MAX_DIM}px)· png / jpg / webp</span>
        </div>

        <details className={styles.illWrap}>
          <summary>或从 SAREC 品牌插画库选一张(抽象专业风,合规)</summary>
          <div className={styles.illGrid}>
            {ILLUSTRATIONS.map((ill) => (
              <button
                key={ill.file}
                type="button"
                className={styles.illItem}
                onClick={() => pickIllustration(ill)}
                title={ill.label}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/illustrations/sarec/${ill.file}`} alt={ill.alt} />
                <span>{ill.label}</span>
              </button>
            ))}
          </div>
        </details>

        {imgError ? (
          <div className={styles.error} style={{ margin: '0.75rem 0' }}>
            {imgError}
          </div>
        ) : null}

        {pending ? (
          <div className={styles.pendingCard}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.pendingThumb} src={pending.preview} alt="待插入图片预览" />
            <div className={styles.pendingBody}>
              <label className={styles.label}>
                图片描述 alt(必填)—— {pending.kind === 'upload' ? '本地上传图' : 'SAREC 品牌插画'}
              </label>
              <input
                className={styles.input}
                value={pending.alt}
                onChange={(e) => setPending({ ...pending, alt: e.target.value })}
                placeholder="用一句话描述图片内容(利于无障碍与 GEO)"
                autoFocus
              />
              <div className={styles.pendingActions}>
                <button className={styles.btn} type="button" onClick={confirmInsert} disabled={!pending.alt.trim()}>
                  插入到正文
                </button>
                <button className={styles.btnGhost} type="button" onClick={() => setPending(null)}>
                  取消
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {insertedLog.length > 0 ? (
          <div className={styles.imgList}>
            已插入 {insertedLog.length} 张图片:
            <ul>
              {insertedLog.map((im, i) => (
                <li key={i}>
                  <code>{im.src.split('/').pop()}</code> — {im.alt}
                </li>
              ))}
            </ul>
            <span className={styles.dropHint}>如需删除某张图,直接在上面正文里删掉对应的 ![…](…) 那一行即可。</span>
          </div>
        ) : null}
      </div>

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
          <label className={styles.label}>版式</label>
          <select className={styles.input} value={layout} onChange={(e) => setLayout(e.target.value)}>
            {LAYOUTS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
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
          <label className={styles.label}>访问码(必填)</label>
          <input
            className={styles.input}
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            type="password"
            placeholder="必填"
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
            <div>
              <span>标题</span>
              {f.title}
            </div>
            <div>
              <span>SEO 描述</span>
              {f.description}
            </div>
            <div>
              <span>作者</span>
              {f.author.name}
              {f.author.title ? ` · ${f.author.title}` : ''}
            </div>
            <div>
              <span>发布日期</span>
              {f.publishedAt}
            </div>
            <div>
              <span>摘要要点</span>
              {f.summaryCount} 条
            </div>
            <div>
              <span>正文区块</span>
              {f.blockCount} 块（
              {Object.entries(f.blockBreakdown)
                .map(([k, v]) => `${k}×${v}`)
                .join(' · ')}
              ）
            </div>
            <div>
              <span>配图</span>
              {f.imageCount} 张随导入提交
            </div>
            <div>
              <span>FAQ</span>
              {f.faqCount} 条
            </div>
            <div>
              <span>数据来源</span>
              {f.sourceCount} 条
            </div>
          </div>

          {resp.warnings && resp.warnings.length > 0 ? (
            <div className={styles.warn}>
              <strong>提示:</strong>
              <ul>
                {resp.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
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
