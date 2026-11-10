import type { CardTemplate } from '../types';

/** 74 · 左栏徽标：左边三分之一是深色栏，放徽标和二维码；右边白底一行行列联系方式 */
const t: CardTemplate = {
  id: 74,
  name: '左栏徽标',
  desc: '左边三分之一是深色栏，放徽标和二维码；右边白底一行行列联系方式',
  cat: '商务经典',
  batch: 1,
  cls: 'b8',
  css: `
.b8{background:#fff;--c:#0F2347;--a:#B08A3C;--s:#3D4D6E}
.b8 .sd{left:0;top:0;bottom:0;width:34cqw;background:linear-gradient(180deg,#132B57,#0A1A38);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1cqw;color:#fff;border-right:.8cqw solid #B08A3C}
.b8 .sd i{width:12cqw;height:12cqw;border-radius:50%;border:.5cqw solid #D9B46A;color:#D9B46A;display:grid;place-items:center;font-style:normal;font-family:var(--en);font-weight:700;font-size:7cqw}
.b8 .sd b{font-size:3.4cqw;letter-spacing:.24em;margin-top:.8cqw}
.b8 .sd span{font-size:1.9cqw;letter-spacing:.2em;color:#D9B46A;margin-bottom:2.4cqw}
.b8 .sd .qr{width:12.5cqw;height:12.5cqw}
.b8 .tier{background:#0F2347;color:#fff;border-color:#0F2347}
`,
  html: `<div class="deco sd" data-fit>{{{markI}}}{{#company}}<b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}{{/company}}<div class="qr">{{{qrImg}}}</div></div><div class="in" style="padding-left:40cqw"><div class="top"><span></span>{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div>{{#hasIc}}<div class="ic2 one">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}</div>`
};
export default t;
