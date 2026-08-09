'use client';

/**
 * 临时真机视口诊断组件(下一轮删除)。
 * 在微信/iOS 里打开 /debug/viewport 上下滑动,观察:
 *  - innerHeight / visualViewport.height 实时值
 *  - 1svh / 1lvh / 1dvh / 1vh 的实际像素(由隐藏的 100 单位测量块读取)
 *  - 各单位在滑动中的变化范围 Δ(半屏跳动=某单位 ×50 的 Δ 很大)
 *  - 50svh(红)/ 50vh(蓝)/ 300px(绿)三块的实时高度
 * 全部在客户端读取,渲染纯净,不影响 SSG。
 */

import { useEffect, useRef, useState } from 'react';

type Snap = {
  innerHeight: number;
  vv: number | null;
  svh: number;
  lvh: number;
  dvh: number;
  vh: number;
  red: number;
  blue: number;
  green: number;
};

type Range = {
  svhMin: number;
  svhMax: number;
  vhMin: number;
  vhMax: number;
  ihMin: number;
  ihMax: number;
};

const INIT_RANGE: Range = {
  svhMin: Infinity,
  svhMax: 0,
  vhMin: Infinity,
  vhMax: 0,
  ihMin: Infinity,
  ihMax: 0
};

export function ViewportDebug() {
  const [snap, setSnap] = useState<Snap | null>(null);
  const [counts, setCounts] = useState({ resize: 0, scroll: 0, vvResize: 0, vvScroll: 0 });
  const [range, setRange] = useState<Range>(INIT_RANGE);
  const rangeRef = useRef<Range>({ ...INIT_RANGE });

  const svhRef = useRef<HTMLDivElement>(null);
  const lvhRef = useRef<HTMLDivElement>(null);
  const dvhRef = useRef<HTMLDivElement>(null);
  const vhRef = useRef<HTMLDivElement>(null);
  const redRef = useRef<HTMLDivElement>(null);
  const blueRef = useRef<HTMLDivElement>(null);
  const greenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hpx = (el: HTMLDivElement | null) => (el ? el.getBoundingClientRect().height : 0);

    const read = () => {
      const svh = hpx(svhRef.current) / 100;
      const lvh = hpx(lvhRef.current) / 100;
      const dvh = hpx(dvhRef.current) / 100;
      const vh = hpx(vhRef.current) / 100;
      const ih = window.innerHeight;

      const r = rangeRef.current;
      r.svhMin = Math.min(r.svhMin, svh);
      r.svhMax = Math.max(r.svhMax, svh);
      r.vhMin = Math.min(r.vhMin, vh);
      r.vhMax = Math.max(r.vhMax, vh);
      r.ihMin = Math.min(r.ihMin, ih);
      r.ihMax = Math.max(r.ihMax, ih);
      setRange({ ...r });

      setSnap({
        innerHeight: ih,
        vv: window.visualViewport ? window.visualViewport.height : null,
        svh,
        lvh,
        dvh,
        vh,
        red: hpx(redRef.current),
        blue: hpx(blueRef.current),
        green: hpx(greenRef.current)
      });
    };

    read();

    const onResize = () => {
      setCounts((c) => ({ ...c, resize: c.resize + 1 }));
      read();
    };
    const onScroll = () => {
      setCounts((c) => ({ ...c, scroll: c.scroll + 1 }));
      read();
    };
    const onVVResize = () => {
      setCounts((c) => ({ ...c, vvResize: c.vvResize + 1 }));
      read();
    };
    const onVVScroll = () => {
      setCounts((c) => ({ ...c, vvScroll: c.vvScroll + 1 }));
      read();
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { passive: true });
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', onVVResize);
      vv.addEventListener('scroll', onVVScroll);
    }
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      if (vv) {
        vv.removeEventListener('resize', onVVResize);
        vv.removeEventListener('scroll', onVVScroll);
      }
    };
  }, []);

  const f = (n: number | null | undefined, d = 1) => (n == null ? '—' : n.toFixed(d));

  const panel: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    background: 'rgba(0,0,0,0.9)',
    borderBottom: '1px solid #444',
    padding: '10px 12px',
    fontSize: 13,
    lineHeight: 1.55
  };

  const blockBase: React.CSSProperties = {
    flex: 1,
    color: '#fff',
    padding: 8,
    fontSize: 12,
    fontWeight: 700,
    boxSizing: 'border-box',
    overflow: 'hidden'
  };

  return (
    <main
      style={{
        background: '#0b0f1a',
        color: '#e8e8e8',
        fontFamily: 'ui-monospace, Menlo, Consolas, monospace'
      }}
    >
      {/* 隐藏的单位测量块:height 100X → rect.height/100 = 1X 的像素 */}
      <div
        aria-hidden="true"
        style={{ position: 'fixed', top: 0, left: 0, width: 1, opacity: 0, pointerEvents: 'none', zIndex: -1 }}
      >
        <div ref={svhRef} style={{ height: '100svh' }} />
        <div ref={lvhRef} style={{ height: '100lvh' }} />
        <div ref={dvhRef} style={{ height: '100dvh' }} />
        <div ref={vhRef} style={{ height: '100vh' }} />
      </div>

      {/* 固定读数面板(滚动时常驻) */}
      <div style={panel}>
        <div>
          <b>innerHeight</b> {snap ? snap.innerHeight : '—'}px &nbsp;·&nbsp; <b>visualViewport</b>{' '}
          {f(snap?.vv, 0)}px
        </div>
        <div>
          <span style={{ color: '#ff6b6b' }}>1svh</span> {f(snap?.svh, 2)} ·{' '}
          <span style={{ color: '#ffd166' }}>1lvh</span> {f(snap?.lvh, 2)} ·{' '}
          <span style={{ color: '#06d6a0' }}>1dvh</span> {f(snap?.dvh, 2)} ·{' '}
          <span style={{ color: '#4dabf7' }}>1vh</span> {f(snap?.vh, 2)} px
        </div>
        <div>
          范围 svh [{f(range.svhMin)}→{f(range.svhMax)}] <b>Δ{f(range.svhMax - range.svhMin)}</b> · vh [
          {f(range.vhMin)}→{f(range.vhMax)}] <b>Δ{f(range.vhMax - range.vhMin)}</b> · innerH{' '}
          <b>Δ{f(range.ihMax - range.ihMin, 0)}</b>
        </div>
        <div>
          50svh ≈ <b>{f((snap?.svh ?? 0) * 50, 0)}px</b> &nbsp;·&nbsp; events R{counts.resize} / S
          {counts.scroll} / vvR{counts.vvResize} / vvS{counts.vvScroll}
        </div>
      </div>

      <div style={{ height: 148 }} />

      <p style={{ padding: '0 12px', fontSize: 13, color: '#9aa6b2' }}>
        微信里打开本页,上下滑动。看顶部面板:哪个单位(svh/lvh/dvh/vh)的像素在变、变多少(Δ);50svh 红块高度是否随滑动变化。
        若 svh 的 Δ 很大(≈ vh 的 Δ),说明微信里 svh 等同 vh(随地址栏变)→ 用修法 A。
      </p>

      {/* 三块并排:50svh 红 / 50vh 蓝 / 300px 绿 */}
      <div style={{ display: 'flex', gap: 6, padding: 12, alignItems: 'flex-start' }}>
        <div ref={redRef} style={{ ...blockBase, height: '50svh', background: '#c0392b' }}>
          50svh
          <br />
          {f(snap?.red)}px
        </div>
        <div ref={blueRef} style={{ ...blockBase, height: '50vh', background: '#2471a3' }}>
          50vh
          <br />
          {f(snap?.blue)}px
        </div>
        <div ref={greenRef} style={{ ...blockBase, height: 300, background: '#1e8449' }}>
          300px
          <br />
          {f(snap?.green)}px
        </div>
      </div>

      {/* 填充内容:让页面足够长可滚动 */}
      <div style={{ padding: 12 }}>
        {Array.from({ length: 60 }).map((_, i) => (
          <p key={i} style={{ margin: '0 0 16px', color: '#889', fontSize: 14 }}>
            填充行 {i + 1} —— 上下滑动以触发地址栏伸缩,观察顶部数值变化。中美房地产商会视口测量占位文本。
          </p>
        ))}
      </div>
    </main>
  );
}
