import type { CardTemplate } from '../types';

/** 90 · 藏蓝金框：藏蓝底、一圈金色细框、四角小方钉，内容居中，稳重的董事长款 */
const t: CardTemplate = {
  id: 90,
  name: '藏蓝金框',
  desc: '藏蓝底、一圈金色细框、四角小方钉，内容居中，稳重的董事长款',
  cat: '商务精选',
  batch: 1,
  cls: 'd1',
  css: `
.d1{background:radial-gradient(at 50% 30%,#14306A,#081633);--c:#fff;--a:#D9B46A;--s:#CDD7EC;--ic:#081633;--lgc:#081633}
.d1 .fr{inset:2.4cqw;border:1px solid #D9B46A}
.d1 .pn{inset:1.9cqw;background:linear-gradient(#D9B46A,#D9B46A) 0 0/1.2cqw 1.2cqw no-repeat,linear-gradient(#D9B46A,#D9B46A) 100% 0/1.2cqw 1.2cqw no-repeat,linear-gradient(#D9B46A,#D9B46A) 0 100%/1.2cqw 1.2cqw no-repeat,linear-gradient(#D9B46A,#D9B46A) 100% 100%/1.2cqw 1.2cqw no-repeat}
.d1 .in{padding:7.4cqw 8cqw}
.d1 .n2 b{font-family:var(--serif);color:#F6E2A6}
.d1 .lg{text-align:left}
/* 没填公司时顶部一行留出原来 logo 行的高度，下面的姓名不往上跑 */
.d1 .top{min-height:7.6cqw}
`,
  html: `<div class="deco fr"></div><div class="deco pn"></div><div class="in ctr"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}</div><div class="sp"></div><p class="n2" style="justify-content:center"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="rule"></div><div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
