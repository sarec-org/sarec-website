import type { CardTemplate } from '../types';

/** 68 · 红色斜切：左边白底写信息，右边一整块斜切的企业红放徽标和二维码 */
const t: CardTemplate = {
  id: 68,
  name: '红色斜切',
  desc: '左边白底写信息，右边一整块斜切的企业红放徽标和二维码',
  cat: '商务经典',
  batch: 1,
  cls: 'b2',
  css: `
.b2{background:#fff;--c:#1A1A1A;--a:#C8102E;--s:#444}
.b2 .r1{inset:0;background:#C8102E;clip-path:polygon(66% 0,100% 0,100% 100%,52% 100%)}
.b2 .r2{inset:0;background:#8E0B20;clip-path:polygon(61% 0,66% 0,52% 100%,47% 100%)}
.b2 .rl{right:0;top:0;bottom:0;width:36cqw;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1cqw;color:#fff;z-index:2}
.b2 .rl i{width:11cqw;height:11cqw;border-radius:50%;background:#fff;color:#C8102E;display:grid;place-items:center;font-style:normal;font-family:var(--en);font-weight:700;font-size:6.4cqw}
.b2 .rl b{font-size:3.6cqw;letter-spacing:.24em;margin-top:.6cqw}
.b2 .rl span{font-size:2cqw;letter-spacing:.2em;margin-bottom:2.4cqw}
.b2 .rl .qr{width:13cqw;height:13cqw}
.b2 .tier{background:#C8102E;color:#fff;border-color:#C8102E}
`,
  html: `<div class="deco r2"></div><div class="deco r1"></div><div class="deco rl" data-fit>{{{markI}}}{{#company}}<b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}{{/company}}<div class="qr">{{{qrImg}}}</div></div><div class="in" style="padding-right:46cqw"><div class="top">{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div>{{#hasIc}}<div class="ic2 one">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}</div>`
};
export default t;
