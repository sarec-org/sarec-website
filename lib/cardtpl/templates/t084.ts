import type { CardTemplate } from '../types';

/** 84 · 拉丝银：银色拉丝金属底，蓝色的字和线，制造、五金、汽车行业常用 */
const t: CardTemplate = {
  id: 84,
  name: '拉丝银',
  desc: '银色拉丝金属底，蓝色的字和线，制造、五金、汽车行业常用',
  cat: '商务经典',
  batch: 1,
  cls: 'b18',
  css: `
.b18{background:linear-gradient(100deg,#C9CED6 0%,#F3F5F8 22%,#B9BFC9 45%,#EEF1F5 68%,#C2C8D1 100%);--c:#12264A;--a:#0B4DA2;--s:#2F4263}
.b18 .br{inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.18) 0 .1cqw,rgba(0,0,0,.03) .1cqw .22cqw)}
.b18 .bl{left:0;top:17.6cqw;width:46cqw;height:.6cqw;background:#0B4DA2}
.b18 .tier{background:#0B4DA2;color:#fff;border-color:#0B4DA2}
/* 没填公司时顶部一行留出原来 logo 行的高度，下面的姓名不往上跑 */
.b18 .top{min-height:7.6cqw}
`,
  html: `<div class="deco br"></div><div class="deco bl"></div><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
