import type { CardTemplate } from '../types';

/** 91 · 白金留白：纯白卡、烫金徽标、一条金线，其余大片留白，越简单越显贵 */
const t: CardTemplate = {
  id: 91,
  name: '白金留白',
  desc: '纯白卡、烫金徽标、一条金线，其余大片留白，越简单越显贵',
  cat: '商务精选',
  batch: 1,
  cls: 'd2',
  css: `
.d2{background:#FFFFFF;--c:#1D1D1F;--a:#B08A3C;--s:#55524D}
.d2 .gl{left:6.5cqw;right:6.5cqw;top:17.4cqw;height:1px;background:linear-gradient(90deg,#9A7632,#F1DDA6 50%,#9A7632)}
.d2 .lg i{background:radial-gradient(circle at 35% 30%,#F8E6B0,#C39A4A 60%,#8D6B2B);color:#3A2B08}
.d2 .n2 b{font-family:var(--serif);font-weight:600;letter-spacing:.2em}
.d2 .ic2 i{background:transparent;color:#B08A3C;box-shadow:inset 0 0 0 1px #B08A3C}
.d2 .qr{border:1px solid #E7DFCB}
/* 没填公司时顶部一行留出原来 logo 行的高度，下面的姓名不往上跑 */
.d2 .top{min-height:7.6cqw}
`,
  html: `<div class="deco gl"></div><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
