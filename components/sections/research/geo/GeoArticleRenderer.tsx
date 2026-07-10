/**
 * GeoArticleRenderer —— GEO B+ Core 文章渲染接缝(P1-3)。
 * ------------------------------------------------------------------
 * 验证 lib/geo 的 Article.blocks 判别联合能被 switch 渲染到现有研究组件 / 保守结构上。
 *
 * 边界(本步刻意不做,留给后续路由/页面层):
 * - 不 import 访问层、不调用任何取数函数(内容由 caller 以 props 传入)。
 * - 不 import / 不调用任何 schema 生成器(JSON-LD 注入是页面层的事)。
 * - 不处理 published/draft、不接导航、不建路由。
 * - 只 `import type` 自 @/lib/geo/types;value import 现有研究组件,且不改这些旧组件。
 * - 视觉非终稿:仅建结构接缝,样式优先复用现有组件,其余用语义 HTML 保守渲染。
 */
import type { ReactElement, ReactNode } from 'react';
import type { Article, Block } from '@/lib/geo/types';
import { columnLabel } from '@/lib/geo/labels';
import { renderInline } from './renderInline';
import { ArticleHero } from '@/components/sections/research/ArticleHero';
import { ArticleSection } from '@/components/sections/research/ArticleSection';
import { PullQuote } from '@/components/sections/research/PullQuote';
import { AssetBreak } from '@/components/sections/research/AssetBreak';
import { MidArticleCTA } from '@/components/sections/research/MidArticleCTA';
import { TemplateHeader, TemplateFooter } from './TemplateSections';
import { MetricCards } from './charts/MetricCards';
import { ChartTable } from './charts/ChartTable';
import { BarLineChart } from './charts/BarLineChart';
import styles from './GeoArticleRenderer.module.css';

// 把 prose 的 md 文本按空行拆成段落(纯文本,不引 markdown 库)。
function toParagraphs(md: string): string[] {
  return md.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0);
}

function ctaHref(sourceSlug: string): string {
  return `/zh/contact?intent=risk-review&from=${encodeURIComponent(sourceSlug)}`;
}

