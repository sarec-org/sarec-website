/**
 * GeoArticleRenderer —— SAREC GEO Article Template V1.3(同宽系统 + AI/code 生成视觉 + 测试钩子)。
 * ------------------------------------------------------------------
 * 只改展示层,不改 Article/Block 数据结构、不改事实内容、不编造正文/小节/来源。
 * 宽度系统:1440 大壳;Hero 主列、正文主列、表格、卡片、CTA 同属一个 main-column(w-full),不再缩窄。
 * 媒体位:用 SVG/CSS 代码生成视觉(GeneratedResearchVisual),不留空黑框、不引入图片资产。
 * 测试钩子:data-geo-* 属性供 /tmp 自动视觉测试使用。
 * 复用 globals token,不改 globals。SVG 仅装饰(aria-hidden),正文文字不依赖 SVG。
 */
import { Fragment, type ReactElement, type ReactNode } from 'react';
import Link from 'next/link';
import type { Article, Block } from '@/lib/geo/types';

const OUTER = 'mx-auto w-full max-w-[1440px] px-6 md:px-8 xl:px-10';
const MAIN_FULL = 'w-full'; // 所有主内容 block 同宽(主列宽度由 grid 决定)

const ANCHOR_OFFSET = 'scroll-mt-[110px]';
const CARD = 'rounded-lg border border-[var(--line-2)] bg-gradient-to-b from-[var(--ink-2)] to-[var(--ink-deep)]';

function toParagraphs(md: string): string[] {
  return md.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0);
}

function ctaHref(sourceSlug: string): string {
  return `/zh/contact?intent=risk-review&from=${encodeURIComponent(sourceSlug)}`;
}

const CALLOUT_TONE: Record<'risk' | 'note' | 'legal', { label: string; color: string }> = {
  risk: { label: '风险提示', color: 'var(--gold-warm)' },
  legal: { label: '法律边界', color: 'var(--gold)' },
  note: { label: '说明', color: 'var(--gold-dim)' }
};

/**
 * 代码生成的研究视觉(无图片/无 canvas/无外部素材/无随机,SSR 稳定)。
 * 主题:LA 天际线 + 网格地图 + 资本流动金色节点连线 + timeline dots。
 * variant='hero' 高;variant='strip' 矮(替代章节切换/assetBreak 的空框)。
 * SVG aria-hidden:仅装饰;标签为 DOM 文本(装饰用,非正文事实)。
 */
