import type { CardTemplate } from '../types';

/** 78 · 清新绿叶：白底，右上角两片绿叶形状，环保、健康、农业类公司常用 */
const t: CardTemplate = {
  id: 78,
  name: '清新绿叶',
  desc: '白底，右上角两片绿叶形状，环保、健康、农业类公司常用',
  cat: '商务经典',
  batch: 1,
  cls: 'b12',
  css: `
.b12{background:#fff;--c:#1E3B2A;--a:#2E9E5B;--s:#48614F}
.b12 .l1{right:-4cqw;top:-10cqw;width:34cqw;height:34cqw;background:#2E9E5B;border-radius:0 100% 0 100%;transform:rotate(8deg)}
.b12 .l2{right:18cqw;top:-14cqw;width:24cqw;height:24cqw;background:#8BC34A;border-radius:0 100% 0 100%;transform:rotate(-20deg);opacity:.85}
.b12 .tier{background:#fff;color:#2E9E5B;border-color:#fff;position:relative;z-index:3}
.b12 .qr{border:1px solid #D7E6DB}
/* 没填公司时顶部一行留出原来 logo 行的高度，下面的姓名不往上跑 */
.b12 .top{min-height:7.6cqw}
`,
  html: `<div class="deco l1"></div><div class="deco l2"></div><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
