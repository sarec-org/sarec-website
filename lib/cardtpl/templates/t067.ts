import type { CardTemplate } from '../types';

/** 67 · 蓝色弧线：白底，右下角两道蓝色大圆弧，公司徽标、姓名职务、带图标的联系方式一应俱全 */
const t: CardTemplate = {
  id: 67,
  name: '蓝色弧线',
  desc: '白底，右下角两道蓝色大圆弧，公司徽标、姓名职务、带图标的联系方式一应俱全',
  cat: '商务经典',
  batch: 1,
  cls: 'b1',
  css: `
.b1{background:#fff;--c:#0B2B5C;--a:#0B4DA2;--s:#3B4F73}
.b1 .a1{right:-46cqw;bottom:-60cqw;width:92cqw;height:92cqw;border-radius:50%;background:#0B4DA2}
.b1 .a2{right:-40cqw;bottom:-66cqw;width:92cqw;height:92cqw;border-radius:50%;background:#2F8BE6;mix-blend-mode:multiply;opacity:.85}
`,
  html: `<div class="deco a1"></div><div class="deco a2"></div><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
