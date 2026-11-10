import type { CardTemplate } from '../types';

/** 101 · 联系方式胶囊：每种联系方式做成一粒圆角胶囊，像手机应用里的按钮，电子名片的现代样子 */
const t: CardTemplate = {
  id: 101,
  name: '联系方式胶囊',
  desc: '每种联系方式做成一粒圆角胶囊，像手机应用里的按钮，电子名片的现代样子',
  cat: '商务精选',
  batch: 1,
  cls: 'd12',
  css: `
.d12{background:linear-gradient(160deg,#F4F6FB,#E9EEF8);--c:#18213A;--a:#4F6BFF;--s:#34405E}
.d12 .ic2{gap:1.3cqw 1.4cqw}
.d12 .ic2 div{background:#fff;border-radius:99px;padding:.7cqw 2.2cqw .7cqw .8cqw;box-shadow:0 .4cqw 1cqw rgba(40,60,120,.12)}
.d12 .ic2 div:nth-child(2) i{background:#16B364}
.d12 .ic2 div:nth-child(3) i{background:#FF7A1A}
.d12 .ic2 div:nth-child(4) i{background:#9B5DE5}
.d12 .ic2 div:nth-child(5) i{background:#E6456E}
.d12 .tier{background:#18213A;color:#fff;border-color:#18213A}
.d12 .qr{border-radius:2.4cqw;box-shadow:0 .6cqw 1.6cqw rgba(40,60,120,.18)}
`,
  html: `<div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
