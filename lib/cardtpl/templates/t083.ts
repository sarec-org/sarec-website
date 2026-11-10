import type { CardTemplate } from '../types';

/** 83 · 皮革烫金：深棕色皮面、一圈缝线、烫金的字，像一个皮质名片夹 */
const t: CardTemplate = {
  id: 83,
  name: '皮革烫金',
  desc: '深棕色皮面、一圈缝线、烫金的字，像一个皮质名片夹',
  cat: '商务经典',
  batch: 1,
  cls: 'b17',
  css: `
.b17{background:radial-gradient(at 30% 20%,#5A3A22,#2E1B0E);--c:#F3DFAE;--a:#E3C57A;--s:#E6D2A8;--ic:#2E1B0E;--lgc:#2E1B0E}
.b17 .lt{inset:0;background:radial-gradient(rgba(0,0,0,.28) .6px,transparent 1.2px) 0 0/1.3cqw 1.2cqw,radial-gradient(rgba(255,255,255,.06) .5px,transparent 1px) .6cqw .5cqw/1.7cqw 1.5cqw}
.b17 .st{inset:2.2cqw;border:.35cqw dashed rgba(227,197,122,.75);border-radius:1.6cqw}
.b17 .in{padding:7cqw 7.6cqw}
.b17 .n2 b{background:linear-gradient(180deg,#F8E6B0,#C39A4A);-webkit-background-clip:text;background-clip:text;color:transparent}
.b17 .tier{color:#E3C57A;border-color:#E3C57A}
`,
  html: `<div class="deco lt"></div><div class="deco st"></div><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
