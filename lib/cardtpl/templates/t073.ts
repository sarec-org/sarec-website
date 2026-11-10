import type { CardTemplate } from '../types';

/** 73 · 城市剪影：上半白底写名字，下半一条城市天际线压着深蓝底，地产公司的经典 */
const t: CardTemplate = {
  id: 73,
  name: '城市剪影',
  desc: '上半白底写名字，下半一条城市天际线压着深蓝底，地产公司的经典',
  cat: '商务经典',
  batch: 1,
  cls: 'b7',
  css: `
.b7{background:#fff;--c:#0F2347;--a:#C8922E;--s:#3D4D6E}
.b7 .bn{left:0;right:0;bottom:0;height:22cqw;background:#0F2347}
.b7 .sky{left:46%;bottom:21.8cqw;width:54%;height:12cqw;color:#0F2347}
.b7 .ic2{color:#E6ECF7}
.b7 .in{padding-bottom:4cqw}
.b7 .n2,.b7 .e2{position:relative;z-index:3}
.b7 .n2 b{text-shadow:0 0 1cqw #fff,0 0 2cqw #fff}
/* 没填公司时顶部一行留出原来 logo 行的高度，下面的姓名不往上跑 */
.b7 .top{min-height:7.6cqw}
`,
  html: `<div class="deco bn"></div><svg class="deco sky" viewBox="0 0 170 30" preserveAspectRatio="none"><path fill="currentColor" d="M0 29h8V20h5v9h4V14h6v15h3V18h7v11h4V9h3V5h2v4h3v20h5V16h8v13h4V21h6v8h5V11h7v18h4V17h6v12h5V7h2V3h2v4h2v22h6V19h7v10h4V13h8v16h5V22h6v7h5V15h6v14h8"/></svg><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
