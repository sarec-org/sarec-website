import type { CardTemplate } from '../types';

/** 32 · 孟菲斯：奶油底上跳动的圆、三角和波浪，最活泼 */
const t: CardTemplate = {
  id: 32,
  name: '孟菲斯',
  desc: '奶油底上跳动的圆、三角和波浪，最活泼',
  cat: '第一批',
  batch: 2,
  cls: 'k10',
  css: `
.k10{background:#FFF4E0;--c:#111;--a:#E6456E;--s:#333}
.k10 .c1{right:10cqw;top:-8cqw;width:28cqw;height:28cqw;border-radius:50%;background:#19B5A5}
.k10 .c2{right:-6cqw;top:14cqw;width:22cqw;height:22cqw;background:#FF7AA2;border-radius:50% 0 50% 50%}
.k10 .c3{right:34cqw;top:16cqw;width:0;height:0;border-left:7cqw solid transparent;border-right:7cqw solid transparent;border-bottom:12cqw solid #FFC531;transform:rotate(18deg)}
.k10 .dots{left:44cqw;bottom:4cqw;width:22cqw;height:14cqw;background:radial-gradient(#111 28%,transparent 30%) 0 0/2.4cqw 2.4cqw;opacity:.5}
.k10 .sq{right:25cqw;top:39cqw;width:18cqw;height:4.5cqw}
.k10 .cn,.k10 .org{font-family:var(--sans)!important;font-weight:900}
.k10 .tier{background:#111;color:#FFF4E0;border-color:#111}
.k10 .qr{border:.5cqw solid #111;border-radius:0}
`,
  html: `<div class="deco c1"></div><div class="deco c2"></div><div class="deco c3"></div><div class="deco dots"></div><svg class="deco sq" viewBox="0 0 40 10"><path d="M1 5q4-8 8 0t8 0 8 0 8 0 6 0" fill="none" stroke="#111" stroke-width="1.4" stroke-linecap="round"/></svg><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
