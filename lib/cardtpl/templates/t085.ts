import type { CardTemplate } from '../types';

/** 85 · 竖线双栏：纯白，左边姓名职务，中间一条细竖线，右边联系方式，最朴素也最耐看 */
const t: CardTemplate = {
  id: 85,
  name: '竖线双栏',
  desc: '纯白，左边姓名职务，中间一条细竖线，右边联系方式，最朴素也最耐看',
  cat: '商务经典',
  batch: 1,
  cls: 'b19',
  css: `
.b19{background:#fff;--c:#1A1A1A;--a:#C8102E;--s:#444}
.b19 .two{display:flex;align-items:center;gap:5cqw}
.b19 .vl{width:1px;align-self:stretch;background:#C9C9C9}
.b19 .slg{font-size:2cqw;letter-spacing:.14em;color:#888}
.b19 .qr{width:11cqw;height:11cqw;border:1px solid #ddd}
.b19 .ic2{gap:1.1cqw}
.b19 .tier{color:#C8102E;border-color:#C8102E}
/* 没填公司时顶部一行留出原来 logo 行的高度，下面的姓名不往上跑 */
.b19 .top{min-height:7.6cqw}
`,
  html: `<div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><div class="two"><div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}</div><div class="vl"></div>{{#hasIc}}<div class="ic2 one">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}</div><div class="sp"></div><div class="bot"><span></span><div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
