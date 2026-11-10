import type { CardTemplate } from '../types';

/** 76 · 金角尊贵：米白底，四个角上金色的直角花边，内容居中，协会领导、会所常用 */
const t: CardTemplate = {
  id: 76,
  name: '金角尊贵',
  desc: '米白底，四个角上金色的直角花边，内容居中，协会领导、会所常用',
  cat: '商务经典',
  batch: 1,
  cls: 'b10',
  css: `
.b10{background:#FBF7EC;--c:#2A2115;--a:#B08A3C;--s:#55483A}
.b10 .cr{inset:2.4cqw;background:linear-gradient(#B08A3C,#B08A3C) 0 0/9cqw .5cqw no-repeat,linear-gradient(#B08A3C,#B08A3C) 0 0/.5cqw 9cqw no-repeat,linear-gradient(#B08A3C,#B08A3C) 100% 0/9cqw .5cqw no-repeat,linear-gradient(#B08A3C,#B08A3C) 100% 0/.5cqw 9cqw no-repeat,linear-gradient(#B08A3C,#B08A3C) 0 100%/9cqw .5cqw no-repeat,linear-gradient(#B08A3C,#B08A3C) 0 100%/.5cqw 9cqw no-repeat,linear-gradient(#B08A3C,#B08A3C) 100% 100%/9cqw .5cqw no-repeat,linear-gradient(#B08A3C,#B08A3C) 100% 100%/.5cqw 9cqw no-repeat;outline:1px solid rgba(176,138,60,.4);outline-offset:-1.6cqw}
.b10 .in{padding:7.4cqw 8cqw}
.b10 .lg{text-align:left}
.b10 .n2 b{font-family:var(--serif)}
.b10 .qr{background:transparent;mix-blend-mode:multiply}
/* 没填公司时顶部一行留出原来 logo 行的高度，下面的姓名不往上跑 */
.b10 .top{min-height:7.6cqw}
`,
  html: `<div class="deco cr"></div><div class="in ctr"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}</div><div class="sp"></div><p class="n2" style="justify-content:center"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="rule"></div><div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
