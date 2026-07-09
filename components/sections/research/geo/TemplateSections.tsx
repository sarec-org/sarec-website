/**
 * 模板专属区块（M2）—— 按栏目在规范位置渲染模板元字段。
 * ------------------------------------------------------------------
 * 头部(hero 后、正文前):深度=核心判断卡(与 summary 不同才显示,避免重复) / 数据追踪=数据周期+变化说明 /
 *   快评=一句话结论 + 背景 + 影响 + SAREC 判断。
 * 尾部(正文后):深度=SAREC 判断清单。
 * 纯展示,数据来自扁平 Article 字段(adapter 已还原)。
 */
import type { ReactElement } from 'react';
import type { Article } from '@/lib/geo/types';
import { renderInline } from './renderInline';
import styles from './TemplateSections.module.css';

function sameList(a: string[] = [], b: string[] = []): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

export function TemplateHeader({ article }: { article: Article }): ReactElement | null {
  const nodes: ReactElement[] = [];

  // 深度:核心判断卡(仅当与 summary 不同,避免与 hero 速览重复)
  if (article.template === 'deep' && article.tldr && article.tldr.length > 0 && !sameList(article.tldr, article.summary)) {
    nodes.push(
      <div key="tldr" className={styles.tldrCard}>
        <div className={styles.tldrLabel}>核心判断</div>
        <ul className={styles.tldrList}>
          {article.tldr.map((t, i) => (
            <li key={i}>{renderInline(t, `tldr-${i}`)}</li>
          ))}
        </ul>
      </div>
    );
  }

  // 数据追踪:数据周期 + 变化说明
  if (article.template === 'data' && (article.dataPeriod || article.changeNote)) {
    nodes.push(
      <div key="data" className={styles.dataCard}>
        {article.dataPeriod ? <div className={styles.dataPeriod}>数据周期:{article.dataPeriod}</div> : null}
        {article.changeNote ? <p className={styles.changeNote}>{renderInline(article.changeNote, 'chg')}</p> : null}
      </div>
    );
  }

  // 快评:一句话结论 + 背景 + 影响 + 判断
  if (article.template === 'brief' && article.brief) {
    const b = article.brief;
    nodes.push(
      <div key="brief" className={styles.briefWrap}>
        <p className={styles.briefOneLine}>{renderInline(b.oneLine, 'one')}</p>
        {b.background ? (
          <div className={styles.briefSection}>
            <span className={styles.briefTag}>背景</span>
            <p>{renderInline(b.background, 'bg')}</p>
          </div>
        ) : null}
        {b.impact ? (
          <div className={styles.briefSection}>
            <span className={styles.briefTag}>影响</span>
            <p>{renderInline(b.impact, 'im')}</p>
          </div>
        ) : null}
        {b.judgment ? (
          <div className={styles.briefSection}>
            <span className={styles.briefTag}>SAREC 判断</span>
            <p>{renderInline(b.judgment, 'jd')}</p>
          </div>
        ) : null}
      </div>
    );
  }

  if (!nodes.length) return null;
  return <div className={styles.header}>{nodes}</div>;
}

export function TemplateFooter({ article }: { article: Article }): ReactElement | null {
  if (article.template !== 'deep' || !article.judgmentChecklist || article.judgmentChecklist.length === 0) {
    return null;
  }
  return (
    <section className={styles.checklist} aria-label="SAREC 判断清单">
      <h2 className={styles.checklistTitle}>SAREC 判断清单</h2>
      <ol className={styles.checklistList}>
        {article.judgmentChecklist.map((item, i) => (
          <li key={i}>{renderInline(item, `ck-${i}`)}</li>
        ))}
      </ol>
    </section>
  );
}
