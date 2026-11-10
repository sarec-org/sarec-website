import type { CardTemplate } from '../types';

/** 79 · 橙灰锐角：深灰底，两个橙色的锐角色块，建筑、工程、设计公司的硬朗风 */
const t: CardTemplate = {
  id: 79,
  name: '橙灰锐角',
  desc: '深灰底，两个橙色的锐角色块，建筑、工程、设计公司的硬朗风',
  cat: '商务经典',
  batch: 1,
  cls: 'b13',
  css: `
.b13{background:#2B3035;--c:#fff;--a:#FF7A1A;--s:#D5D9DE}
.b13 .t1{inset:0;background:#FF7A1A;clip-path:polygon(78% 0,100% 0,100% 44%)}
.b13 .t2{inset:0;background:#C95A08;clip-path:polygon(70% 0,78% 0,100% 44%,100% 60%)}
.b13 .t3{inset:0;background:#FF7A1A;clip-path:polygon(0 78%,0 100%,16% 100%)}
.b13 .tier{background:#fff;color:#C95A08;border-color:#fff}
`,
  html: `<div class="deco t1"></div><div class="deco t2"></div><div class="deco t3"></div><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
