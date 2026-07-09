/**
 * 柱状 / 折线图（M4-3）—— 同组件两形态(variant: bar | line)。
 * ------------------------------------------------------------------
 * 纯服务端内联 SVG,零依赖、零版权风险;viewBox + CSS 宽 100% 自适应移动端。
 * 支持正负值(以 0 为基线);附带无障碍 <table>(sr-only),AI / 读屏可读。
 * 配色走 SAREC 令牌:正值 gold,负值 red-ish;折线 gold 描边 + 圆点。
 */
import type { ReactElement } from 'react';
import type { ChartPoint } from '@/lib/geo/types';
import styles from './charts.module.css';

const W = 760;
const H = 300;
const PAD_X = 40;
const PAD_TOP = 28;
const PAD_BOT = 48;

function fmt(v: number, unit?: string): string {
  const s = Number.isInteger(v) ? String(v) : v.toFixed(1);
  return unit ? `${s}${unit}` : s;
}

export function BarLineChart(props: {
  caption?: string;
  variant: 'bar' | 'line';
  unit?: string;
  series: ChartPoint[];
  source?: string;
}): ReactElement | null {
  const { caption, variant, unit, series, source } = props;
  if (!series.length) return null;

  const values = series.map((p) => p.value);
  const rawMax = Math.max(0, ...values);
  const rawMin = Math.min(0, ...values);
  const span = rawMax - rawMin || 1;
  const plotH = H - PAD_TOP - PAD_BOT;
  const plotW = W - PAD_X * 2;

  // 值 → y 像素(顶部小、底部大)。
  const yOf = (v: number) => PAD_TOP + ((rawMax - v) / span) * plotH;
  const zeroY = yOf(0);
  const slot = plotW / series.length;
  const xCenter = (i: number) => PAD_X + slot * i + slot / 2;

  return (
    <section className={styles.block} data-bar-line-chart={variant}>
      {caption ? <h3 className={styles.blockTitle}>{caption}</h3> : null}
      <div className={styles.chartWrap}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={caption ? `${caption}(${variant === 'bar' ? '柱状图' : '折线图'})` : '数据图表'}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 0 基线 */}
          <line x1={PAD_X} y1={zeroY} x2={W - PAD_X} y2={zeroY} className={styles.axis} />

          {variant === 'bar'
            ? series.map((p, i) => {
                const y = yOf(p.value);
                const top = Math.min(y, zeroY);
                const barH = Math.max(2, Math.abs(zeroY - y));
                const bw = Math.min(46, slot * 0.56);
                return (
                  <g key={i}>
                    <rect
                      x={xCenter(i) - bw / 2}
                      y={top}
                      width={bw}
                      height={barH}
                      className={p.value < 0 ? styles.barNeg : styles.barPos}
                      rx={2}
                    />
                    <text x={xCenter(i)} y={top - 6} className={styles.valueLabel} textAnchor="middle">
                      {fmt(p.value, unit)}
                    </text>
                  </g>
                );
              })
            : (() => {
                const pts = series.map((p, i) => `${xCenter(i)},${yOf(p.value)}`).join(' ');
                return (
                  <>
                    <polyline points={pts} className={styles.line} fill="none" />
                    {series.map((p, i) => (
                      <g key={i}>
                        <circle cx={xCenter(i)} cy={yOf(p.value)} r={4} className={styles.dot} />
                        <text
                          x={xCenter(i)}
                          y={yOf(p.value) - 10}
                          className={styles.valueLabel}
                          textAnchor="middle"
                        >
                          {fmt(p.value, unit)}
                        </text>
                      </g>
                    ))}
                  </>
                );
              })()}

          {/* x 轴标签 */}
          {series.map((p, i) => (
            <text key={i} x={xCenter(i)} y={H - PAD_BOT + 22} className={styles.axisLabel} textAnchor="middle">
              {p.label}
            </text>
          ))}
        </svg>
      </div>

      {source ? <p className={styles.chartSource}>来源:{source}</p> : null}

      {/* 无障碍 / AI 可读的等价数据表 */}
      <table className={styles.srOnlyTable}>
        <caption>{caption ?? '图表数据'}</caption>
        <thead>
          <tr>
            <th scope="col">项目</th>
            <th scope="col">数值{unit ? `(${unit})` : ''}</th>
          </tr>
        </thead>
        <tbody>
          {series.map((p, i) => (
            <tr key={i}>
              <th scope="row">{p.label}</th>
              <td>{fmt(p.value, unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
