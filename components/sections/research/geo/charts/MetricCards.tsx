/**
 * 指标卡（M4-1）—— 大数字 + 标签 + 同/环比。
 * ------------------------------------------------------------------
 * 纯服务端渲染,零依赖;trend 决定颜色与箭头(up 绿 / down 红 / flat 中性)。
 * 响应式:桌面多列网格,移动端自适应换行,最窄 1 列。
 */
import type { ReactElement } from 'react';
import type { MetricCard } from '@/lib/geo/types';
import styles from './charts.module.css';

const ARROW: Record<NonNullable<MetricCard['trend']>, string> = {
  up: '▲',
  down: '▼',
  flat: '—',
};

export function MetricCards(props: { title?: string; items: MetricCard[] }): ReactElement | null {
  const { title, items } = props;
  if (!items.length) return null;
  return (
    <section className={styles.block} data-metric-cards>
      {title ? <h3 className={styles.blockTitle}>{title}</h3> : null}
      <div className={styles.metricGrid}>
        {items.map((m, i) => (
          <div key={i} className={styles.metricCard}>
            <div className={styles.metricLabel}>{m.label}</div>
            <div className={styles.metricValue}>{m.value}</div>
            {m.change ? (
              <div className={styles.metricChange} data-trend={m.trend ?? 'flat'}>
                <span aria-hidden="true">{ARROW[m.trend ?? 'flat']}</span> {m.change}
              </div>
            ) : null}
            {m.note ? <div className={styles.metricNote}>{m.note}</div> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
