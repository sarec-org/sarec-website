import type { CardTemplate } from '../types';

/** 35 · 祖母绿扇纹：深绿底、四角金色扇形纹，老上海装饰风 */
const t: CardTemplate = {
  id: 35,
  name: '祖母绿扇纹',
  desc: '深绿底、四角金色扇形纹，老上海装饰风',
  cat: '第一批',
  batch: 2,
  cls: 'k13',
  css: `
.k13{background:radial-gradient(at 50% 40%,#12523F,#08271E);--c:#F3E7C4;--a:#E3C57A;--s:#CFC6A6}
.k13 .f{width:44cqw;height:44cqw;border-radius:50%;background:repeating-conic-gradient(rgba(227,197,122,.5) 0 2deg,transparent 2deg 8deg);-webkit-mask:radial-gradient(circle,transparent 0 30%,#000 31% 69%,transparent 70%);mask:radial-gradient(circle,transparent 0 30%,#000 31% 69%,transparent 70%)}
.k13 .f1{left:-22cqw;top:-22cqw}
.k13 .f2{right:-22cqw;bottom:-22cqw}
.k13 .fr{inset:2.4cqw;border:1px solid rgba(227,197,122,.8)}
.k13 .cn{color:#F6E2A6}
`,
  html: `<div class="deco f f1"></div><div class="deco f f2"></div><div class="deco fr"></div><div class="in ctr"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="rule"></div><div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
