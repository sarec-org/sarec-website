import type { CardTemplate } from '../types';

/** 37 · 毛玻璃：柔和彩色光斑上一块磨砂玻璃，苹果味的清爽 */
const t: CardTemplate = {
  id: 37,
  name: '毛玻璃',
  desc: '柔和彩色光斑上一块磨砂玻璃，苹果味的清爽',
  cat: '第一批',
  batch: 2,
  cls: 'k15',
  css: `
.k15{background:#EEF2FB;--c:#1B2340;--a:#5B5BFF;--s:#47506B}
.k15 .b1{left:-10cqw;top:-14cqw;width:50cqw;height:50cqw;border-radius:50%;background:#FF9EC4;filter:blur(4cqw)}
.k15 .b2{right:-8cqw;top:6cqw;width:46cqw;height:46cqw;border-radius:50%;background:#8FB8FF;filter:blur(4cqw)}
.k15 .b3{left:30cqw;bottom:-22cqw;width:44cqw;height:44cqw;border-radius:50%;background:#FFE08A;filter:blur(4cqw)}
.k15 .gl{inset:3cqw;border-radius:3cqw;background:rgba(255,255,255,.5);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.8)}
.k15 .in{padding:7.4cqw 8cqw}
.k15 .cn{font-family:var(--sans)!important;font-weight:900}
.k15 .tier{background:#1B2340;color:#fff;border-color:#1B2340}
.k15 .qr{border-radius:2cqw}
`,
  html: `<div class="deco b1"></div><div class="deco b2"></div><div class="deco b3"></div><div class="deco gl"></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
