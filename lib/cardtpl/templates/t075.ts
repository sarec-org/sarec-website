import type { CardTemplate } from '../types';

/** 75 · 顶部色带：顶上一条青绿色带放公司名，下面白底排姓名和联系方式，清楚利落 */
const t: CardTemplate = {
  id: 75,
  name: '顶部色带',
  desc: '顶上一条青绿色带放公司名，下面白底排姓名和联系方式，清楚利落',
  cat: '商务经典',
  batch: 1,
  cls: 'b9',
  css: `
.b9{background:#fff;--c:#113B3A;--a:#00796B;--s:#3F5E5C}
.b9 .tb{left:0;right:0;top:0;height:16cqw;background:linear-gradient(90deg,#00695C,#00897B)}
.b9 .lg b{color:#fff}
.b9 .lg span{color:#D5F0EC}
.b9 .lg i{background:#fff;color:#00796B}
.b9 .tier{background:#fff;color:#00796B;border-color:#fff}
.b9 .in{padding-top:4cqw}
.b9 .qr{border:1px solid #D5E5E3}
`,
  html: `<div class="deco tb"></div><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp" style="flex:0 0 7cqw!important"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
