import type { CardTemplate } from '../types';

/** 70 · 深蓝金球：藏蓝底，一个金线勾的地球，跨国贸易、国际机构的标准气质 */
const t: CardTemplate = {
  id: 70,
  name: '深蓝金球',
  desc: '藏蓝底，一个金线勾的地球，跨国贸易、国际机构的标准气质',
  cat: '商务经典',
  batch: 1,
  cls: 'b4',
  css: `
.b4{background:linear-gradient(135deg,#071634,#0E2C63);--c:#fff;--a:#D9B46A;--s:#C9D4EA;--ic:#071634;--lgc:#071634}
.b4 .gl{right:-10cqw;top:50%;width:62cqw;height:62cqw;transform:translateY(-50%);color:#D9B46A;opacity:.35}
`,
  html: `<svg class="deco gl" viewBox="-30 -30 60 60"><g fill="none" stroke="currentColor" stroke-width=".35"><circle r="28"/><ellipse rx="28" ry="9.5"/><ellipse rx="28" ry="19.5"/><ellipse rx="9.5" ry="28"/><ellipse rx="19.5" ry="28"/><path d="M-28 0H28M0 -28V28"/></g></svg><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
