/**
 * 对比 / 数据表（M4-2）—— 表头 + 可选高亮行,支持任意列数。
 * ------------------------------------------------------------------
 * 语义 <table>(利于 AI 抓取与无障碍);移动端表体横向滚动,不撑破页面。
 * 高亮行用 data-highlight,样式在 charts.module.css。
 */
import type { ReactElement } from 'react';
import type { ChartTableRow } from '@/lib/geo/types';
import styles from './charts.module.css';

export function ChartTable(props: {
  caption?: string;
  headers: string[];
  rows: ChartTableRow[];
}): ReactElement | null {
  const { caption, headers, rows } = props;
  if (!rows.length) return null;
  return (
    <section className={styles.block} data-chart-table>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          {caption ? <caption className={styles.tableCaption}>{caption}</caption> : null}
          {headers.length > 0 ? (
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} data-highlight={row.highlight ? 'true' : undefined}>
                {row.cells.map((c, ci) => (
                  <td key={ci}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
