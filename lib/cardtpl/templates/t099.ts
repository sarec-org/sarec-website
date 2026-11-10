import type { CardTemplate } from '../types';

/** 99 · 蓝点渐隐：白底，右上角一片由密到疏的蓝色网点，轻快的科技和咨询公司风 */
const t: CardTemplate = {
  id: 99,
  name: '蓝点渐隐',
  desc: '白底，右上角一片由密到疏的蓝色网点，轻快的科技和咨询公司风',
  cat: '商务精选',
  batch: 1,
  cls: 'd10',
  css: `
.d10{background:#fff;--c:#0E2A5C;--a:#1E63E9;--s:#3B4F78}
.d10 .dt{inset:0;background:radial-gradient(#1E63E9 32%,transparent 34%) 0 0/2.6cqw 2.6cqw;-webkit-mask:radial-gradient(circle at 100% 0,#000 0,rgba(0,0,0,.5) 25%,transparent 52%);mask:radial-gradient(circle at 100% 0,#000 0,rgba(0,0,0,.5) 25%,transparent 52%)}
.d10 .bar{left:0;top:22cqw;width:1.6cqw;height:13cqw;background:#1E63E9}
.d10 .tier{background:#fff;color:#1E63E9;border-color:#1E63E9;position:relative;z-index:3}
.d10 .qr{border:1px solid #D5DBE6}
/* 没填公司时顶部一行留出原来 logo 行的高度，下面的姓名不往上跑 */
.d10 .top{min-height:7.6cqw}
`,
  html: `<div class="deco dt"></div><div class="deco bar"></div><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