function GeneratedResearchVisual({ variant }: { variant: 'hero' | 'strip' }): ReactElement {
  const isHero = variant === 'hero';
  const h = isHero ? 'h-[220px] md:h-[300px] xl:h-[360px]' : 'h-[110px] md:h-[132px]';
  // 固定坐标(不随机);天际线、网格、资本流动线、节点、timeline。
  const buildings = [
    { x: 60, w: 46, y: 196 },
    { x: 116, w: 38, y: 150 },
    { x: 164, w: 30, y: 224 },
    { x: 204, w: 52, y: 120 },
    { x: 266, w: 34, y: 188 },
    { x: 310, w: 44, y: 96 },
    { x: 364, w: 30, y: 210 },
    { x: 404, w: 48, y: 158 },
    { x: 940, w: 40, y: 176 },
    { x: 990, w: 54, y: 110 },
    { x: 1054, w: 32, y: 206 },
    { x: 1096, w: 46, y: 144 }
  ];
  const nodes = [
    { x: 250, y: 250 },
    { x: 480, y: 196 },
    { x: 690, y: 244 },
    { x: 900, y: 188 }
  ];
  const flow = 'M250 250 L480 196 L690 244 L900 188';
  return (
    <div
      data-geo-generated-visual={variant}
      className={`relative w-full overflow-hidden rounded-xl border border-[var(--line-2)] bg-gradient-to-br from-[var(--ink-2)] via-[var(--ink-deep)] to-[var(--ink-deepest)] ${h}`}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 320"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <linearGradient id="geo-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#C9A567" stopOpacity="0.55" />
            <stop offset="1" stopColor="#C9A567" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        {/* 网格地图 */}
        <g stroke="#C9A567" strokeOpacity="0.10" strokeWidth="1">
          {[160, 320, 480, 640, 800, 960, 1120].map((x) => (
            <line key={`v${x}`} x1={x} y1="0" x2={x} y2="320" />
          ))}
          {[80, 160, 240].map((y) => (
            <line key={`h${y}`} x1="0" y1={y} x2="1200" y2={y} />
          ))}
        </g>
        {/* 天际线 / building silhouette */}
        <g fill="url(#geo-gold)">
          {buildings.map((b, i) => (
            <rect key={`b${i}`} x={b.x} y={b.y} width={b.w} height={320 - b.y} />
          ))}
        </g>
        {/* 资本流动线 + 节点 */}
        <path d={flow} stroke="#DBBA7C" strokeOpacity="0.55" strokeWidth="1.5" />
        {nodes.map((n, i) => (
          <circle
            key={`n${i}`}
            cx={n.x}
            cy={n.y}
            r="5"
            fill="#ECD292"
            className="motion-safe:animate-pulse"
          />
        ))}
        {/* timeline dots */}
        <g fill="#C9A567" fillOpacity="0.45">
          {[520, 560, 600, 640, 680].map((x) => (
            <circle key={`t${x}`} cx={x} cy="288" r="3" />
          ))}
        </g>
      </svg>

      {/* 角标(装饰文本) */}
      <div className="absolute left-5 top-5 flex items-center gap-2">
        <span className="h-px w-8 bg-[var(--gold-dim)]" />
        <span className="[font-family:var(--mono)] text-[0.68rem] uppercase tracking-[0.16em] text-[var(--ivory-mute)]">
          {isHero ? 'SAREC Research · Capital / Risk Map' : 'Section'}
        </span>
      </div>

      {isHero ? (
        <div className="absolute bottom-5 left-5 right-5 flex flex-wrap gap-x-5 gap-y-1">
          {['PERMIT', 'CAPITAL', 'CONSTRUCTION', 'COURT'].map((t) => (
            <span
              key={t}
              className="[font-family:var(--mono)] text-[0.66rem] uppercase tracking-[0.18em] text-[var(--gold-warm)]"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function renderBlock(block: Block, index: number): ReactNode {
  const key = `block-${index}`;

  switch (block.type) {
    case 'prose':
      return (
        <section key={key} className={`${MAIN_FULL} space-y-[1.5rem]`}>
          {toParagraphs(block.data.md).map((para, i) => (
            <p
              key={i}
              className="max-w-[72ch] text-[1.125rem] sm:text-[1.1875rem] leading-[1.95] [font-family:var(--serif-zh)] text-[var(--ivory-dim)]"
            >
              {para}
            </p>
          ))}
        </section>
      );

    case 'sectionHeading':
      return (
        <div key={key} className={`${MAIN_FULL} pt-12 sm:pt-16`}>
          <h2
            id={block.data.id}
            className={`${ANCHOR_OFFSET} border-l-[3px] border-[var(--gold)] pl-4 [font-family:var(--serif-zh)] text-[1.85rem] sm:text-[2.2rem] lg:text-[2.45rem] leading-[1.25] text-[var(--ivory)]`}
          >
            {block.data.text}
          </h2>
        </div>
      );

    case 'keyPoints':
      return (
        <section key={key} className={MAIN_FULL}>
          <div className={`${CARD} p-6 sm:p-8`}>
            {block.data.title ? (
              <p className="mb-4 [font-family:var(--mono)] text-[0.82rem] uppercase tracking-[0.12em] text-[var(--gold-warm)]">
                {block.data.title}
              </p>
            ) : null}
            <ul className="space-y-3">
              {block.data.items.map((item, i) => (
                <li
                  key={i}
                  className="relative max-w-[72ch] pl-6 text-[1.0625rem] leading-[1.8] text-[var(--ivory-dim)] before:absolute before:left-0 before:text-[var(--gold)] before:content-['—']"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      );

    case 'dataTable':
      return (
        <section key={key} className={MAIN_FULL}>
          <figure data-geo-table className={`${CARD} overflow-hidden`}>
            {block.data.caption ? (
              <figcaption className="border-b border-[var(--line-2)] bg-[var(--ink-2)] px-5 pb-3 pt-5 sm:px-7 [font-family:var(--mono)] text-[0.85rem] uppercase tracking-[0.1em] text-[var(--gold-warm)]">
                {block.data.caption}
              </figcaption>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-left">
                <tbody>
                  {block.data.rows.map((row, i) => (
                    <tr key={i} className="border-b border-[var(--line-2)] align-top last:border-0">
                      <th
                        scope="row"
                        className="w-[26%] min-w-[140px] px-5 py-4 sm:px-7 [font-family:var(--mono)] text-[0.9rem] font-medium text-[var(--ivory)]"
                      >
                        {row.label}
                      </th>
                      <td className="px-5 py-4 sm:px-7 text-[1rem] leading-[1.75] text-[var(--ivory-dim)]">
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
        </section>
      );

    case 'pullQuote':
      return (
        <section key={key} className={MAIN_FULL}>
          <figure className="py-8 text-center">
            <blockquote className="mx-auto max-w-[60ch] [font-family:var(--serif-zh)] text-[1.7rem] leading-[1.5] text-[var(--ivory)] sm:text-[2rem] lg:text-[2.15rem]">
              {block.data.text}
            </blockquote>
            {block.data.attribution ? (
              <figcaption className="mt-5 [font-family:var(--mono)] text-[0.82rem] uppercase tracking-[0.12em] text-[var(--gold-warm)]">
                {block.data.attribution}
              </figcaption>
            ) : null}
          </figure>
        </section>
      );

    case 'callout': {
      const tone = CALLOUT_TONE[block.data.tone];
      return (
        <section key={key} className={MAIN_FULL}>
          <div
            className="rounded-lg border border-l-[3px] border-[var(--line-2)] bg-[var(--ink-2)] p-6 sm:p-7"
            style={{ borderLeftColor: tone.color }}
          >
            <p
              className="mb-2 [font-family:var(--mono)] text-[0.76rem] uppercase tracking-[0.12em]"
              style={{ color: tone.color }}
            >
              {tone.label}
            </p>
            <div className="space-y-2">
              {toParagraphs(block.data.md).map((para, i) => (
                <p key={i} className="max-w-[72ch] text-[1.0625rem] leading-[1.85] text-[var(--ivory-dim)]">
                  {para}
                </p>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case 'qaUnit':
      return (
        <section key={key} id={block.data.id} className={`${MAIN_FULL} ${ANCHOR_OFFSET}`}>
          <div className={`${CARD} p-6 sm:p-8`}>
            <p className="mb-2 [font-family:var(--mono)] text-[0.74rem] uppercase tracking-[0.12em] text-[var(--gold-warm)]">
              问答
            </p>
            <h3 className="[font-family:var(--serif-zh)] text-[1.3rem] leading-[1.45] text-[var(--ivory)] sm:text-[1.45rem]">
              {block.data.question}
            </h3>
            <p className="mt-3 max-w-[72ch] text-[1.0625rem] leading-[1.85] text-[var(--ivory-dim)]">
              {block.data.judgment}
            </p>
            <p className="mt-3 max-w-[72ch] text-[0.92rem] leading-[1.7] text-[var(--ivory-mute)]">
              <span className="text-[var(--gold)]">边界 · </span>
              {block.data.boundary}
            </p>
            {block.data.riskNote ? (
              <p className="mt-1.5 max-w-[72ch] text-[0.92rem] leading-[1.7] text-[var(--ivory-mute)]">
                <span className="text-[var(--gold)]">风险提示 · </span>
                {block.data.riskNote}
              </p>
            ) : null}
          </div>
        </section>
      );

    case 'caseRef': {
      const isOceanwide = block.data.caseSlug === 'oceanwide-plaza';
      const caseTitle = isOceanwide ? 'Oceanwide Plaza · 泛海广场' : block.data.caseSlug;
      const caseDesc = isOceanwide
        ? '用于说明跨境资本、施工贷款、EB-5 与破产处置风险。'
        : null;
      return (
        <section key={key} className={MAIN_FULL}>
          <div className={`${CARD} flex items-start gap-4 p-6 sm:p-7`}>
            <div className="mt-1 h-10 w-1 shrink-0 rounded-full bg-[var(--gold)]" aria-hidden="true" />
            <div>
              <p className="[font-family:var(--mono)] text-[0.74rem] uppercase tracking-[0.12em] text-[var(--gold-warm)]">
                案例引用
              </p>
              <p className="mt-2 [font-family:var(--serif-zh)] text-[1.2rem] text-[var(--ivory)]">
                {caseTitle}
              </p>
              {caseDesc ? (
                <p className="mt-2 max-w-[72ch] text-[0.98rem] leading-[1.7] text-[var(--ivory-dim)]">
                  {caseDesc}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      );
    }

    case 'assetBreak':
      // 真实图缺位:用代码生成 strip(不留黑洞)。
      return (
        <section key={key} className={MAIN_FULL}>
          <GeneratedResearchVisual variant="strip" />
        </section>
      );

    case 'cta':
      return (
        <section key={key} className={MAIN_FULL}>
          <div className={`${CARD} p-8 text-center sm:p-10`}>
            <h2 className="[font-family:var(--serif-zh)] text-[1.5rem] leading-[1.4] text-[var(--ivory)] sm:text-[1.75rem]">
              需要做美国房地产项目风险初筛?
            </h2>
            <p className="mx-auto mt-3 max-w-[600px] text-[1.0625rem] leading-[1.8] text-[var(--ivory-dim)]">
              SAREC 可基于公开信息、项目路径与风险清单做初步研究与讨论。
            </p>
            <Link
              href={ctaHref(block.data.sourceSlug)}
              className="mt-7 inline-block border border-[var(--gold)] px-8 py-3 [font-family:var(--mono)] text-[0.84rem] uppercase tracking-[0.1em] text-[var(--gold)] transition-colors hover:bg-[var(--gold)] hover:text-[var(--ink-deepest)]"
            >
              联系 SAREC →
            </Link>
          </div>
        </section>
      );

    default: {
      const _exhaustive: never = block;
      void _exhaustive;
      return null;
    }
  }
}

const HERO_TOPICS = ['10 大陷阱', 'Oceanwide Plaza', 'Entitlement', 'EB-5', '1031', 'CBP', 'FCPA'];

export function GeoArticleRenderer(props: { article: Article }): ReactElement {
  const { article } = props;

  const toc = article.blocks
    .filter((b): b is Extract<Block, { type: 'sectionHeading' }> => b.type === 'sectionHeading')
    .map((b) => ({ id: b.data.id, text: b.data.text }))
    .filter((h): h is { id: string; text: string } => Boolean(h.id));

  return (
    <article data-geo-article-root className="bg-[var(--ink-deepest)] text-[var(--ivory-dim)]">
      {/* ── Hero ── */}
      <header className="border-b border-[var(--line-2)] bg-gradient-to-b from-[var(--ink-deep)] to-[var(--ink-deepest)]">
        <div
          className={`${OUTER} py-14 sm:py-20 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-12`}
        >
          <div data-geo-hero-main className="min-w-0">
            <p className="[font-family:var(--mono)] text-[0.76rem] uppercase tracking-[0.18em] text-[var(--gold-warm)]">
              Evidence · Risk Brief
            </p>
            <h1 className="mt-4 [font-family:var(--serif-zh)] text-[2.5rem] leading-[1.12] text-[var(--ivory)] sm:text-[3rem] lg:text-[3.25rem]">
              {article.title}
            </h1>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1 [font-family:var(--mono)] text-[0.84rem] text-[var(--ivory-mute)]">
              <span>
                作者 {article.author.name}
                {article.author.title ? ` · ${article.author.title}` : ''}
              </span>
              <span>
                发布 {article.publishedAt}
                {article.updatedAt ? ` · 更新 ${article.updatedAt}` : ''}
              </span>
            </div>
            {article.summary.length > 0 ? (
              <div className="mt-8 max-w-[760px] space-y-2 border-l-[3px] border-[var(--gold)] pl-5">
                {article.summary.map((s, i) => (
                  <p key={i} className="text-[1.0625rem] leading-[1.75] text-[var(--ivory-dim)]">
                    {s}
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="mt-8 lg:mt-0">
            <div className={`${CARD} p-5 sm:p-6`}>
              <p className="[font-family:var(--mono)] text-[0.76rem] uppercase tracking-[0.14em] text-[var(--gold-warm)]">
                Research Brief
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {HERO_TOPICS.map((t) => (
                  <li
                    key={t}
                    className="rounded-sm border border-[var(--line-3)] px-2.5 py-1 [font-family:var(--mono)] text-[0.76rem] text-[var(--ivory-dim)]"
                  >
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-[var(--line-2)] pt-4 text-[0.82rem] leading-[1.6] text-[var(--ivory-mute)]">
                公开信息研究 · 风险教育 · 不构成法律/税务/证券/移民建议
              </p>
            </div>
          </aside>
        </div>

        {/* Hero 媒体位:代码生成视觉(全宽) */}
        <div className={`${OUTER} pb-12 sm:pb-16`}>
          <div data-geo-media-hero>
            <GeneratedResearchVisual variant="hero" />
          </div>
        </div>
      </header>

      {/* ── 正文区:OUTER 两列(主列 + sticky rail);主列 w-full 与 Hero 同宽系统 ── */}
      <div className={`${OUTER} lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-14`}>
        <div data-geo-body-main className="min-w-0 space-y-10 py-12 sm:space-y-12 sm:py-16">
          {article.blocks.map((block, index) => {
            const isMajorPart =
              block.type === 'sectionHeading' && /第.+部分/.test(block.data.text);
            return (
              <Fragment key={`frag-${index}`}>
                {isMajorPart ? (
                  <div className={MAIN_FULL}>
                    <GeneratedResearchVisual variant="strip" />
                  </div>
                ) : null}
                {renderBlock(block, index)}
              </Fragment>
            );
          })}
        </div>

        <aside data-geo-rail className="hidden lg:block">
          <div className="sticky top-[110px] space-y-6 py-16">
            {toc.length > 0 ? (
              <nav aria-label="本文结构">
                <p className="mb-3 [font-family:var(--mono)] text-[0.76rem] uppercase tracking-[0.14em] text-[var(--gold-warm)]">
                  本文结构
                </p>
                <ol className="space-y-2">
                  {toc.map((h) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className="block text-[0.86rem] leading-[1.5] text-[var(--ivory-mute)] transition-colors hover:text-[var(--gold-warm)]"
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}

            <div className="border-t border-[var(--line-2)] pt-5">
              <p className="text-[0.82rem] leading-[1.6] text-[var(--ivory-mute)]">
                研究范围:本文为公开信息研究与风险教育,不构成法律/税务/证券/移民建议。
              </p>
            </div>

            <div className={`${CARD} p-5`}>
              <p className="[font-family:var(--mono)] text-[0.74rem] uppercase tracking-[0.12em] text-[var(--gold-warm)]">
                风险初筛
              </p>
              <p className="mt-2 text-[0.9rem] leading-[1.6] text-[var(--ivory-dim)]">
                基于公开信息与项目路径做一次初步研究与讨论。
              </p>
              <Link
                href={ctaHref(article.slug)}
                className="mt-4 inline-block border border-[var(--gold)] px-4 py-2 [font-family:var(--mono)] text-[0.78rem] uppercase tracking-[0.08em] text-[var(--gold)] transition-colors hover:bg-[var(--gold)] hover:text-[var(--ink-deepest)]"
              >
                联系 SAREC →
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}
