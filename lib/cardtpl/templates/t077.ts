import type { CardTemplate } from '../types';

/** 77 · 中国红烫金：整张中国红，烫金的徽标和图标，白色大字姓名，喜庆又正式 */
const t: CardTemplate = {
  id: 77,
  name: '中国红烫金',
  desc: '整张中国红，烫金的徽标和图标，白色大字姓名，喜庆又正式',
  cat: '商务经典',
  batch: 1,
  cls: 'b11',
  css: `
.b11{background:radial-gradient(at 30% 20%,#CF1F27,#8E0F15);--c:#fff;--a:#F4CF6B;--s:#FBE6C4;--ic:#8E0F15;--lgc:#8E0F15}
.b11 .em{right:6cqw;top:-10cqw;font-family:var(--en);font-weight:700;font-size:70cqw;line-height:1;color:rgba(244,207,107,.12)}
.b11 .ln{left:6.5cqw;right:6.5cqw;top:17.4cqw;height:.3cqw;background:linear-gradient(90deg,#F4CF6B,rgba(244,207,107,0))}
.b11 .tier{color:#F4CF6B;border-color:#F4CF6B}
`,
  html: `<div class="deco em">{{mark}}</div><div class="deco ln"></div><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
