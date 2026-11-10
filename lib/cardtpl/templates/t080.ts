import type { CardTemplate } from '../types';

/** 80 · 蓝色折角：白底，右上角两条蓝色平行斜带像折过来的绶带，简洁有动感 */
const t: CardTemplate = {
  id: 80,
  name: '蓝色折角',
  desc: '白底，右上角两条蓝色平行斜带像折过来的绶带，简洁有动感',
  cat: '商务经典',
  batch: 1,
  cls: 'b14',
  css: `
.b14{background:#fff;--c:#102A4C;--a:#1976D2;--s:#3F5676}
.b14 .f1{inset:0;background:#1976D2;clip-path:polygon(62% 0,76% 0,100% 52%,100% 82%)}
.b14 .f2{inset:0;background:#0D47A1;clip-path:polygon(80% 0,90% 0,100% 22%,100% 44%)}
.b14 .f3{left:0;bottom:0;width:30cqw;height:1.2cqw;background:#1976D2}
.b14 .tier{background:#fff;color:#0D47A1;border-color:#fff;position:relative;z-index:3;margin-right:-2cqw}
.b14 .qr{border:1px solid #D5DBE6}
/* 没填公司时顶部一行留出原来 logo 行的高度，下面的姓名不往上跑 */
.b14 .top{min-height:7.6cqw}
`,
  html: `<div class="deco f1"></div><div class="deco f2"></div><div class="deco f3"></div><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
