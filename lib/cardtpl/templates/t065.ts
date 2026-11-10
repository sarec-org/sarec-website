import type { CardTemplate } from '../types';

/** 65 · 粗野大字：灰底上一行撑破卡片的黑色大字，加一块荧光绿，这几年独立设计师最爱用 */
const t: CardTemplate = {
  id: 65,
  name: '粗野大字',
  desc: '灰底上一行撑破卡片的黑色大字，加一块荧光绿，这几年独立设计师最爱用',
  cat: '设计经典',
  batch: 2,
  cls: 'c21',
  css: `
.c21{background:#E9E9E6;--c:#111;--a:#111;--s:#111}
.c21 .bw{left:-1cqw;top:7cqw;font-family:var(--num);font-weight:700;font-size:34cqw;line-height:.86;letter-spacing:-.02em;color:#111;white-space:nowrap}
.c21 .hg{left:0;top:26cqw;width:52cqw;height:6cqw;background:#C6FF00;z-index:2;mix-blend-mode:multiply}
.c21 .cn{font-family:var(--sans)!important;font-weight:900;font-size:6cqw;letter-spacing:.1em}
.c21 .mono{margin:1.4cqw 0 0;font-family:var(--mono);font-size:2.2cqw;line-height:1.55;white-space:nowrap}
.c21 .qr{border:.5cqw solid #111;border-radius:0}
`,
  html: `<div class="deco hg"></div><div class="deco bw">WANG</div><div class="in"><div class="top"><span class="org" style="color:#111;font-family:var(--mono)">SAREC / 中美房地产商会 / 副会长</span></div><div class="sp"></div><div class="bot"><div><p class="cn">{{name}}</p><p class="mono">创始人<br>949 787 8888 · 微信 逍遥<br>info@sinoamericanrec.org</p></div><div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
