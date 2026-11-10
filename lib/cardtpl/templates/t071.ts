import type { CardTemplate } from '../types';

/** 71 · 白底蓝球：白底，顶上一条蓝线，右侧淡蓝色的地球线框，干净的外贸公司风 */
const t: CardTemplate = {
  id: 71,
  name: '白底蓝球',
  desc: '白底，顶上一条蓝线，右侧淡蓝色的地球线框，干净的外贸公司风',
  cat: '商务经典',
  batch: 1,
  cls: 'b5',
  css: `
.b5{background:#fff;--c:#0D2A52;--a:#1565C0;--s:#40577A}
.b5 .tl{left:0;right:0;top:0;height:1.4cqw;background:linear-gradient(90deg,#1565C0 0 70%,#F2A900 70%)}
.b5 .gl{right:-14cqw;top:50%;width:64cqw;height:64cqw;transform:translateY(-50%);color:#1565C0;opacity:.16}
.b5 .qr{border:1px solid #D5DBE6}
`,
  html: `<div class="deco tl"></div><svg class="deco gl" viewBox="-30 -30 60 60"><g fill="none" stroke="currentColor" stroke-width=".35"><circle r="28"/><ellipse rx="28" ry="9.5"/><ellipse rx="28" ry="19.5"/><ellipse rx="9.5" ry="28"/><ellipse rx="19.5" ry="28"/><path d="M-28 0H28M0 -28V28"/></g></svg><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
