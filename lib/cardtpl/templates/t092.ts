import type { CardTemplate } from '../types';

/** 92 · 蓝底叠卡：蓝色渐变底上叠着一张白卡片，有层次有投影，现在企业官网常见的样子 */
const t: CardTemplate = {
  id: 92,
  name: '蓝底叠卡',
  desc: '蓝色渐变底上叠着一张白卡片，有层次有投影，现在企业官网常见的样子',
  cat: '商务精选',
  batch: 1,
  cls: 'd3',
  css: `
.d3{background:linear-gradient(135deg,#0D47A1,#1E88E5);--c:#0E2A5C;--a:#1565C0;--s:#3B4F78}
.d3 .sp1{inset:0;background:linear-gradient(120deg,transparent 55%,rgba(255,255,255,.14) 55% 70%,transparent 70%)}
.d3 .wc{left:3.4cqw;right:3.4cqw;top:15.4cqw;bottom:3.4cqw;background:#fff;border-radius:2cqw;box-shadow:0 1.4cqw 3.6cqw rgba(5,30,80,.35)}
.d3 .in{padding:4.4cqw 7cqw 6.4cqw}
.d3 .lg b{color:#fff}
.d3 .lg span{color:#D9E8FB}
.d3 .lg i{background:#fff;color:#1565C0}
.d3 .tier{background:rgba(255,255,255,.2);color:#fff;border-color:transparent}
.d3 .qr{border:1px solid #DCE4F0}
/* 没填公司时顶部一行留出原来 logo 行的高度，下面的姓名不往上跑 */
.d3 .top{min-height:7.6cqw}
`,
  html: `<div class="deco sp1"></div><div class="deco wc"></div><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp" style="flex:0 0 8.4cqw!important"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
