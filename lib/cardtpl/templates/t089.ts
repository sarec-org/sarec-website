import type { CardTemplate } from '../types';

/** 89 · 回纹中式：宣纸色底，上下两道回纹边，一方红印，楷书姓名，茶、文化、传统行业常用 */
const t: CardTemplate = {
  id: 89,
  name: '回纹中式',
  desc: '宣纸色底，上下两道回纹边，一方红印，楷书姓名，茶、文化、传统行业常用',
  cat: '商务经典',
  batch: 1,
  cls: 'b23',
  css: `
.b23{background:#F6F0E1;--c:#1E1A16;--a:#8C1C13;--s:#4A423A}
.b23 .mt{left:0;width:100%;height:4cqw}
.b23 .t{top:1.6cqw}
.b23 .b{bottom:1.6cqw}
.b23 .yin{right:27cqw;top:22cqw;width:8cqw;height:8cqw;background:#B3261E;color:#F6F0E1;display:grid;place-items:center;text-align:center;font-family:var(--serif);font-weight:900;font-size:2.6cqw;line-height:1.2;border-radius:.6cqw}
.b23 .in{padding:8.4cqw 6.5cqw}
.b23 .n2 b{font-family:var(--brush);font-weight:400;font-size:9cqw}
.b23 .lg b{font-family:var(--serif)}
.b23 .qr{background:transparent;mix-blend-mode:multiply}
.b23 .tier{color:#8C1C13;border-color:#8C1C13}
`,
  html: `<svg class="deco mt t"><defs><pattern id="hw" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="scale(.5)"><path d="M0 7H7V1H2V5H5V3" fill="none" stroke="#8C1C13" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#hw)"/></svg><svg class="deco mt b"><rect width="100%" height="100%" fill="url(#hw)"/></svg>{{#seal}}<div class="deco yin">{{seal1}}<br>{{seal2}}</div>{{/seal}}<div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
