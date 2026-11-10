import type { CardTemplate } from '../types';

/** 87 · 紫金菱格：紫色渐变底，淡淡的菱形格纹，金色的字，美业、珠宝、高端服务常用 */
const t: CardTemplate = {
  id: 87,
  name: '紫金菱格',
  desc: '紫色渐变底，淡淡的菱形格纹，金色的字，美业、珠宝、高端服务常用',
  cat: '商务经典',
  batch: 1,
  cls: 'b21',
  css: `
.b21{background:linear-gradient(135deg,#2B1055 0%,#5A1E96 60%,#7B2FC4 100%);--c:#fff;--a:#F0D08A;--s:#E6D9F5;--ic:#2B1055;--lgc:#2B1055}
.b21 .dm{inset:0;background:repeating-linear-gradient(45deg,rgba(240,208,138,.14) 0 .2cqw,transparent .2cqw 4.4cqw),repeating-linear-gradient(-45deg,rgba(240,208,138,.14) 0 .2cqw,transparent .2cqw 4.4cqw);-webkit-mask:linear-gradient(100deg,transparent 30%,#000 90%);mask:linear-gradient(100deg,transparent 30%,#000 90%)}
.b21 .n2 b{color:#F6E2A6}
.b21 .tier{color:#F0D08A;border-color:#F0D08A}
`,
  html: `<div class="deco dm"></div><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
