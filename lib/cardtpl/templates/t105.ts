import type { CardTemplate } from '../types';

/** 105 · 湖蓝礼盒：一整张清透的湖蓝色，白色细框，黑色衬线小字，像珠宝店的礼盒卡 */
const t: CardTemplate = {
  id: 105,
  name: '湖蓝礼盒',
  desc: '一整张清透的湖蓝色，白色细框，黑色衬线小字，像珠宝店的礼盒卡',
  cat: '商务精选',
  batch: 1,
  cls: 'd16',
  css: `
.d16{background:#7FD3CB;--c:#10302E;--a:#10302E;--s:#1F4A47;--ic:#7FD3CB}
.d16 .fr{inset:2.4cqw;border:.4cqw solid #fff}
.d16 .in{padding:7.4cqw 8cqw}
.d16 .n2 b{font-family:var(--serif);font-weight:600;letter-spacing:.3em}
.d16 .n2 span{color:#10302E}
.d16 .lg{text-align:left}
.d16 .lg i{background:#fff;color:#10302E}
.d16 .rule{background:#fff!important}
`,
  html: `<div class="deco fr"></div><div class="in ctr"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}</div><div class="sp"></div><p class="n2" style="justify-content:center"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="rule"></div><div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
