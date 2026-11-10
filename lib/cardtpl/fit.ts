/**
 * 出图前在页面里跑的自检（纯 JS 字符串，避免打包工具改写）：
 * 文字超出卡面、两段文字压在一起、文字压住二维码、二维码被挤出卡面 → 把那一块（以及同一行挤在一起的块）的字号缩 7%，重排再查；
 * 缩到七成仍放不下就允许这一块换行，再继续缩，最多缩到约 55%。
 * 返回 { ok, shrunk: 缩过的块, overflow: 仍有问题的块 }。
 */
export const FIT_JS = String.raw`(() => {
  const card = document.querySelector('.card');
  // 姓名、等级徽标不换行，只缩字
  const KEEP = '.n2,.cn,.nn,.n1,.tier,.lg,.nm,.big';
  const GROUP = '.ic2,.ct,.ls3,.lg,.fl,.rc,.lib,.tm,.hf,[data-fit-group]';
  const hasText = (e) => Array.from(e.childNodes).some((n) => n.nodeType === 3 && (n.textContent || '').trim());
  const textRect = (e) => { const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect(); };
  const hit = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
  const press = (a, b) => {
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return w > Math.min(a.width, b.width) * 0.3 && h > Math.min(a.height, b.height) * 0.3;
  };
  const label = (e) => (typeof e.className === 'string' && e.className ? e.className : e.tagName.toLowerCase()) + ':' + (e.textContent || '').trim().slice(0, 16);
  const zoomOf = (e) => Number(e.style.getPropertyValue('zoom') || 1);
  const shrunk = new Set();
  const find = () => {
    const C = card.getBoundingClientRect();
    const mx = C.width * 0.02;
    const texts = Array.from(card.querySelectorAll('.in *, [data-fit] *, [data-fit]')).filter(
      (e) => hasText(e) && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('.own-guide')
    );
    const boxes = texts.map((e) => ({ e, r: e.matches('.tier') ? e.getBoundingClientRect() : textRect(e) })).filter((b) => b.r.width > 0);
    const qr = card.querySelector('.qr');
    const bad = new Set();
    if (qr) {
      const q = qr.getBoundingClientRect();
      if (q.right > C.right - mx * 0.5 || q.bottom > C.bottom - mx * 0.25 || q.left < C.left || q.top < C.top) bad.add(qr);
    }
    for (const b of boxes) {
      if (b.r.left < C.left + mx || b.r.right > C.right - mx || b.r.top < C.top + mx * 0.5 || b.r.bottom > C.bottom - mx * 0.5) bad.add(b.e);
      if (qr && !qr.contains(b.e) && hit(b.r, qr.getBoundingClientRect())) bad.add(b.e);
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
        if (press(a.r, b.r)) { bad.add(a.e); bad.add(b.e); }
      }
    return Array.from(bad);
  };
  const rowOf = (e) => {
    const p = e.parentElement;
    if (!p || p === card) return null;
    const cs = getComputedStyle(p);
    return cs.display.indexOf('flex') >= 0 && cs.flexDirection.indexOf('column') < 0 ? p : null;
  };
  for (let round = 0; round < 20; round++) {
    const bad = find();
    if (!bad.length) return { ok: true, shrunk: Array.from(shrunk), overflow: [] };
    const targets = new Set();
    bad.forEach((e) => {
      const isQr = e.classList && e.classList.contains('qr');
      const g = isQr ? null : e.closest(GROUP) || e;
      if (g) targets.add(g);
      const base = g || e;
      const row = rowOf(base);
      if (row) Array.from(row.children).forEach((k) => { if (k !== base && !k.classList.contains('qr') && (k.textContent || '').trim()) targets.add(k); });
    });
    let moved = false;
    targets.forEach((t) => {
      const z = zoomOf(t);
      // 缩到七成还放不下：先允许这一块换行（长英文名、长邮箱），再继续缩
      if (z <= 0.72 && !t.dataset.wrapped && !t.matches(KEEP)) {
        t.dataset.wrapped = '1';
        [t].concat(Array.from(t.querySelectorAll('*'))).filter((k) => !k.matches(KEEP) && !k.closest(KEEP)).forEach((k) => { k.style.whiteSpace = 'normal'; k.style.overflowWrap = 'anywhere'; k.style.minWidth = '0'; });
        shrunk.add(label(t) + '(换行)');
        moved = true;
      } else if (z > 0.56) { t.style.setProperty('zoom', String(Math.round(z * 0.93 * 1000) / 1000)); shrunk.add(label(t)); moved = true; }
    });
    if (!moved) break;
  }
  const left = find();
  return { ok: left.length === 0, shrunk: Array.from(shrunk), overflow: left.map(label) };
})()`;
