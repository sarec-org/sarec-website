import type { CardTemplate } from '../types';

/** 94 · 墨绿金线：墨绿底、金色衬线字、上下两道金线，律所、基金、家族办公室的风格 */
const t: CardTemplate = {
  id: 94,
  name: '墨绿金线',
  desc: '墨绿底、金色衬线字、上下两道金线，律所、基金、家族办公室的风格',
  cat: '商务精选',
  batch: 1,
  cls: 'd5',
  css: `
.d5{background:radial-gradient(at 30% 20%,#17463A,#0A2620);--c:#F3E7C4;--a:#D9B46A;--s:#D2CBAE;--ic:#0A2620;--lgc:#0A2620}
.d5 .l1{left:0;right:0;top:2.2cqw;height:1px;background:#D9B46A;box-shadow:0 .8cqw 0 rgba(217,180,106,.5)}
.d5 .l2{left:0;right:0;bottom:2.2cqw;height:1px;background:#D9B46A;box-shadow:0 -.8cqw 0 rgba(217,180,106,.5)}
.d5 .two{display:flex;align-items:center;gap:5cqw}
.d5 .vl{width:1px;align-self:stretch;background:rgba(217,180,106,.7)}
.d5 .n2 b{font-family:var(--serif);color:#F6E2A6}
.d5 .slg{font-size:2cqw;letter-spacing:.14em;color:#A9B8A8}
.d5 .qr{width:11cqw;height:11cqw}
.d5 .ic2{gap:1.1cqw}
.d5 .tier{color:#D9B46A;border-color:#D9B46A}
/* 没填公司时顶部一行留出原来 logo 行的高度，下面的姓名不往上跑 */
.d5 .top{min-height:7.6cqw}
`,
  html: `<div class="deco l1"></div><div class="deco l2"></div><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><div class="two"><div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}</div><div class="vl"></div>{{#hasIc}}<div class="ic2 one">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}</div><div class="sp"></div><div class="bot"><span></span><div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
