import type { CardTemplate } from '../types';

/** 62 · 波西米亚拱门：陶土、芥末黄、鼠尾草绿叠成的几道拱门，一轮暖色的太阳，生活方式品牌最爱 */
const t: CardTemplate = {
  id: 62,
  name: '波西米亚拱门',
  desc: '陶土、芥末黄、鼠尾草绿叠成的几道拱门，一轮暖色的太阳，生活方式品牌最爱',
  cat: '设计经典',
  batch: 2,
  cls: 'c18',
  css: `
.c18{background:#F3E8D8;--c:#4A2E1E;--a:#B5552B;--s:#6B4A38}
.c18 .ar{right:8cqw;bottom:-1cqw;border-radius:50cqw 50cqw 0 0}
.c18 .a1{width:34cqw;height:38cqw;background:#C4673F}
.c18 .a2{width:25cqw;height:29cqw;right:12.5cqw;background:#E1A95F}
.c18 .a3{width:16cqw;height:20cqw;right:17cqw;background:#9CAF88}
.c18 .su{right:44cqw;top:9cqw;width:10cqw;height:10cqw;border-radius:50%;background:#E1A95F}
.c18 .cn{font-family:var(--serif)!important;font-weight:600}
.c18 .tier{display:none}
.c18 .qr{position:relative;z-index:3;border-radius:50%;padding:2.6cqw;width:17cqw;height:17cqw;margin-right:2.4cqw}
`,
  html: `<div class="deco ar a1"></div><div class="deco ar a2"></div><div class="deco ar a3"></div><div class="deco su"></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
