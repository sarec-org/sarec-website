import type { CardTemplate } from '../types';

/** 86 · 蓝黄对角：白底，左上角蓝色、右下角黄色两个三角，活泼的企业配色 */
const t: CardTemplate = {
  id: 86,
  name: '蓝黄对角',
  desc: '白底，左上角蓝色、右下角黄色两个三角，活泼的企业配色',
  cat: '商务经典',
  batch: 1,
  cls: 'b20',
  css: `
.b20{background:#fff;--c:#0E2A5C;--a:#1E55C8;--s:#3B4F78}
.b20 .y1{inset:0;background:#1E55C8;clip-path:polygon(0 0,0 62%,5% 0)}
.b20 .y2{inset:0;background:#FFC21A;clip-path:polygon(100% 100%,100% 56%,72% 100%)}
.b20 .y3{inset:0;background:#1E55C8;clip-path:polygon(100% 100%,100% 76%,86% 100%)}
.b20 .tier{background:#FFC21A;color:#0E2A5C;border-color:#FFC21A}
.b20 .qr{position:relative;z-index:3;box-shadow:0 0 0 .6cqw #fff}
`,
  html: `<div class="deco y1"></div><div class="deco y2"></div><div class="deco y3"></div><div class="in" style="padding-left:9cqw"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
