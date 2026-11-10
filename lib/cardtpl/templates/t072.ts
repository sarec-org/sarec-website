import type { CardTemplate } from '../types';

/** 72 · 科技蓝六边形：蓝色渐变底铺一层蜂窝六边形，互联网和科技公司最常见 */
const t: CardTemplate = {
  id: 72,
  name: '科技蓝六边形',
  desc: '蓝色渐变底铺一层蜂窝六边形，互联网和科技公司最常见',
  cat: '商务经典',
  batch: 1,
  cls: 'b6',
  css: `
.b6{background:linear-gradient(135deg,#0A3D91 0%,#0C6BC4 55%,#0FA3D6 100%);--c:#fff;--a:#fff;--s:#E3F3FF;--ic:#0A3D91;--lgc:#0A3D91}
.b6 .hx{inset:0;width:100%;height:100%;opacity:.14;-webkit-mask:linear-gradient(110deg,transparent 20%,#000 80%);mask:linear-gradient(110deg,transparent 20%,#000 80%)}
.b6 .n2 span{color:#7FE3FF}
.b6 .tier{background:rgba(255,255,255,.2);border-color:transparent}
/* 没填公司时顶部一行留出原来 logo 行的高度，下面的姓名不往上跑 */
.b6 .top{min-height:7.6cqw}
`,
  html: `<svg class="deco hx"><defs><pattern id="hxp" width="28" height="48.5" patternUnits="userSpaceOnUse" patternTransform="scale(.62)"><path d="M14 0L28 8.08V24.25L14 32.33L0 24.25V8.08ZM14 32.33V48.5M0 24.25L-14 32.33M28 24.25L42 32.33M0 8.08V-8M28 8.08V-8" fill="none" stroke="#fff" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#hxp)"/></svg><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
