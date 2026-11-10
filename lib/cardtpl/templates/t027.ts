import type { CardTemplate } from '../types';

/** 27 · 大理石金边：白色大理石纹 + 金色细框，精品酒店的质感 */
const t: CardTemplate = {
  id: 27,
  name: '大理石金边',
  desc: '白色大理石纹 + 金色细框，精品酒店的质感',
  cat: '第一批',
  batch: 2,
  cls: 'k5',
  css: `
.k5{background:linear-gradient(115deg,transparent 47.6%,rgba(120,120,130,.28) 48%,transparent 48.8%),linear-gradient(100deg,transparent 28%,rgba(120,120,130,.16) 28.3%,transparent 29%),linear-gradient(140deg,transparent 70%,rgba(170,150,110,.3) 70.4%,transparent 71.4%),linear-gradient(75deg,transparent 60%,rgba(120,120,130,.14) 60.3%,transparent 61%),radial-gradient(at 20% 30%,#FFFFFF,#ECE8E2);--c:#1D1D1F;--a:#B08A3C;--s:#55524D}
.k5 .fr{inset:2.4cqw;border:.5cqw solid transparent;border-image:linear-gradient(135deg,#9A7632,#F1DDA6,#9A7632) 1}
`,
  html: `<div class="deco fr"></div><div class="in ctr"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="rule"></div><div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
