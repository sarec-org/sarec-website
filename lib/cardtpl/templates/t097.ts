import type { CardTemplate } from '../types';

/** 97 · 红带海水纹：顶上一条压着金色海水纹的红带，下面白底，商会、协会、同乡会最合适 */
const t: CardTemplate = {
  id: 97,
  name: '红带海水纹',
  desc: '顶上一条压着金色海水纹的红带，下面白底，商会、协会、同乡会最合适',
  cat: '商务精选',
  batch: 1,
  cls: 'd8',
  css: `
.d8{background:#FFFEFA;--c:#1A1A1A;--a:#C8102E;--s:#444}
.d8 .rb{left:0;right:0;top:0;height:16cqw;background:linear-gradient(90deg,#A80E22,#D2172F)}
.d8 .wv{left:0;right:0;top:0;height:16cqw;background:radial-gradient(circle at 50% 100%,transparent 0 1.7cqw,rgba(255,215,130,.6) 1.8cqw 2.05cqw,transparent 2.15cqw 2.6cqw,rgba(255,215,130,.6) 2.7cqw 2.95cqw,transparent 3.05cqw) 0 0/6.2cqw 3.1cqw,radial-gradient(circle at 50% 100%,transparent 0 1.7cqw,rgba(255,215,130,.6) 1.8cqw 2.05cqw,transparent 2.15cqw 2.6cqw,rgba(255,215,130,.6) 2.7cqw 2.95cqw,transparent 3.05cqw) 3.1cqw 1.55cqw/6.2cqw 3.1cqw;-webkit-mask:linear-gradient(90deg,transparent 45%,#000 85%);mask:linear-gradient(90deg,transparent 45%,#000 85%)}
.d8 .gl{left:0;right:0;top:16cqw;height:.6cqw;background:linear-gradient(90deg,#C39A4A,#F6E2A6,#C39A4A)}
.d8 .in{padding-top:4cqw}
.d8 .lg b{color:#fff}
.d8 .lg span{color:#FBE2C8}
.d8 .lg i{background:#F4CF6B;color:#8E0F15}
.d8 .tier{background:#F4CF6B;color:#8E0F15;border-color:#F4CF6B}
.d8 .qr{border:1px solid #E6DCCB}
/* 没填公司时顶部一行留出原来 logo 行的高度，下面的姓名不往上跑 */
.d8 .top{min-height:7.6cqw}
`,
  html: `<div class="deco rb"></div><div class="deco wv"></div><div class="deco gl"></div><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp" style="flex:0 0 7cqw!important"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
