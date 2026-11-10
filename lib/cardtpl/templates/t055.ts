import type { CardTemplate } from '../types';

/** 55 · 地铁线路图：把联系方式画成一张地铁线路图，每一站是一种联系方式 */
const t: CardTemplate = {
  id: 55,
  name: '地铁线路图',
  desc: '把联系方式画成一张地铁线路图，每一站是一种联系方式',
  cat: '设计经典',
  batch: 2,
  cls: 'c11',
  css: `
.c11{background:#FFFFFF;--c:#111;--a:#E4002B;--s:#333}
.c11 .mp{inset:0;width:100%;height:100%}
.c11 .rdl{width:5.4cqw;height:5.4cqw;border-radius:50%;border:1.1cqw solid #E4002B;display:grid;place-items:center;font-weight:900;font-size:2.6cqw;color:#0A1F5C;letter-spacing:0}
.c11 .top{align-items:flex-start}
.c11 .org{color:#111;font-weight:700;padding-top:1.6cqw}
.c11 .cn{font-family:var(--sans)!important;font-weight:900;font-size:8cqw;letter-spacing:.1em}
.c11 .ti .en{font-family:var(--sans);color:#111}
.c11 .qr{width:13cqw;height:13cqw;border:1px solid #ddd}
`,
  html: `<svg class="deco mp" viewBox="0 0 170 100"><g fill="none" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M-5 66H56L70 52H175" stroke="#E4002B"/><path d="M-5 80H40L54 94H175" stroke="#0A66C2"/><path d="M34 105V74L22 62V52" stroke="#00A651"/></g><g fill="#fff" stroke="#111" stroke-width="1.1"><circle cx="46" cy="66" r="2.6"/><circle cx="104" cy="52" r="2.6"/><circle cx="34" cy="80" r="3.4"/><circle cx="96" cy="94" r="2.6"/></g><g font-family="Noto Sans SC,Arial,sans-serif" font-size="3.7" fill="#111"><text x="40" y="74" font-weight="700">电话</text><text x="50" y="74">949 787 8888</text><text x="98" y="46" font-weight="700">邮箱</text><text x="108" y="46">info@sinoamericanrec.org</text><text x="90" y="88" font-weight="700">微信</text><text x="100" y="88">逍遥</text></g></svg><div class="in"><div class="top"><span class="rdl">S</span><span class="org" style="margin-right:auto;margin-left:2cqw">SAREC 中美房地产商会</span><div class="qr">{{{qrImg}}}</div></div><p class="cn" style="margin-top:-4cqw!important">王东</p><p class="ti"><span class="en">Andy Wang</span>创始人 · 副会长</p></div>`
};
export default t;