function renderBlock(block: Block, index: number, headingIds?: Record<number, string>): ReactNode {
  const key = `block-${index}`;

  switch (block.type) {
    case 'prose':
      return (
        <section key={key} className={styles.reading}>
          {toParagraphs(block.data.md).map((para, i) => (
            <p key={i}>{renderInline(para, `${key}-p${i}`)}</p>
          ))}
        </section>
      );

    case 'sectionHeading':
      return (
        <h2 key={key} id={block.data.id ?? headingIds?.[index]} className={styles.heading}>
          {block.data.text}
        </h2>
      );

    case 'keyPoints':
      // data.title 可选:存在则用 ArticleSection(其 title 为必填,不臆造);否则保守 <ul>。
      return block.data.title ? (
        <ArticleSection
          key={key}
          title={block.data.title}
          points={block.data.items}
          width="wide"
        />
      ) : (
        <section key={key} className={styles.reading}>
          <ul>
            {block.data.items.map((item, i) => (
              <li key={i}>{renderInline(item, `${key}-li${i}`)}</li>
            ))}
          </ul>
        </section>
      );

    case 'dataTable':
      // data.caption 可选:存在则 ArticleSection(width='data');否则保守 <table>,均不丢 rows。
      return block.data.caption ? (
        <ArticleSection
          key={key}
          title={block.data.caption}
          table={block.data.rows}
          width="wide"
        />
      ) : (
        <section key={key} className={styles.reading}>
          <table>
            <tbody>
              {block.data.rows.map((row, i) => (
                <tr key={i}>
                  <th scope="row">{row.label}</th>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      );

    case 'pullQuote':
      return (
        <PullQuote key={key} text={block.data.text} attribution={block.data.attribution} />
      );

    case 'callout':
      // 保守渲染:tone 仅作 data 属性(上色留后),文本支持行内加粗/链接。
      return (
        <section key={key} className={styles.reading} data-callout-tone={block.data.tone}>
          {toParagraphs(block.data.md).map((para, i) => (
            <p key={i}>{renderInline(para, `${key}-p${i}`)}</p>
          ))}
        </section>
      );

    case 'qaUnit':
      // 保守 card:question→标题,judgment→正文,evidence 为 Source ID 原样列出(本步不解析),
      // boundary / riskNote 作注。不丢任何字段。
      return (
        <section key={key} id={block.data.id} className={styles.reading} data-qa-unit>
          <h3>{block.data.question}</h3>
          <p>{renderInline(block.data.judgment, `${key}-j`)}</p>
          {block.data.evidence.length > 0 ? (
            <ul data-evidence>
              {block.data.evidence.map((srcId, i) => (
                <li key={i}>{srcId}</li>
              ))}
            </ul>
          ) : null}
          <p data-boundary>{renderInline(block.data.boundary, `${key}-bd`)}</p>
          {block.data.riskNote ? <p data-risk-note>{renderInline(block.data.riskNote, `${key}-rn`)}</p> : null}
        </section>
      );

    case 'caseRef':
      // 保守 card:显示 caseSlug 原值(本步不解析 case、不出真实 href,路由尚未建)。
      return (
        <section key={key} className={styles.reading} data-case-ref={block.data.caseSlug}>
          <p>案例引用:{block.data.caseSlug}</p>
        </section>
      );

    case 'assetBreak':
      // 仅 video 用 AssetBreak(不改该组件);image 型保守 card,均不丢数据。
      if (block.data.kind === 'video') {
        return (
          <AssetBreak
            key={key}
            videoSrc={block.data.src}
            videoPoster={block.data.poster ?? ''}
            caption={block.data.alt}
            leftEyebrow={block.data.eyebrow}
            leftTitle={block.data.title}
            leftBody={block.data.body}
          />
        );
      }
      return (
        <section key={key} className={styles.reading}>
          {block.data.eyebrow ? <p>{block.data.eyebrow}</p> : null}
          {block.data.title ? <h3>{block.data.title}</h3> : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.data.src} alt={block.data.alt} />
          {block.data.body ? <p>{block.data.body}</p> : null}
        </section>
      );

    case 'cta':
      // 出链到 contact(intent + from);表单接线留 P1-4,本步只出链。
      return (
        <MidArticleCTA
          key={key}
          body={block.data.label}
          ctaLabel={block.data.label}
          ctaHref={ctaHref(block.data.sourceSlug)}
        />
      );

    case 'metricCards':
      return <MetricCards key={key} title={block.data.title} items={block.data.items} />;

    case 'chartTable':
      return (
        <ChartTable
          key={key}
          caption={block.data.caption}
          headers={block.data.headers}
          rows={block.data.rows}
        />
      );

    case 'barLineChart':
      return (
        <BarLineChart
          key={key}
          caption={block.data.caption}
          variant={block.data.variant}
          unit={block.data.unit}
          series={block.data.series}
          source={block.data.source}
        />
      );

    default: {
      // 穷尽性检查:未来 Block 联合新增成员而此处漏处理时,这里会编译报错。
      const _exhaustive: never = block;
      void _exhaustive;
      return null;
    }
  }
}

// 章节目录项(报告版侧边导航用)。
type TocEntry = { id: string; text: string };

// 报告版侧边目录 —— 桌面 sticky 侧栏 + 移动端可折叠 <details>(纯 CSS 响应,无 JS)。
function TableOfContents({ entries }: { entries: TocEntry[] }): ReactElement | null {
  if (entries.length === 0) return null;
  const list = (
    <ol className={styles.tocList}>
      {entries.map((e) => (
        <li key={e.id}>
          <a href={`#${e.id}`}>{e.text}</a>
        </li>
      ))}
    </ol>
  );
  return (
    <>
      <aside className={styles.tocDesktop} aria-label="本文目录">
        <div className={styles.tocLabel}>目录</div>
        {list}
      </aside>
      <details className={styles.tocMobile}>
        <summary>本文目录（{entries.length} 节）</summary>
        {list}
      </details>
    </>
  );
}

export function GeoArticleRenderer(props: { article: Article }): ReactElement {
  const { article } = props;
  const layout = article.layout ?? 'classic';

  // 有实际 hero media 才用 ArticleHero 的左右分栏;否则用居中 hero,避免右侧空黑块。
  const heroImage = article.heroMedia?.kind === 'image' ? article.heroMedia.src : undefined;
  const heroVideo =
    article.heroMedia?.kind === 'video' && article.heroMedia.poster
      ? { src: article.heroMedia.src, poster: article.heroMedia.poster }
      : undefined;
  const hasHeroMedia = Boolean(heroImage || heroVideo);

  // 前台头部 eyebrow 显示栏目中文名（M3.1），不再暴露 cluster 机器串。
  const eyebrow = columnLabel(article);

  // 为每个小标题分配稳定锚点 id(报告版目录与正文一一对应;不改内容,仅渲染层)。
  const headingIds: Record<number, string> = {};
  const tocEntries: TocEntry[] = [];
  article.blocks.forEach((b, i) => {
    if (b.type === 'sectionHeading') {
      const id = b.data.id || `sec-${i}`;
      headingIds[i] = id;
      tocEntries.push({ id, text: b.data.text });
    }
  });

  // 简报版「数据前置」:把第一个数据块(指标卡 / 多列数据表 / 数据表)提到速览之后,正文其余照旧。
  const hoistIndex =
    layout === 'compact'
      ? article.blocks.findIndex(
          (b) => b.type === 'metricCards' || b.type === 'chartTable' || b.type === 'dataTable'
        )
      : -1;

  const hero = hasHeroMedia ? (
    <ArticleHero
      eyebrow={eyebrow}
      title={article.title}
      summary={article.summary.join(' ')}
      author={{
        name: article.author.name,
        ...(article.author.title ? { title: article.author.title } : {})
      }}
      dates={{
        published: article.publishedAt,
        ...(article.updatedAt ? { modified: article.updatedAt } : {})
      }}
      {...(heroImage ? { heroImage } : {})}
      {...(heroVideo ? { heroVideo } : {})}
    />
  ) : (
    <header className={styles.centeredHero}>
      <p className={styles.centeredEyebrow}>{eyebrow}</p>
      <h1 className={styles.centeredTitle}>{article.title}</h1>
      <p className={styles.centeredSummary}>{article.summary.join(' ')}</p>
      <div className={styles.centeredByline}>
        <span>
          作者
          <span className={styles.bylineName}>{article.author.name}</span>
          {article.author.title ? (
            <span className={styles.bylineTitle}>{article.author.title}</span>
          ) : null}
        </span>
        <span>
          <time dateTime={article.publishedAt}>发布 {article.publishedAt}</time>
          {article.updatedAt ? (
            <time dateTime={article.updatedAt}> · 更新 {article.updatedAt}</time>
          ) : null}
        </span>
      </div>
    </header>
  );

  const body = article.blocks.map((block, index) =>
    index === hoistIndex ? null : renderBlock(block, index, headingIds)
  );

  // ── 报告版:hero 全宽 + 侧边目录 / 正文两栏 ──────────────────────────
  if (layout === 'report') {
    return (
      <article className={`${styles.article} ${styles.report}`}>
        {hero}
        <div className={styles.reportGrid}>
          <TableOfContents entries={tocEntries} />
          <div className={styles.reportMain}>
            <TemplateHeader article={article} />
            {body}
            <TemplateFooter article={article} />
          </div>
        </div>
      </article>
    );
  }

  // ── 简报版:TL;DR 置顶卡 + 数据前置 + 紧凑排版 ─────────────────────
  if (layout === 'compact') {
    const digest = article.tldr && article.tldr.length > 0 ? article.tldr : article.summary;
    return (
      <article className={`${styles.article} ${styles.compact}`}>
        {hero}
        {digest.length > 0 ? (
          <section className={styles.compactDigest} aria-label="速览">
            <div className={styles.compactDigestLabel}>速览</div>
            <ul>
              {digest.map((d, i) => (
                <li key={i}>{renderInline(d, `dg-${i}`)}</li>
              ))}
            </ul>
          </section>
        ) : null}
        {hoistIndex >= 0 ? renderBlock(article.blocks[hoistIndex], hoistIndex, headingIds) : null}
        {/* 简报版不重复顶部 TL;DR(已由速览卡承担),仅保留快评/数据追踪的模板卡 */}
        <TemplateHeader article={article} suppressTldr />
        {body}
        <TemplateFooter article={article} />
      </article>
    );
  }

  // ── 经典版(默认,老文章走此路,行为不变)─────────────────────────
  return (
    <article className={styles.article}>
      {hero}
      <TemplateHeader article={article} />
      {article.blocks.map((block, index) => renderBlock(block, index, headingIds))}
      <TemplateFooter article={article} />
    </article>
  );
}
