import type { CardTemplate } from '../types';

/** 69 · 黑金几何：黑底，两个角上金色的几何线条和三角块，高端会所、金融公司常用 */
const t: CardTemplate = {
  id: 69,
  name: '黑金几何',
  desc: '黑底，两个角上金色的几何线条和三角块，高端会所、金融公司常用',
  cat: '商务经典',
  batch: 1,
  cls: 'b3',
  css: `
.b3{background:radial-gradient(at 40% 30%,#1C1C20,#09090B);--c:#fff;--a:#D9B46A;--s:#D6CFBD;--ic:#111;--lgc:#111}
.b3 .gz{inset:0;width:100%;height:100%}
.b3 .in{padding-left:9cqw}
.b3 .n2 b{background:linear-gradient(180deg,#F6E2A6,#C39A4A);-webkit-background-clip:text;background-clip:text;color:transparent}
.b3 .tier{margin-right:16cqw;background:#0E0E10}
`,
  html: `<svg class="deco gz" viewBox="0 0 170 100" preserveAspectRatio="none"><defs><linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6E2A6"/><stop offset=".5" stop-color="#C39A4A"/><stop offset="1" stop-color="#8D6B2B"/></linearGradient></defs><path d="M170 0V34L128 0Z" fill="url(#gd)"/><path d="M170 46L112 0M170 58L98 0" stroke="#C39A4A" stroke-width=".5" fill="none"/><path d="M0 100V72L34 100Z" fill="url(#gd)"/><path d="M0 60L50 100M0 50L62 100" stroke="#C39A4A" stroke-width=".5" fill="none"/></svg><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
