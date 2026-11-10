import type { CardTemplate } from '../types';

/** 30 · 工程蓝图：蓝图底、白色网格、图纸标注，专业硬核 */
const t: CardTemplate = {
  id: 30,
  name: '工程蓝图',
  desc: '蓝图底、白色网格、图纸标注，专业硬核',
  cat: '第一批',
  batch: 2,
  cls: 'k8',
  css: `
.k8{background:#12458A;--c:#fff;--a:#FFD84A;--s:#D5E5FF}
.k8 .g{inset:0;background:linear-gradient(rgba(255,255,255,.16) 1px,transparent 1px) 0 0/100% 11.6cqw,linear-gradient(90deg,rgba(255,255,255,.16) 1px,transparent 1px) 0 0/11.6cqw 100%,linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px) 0 0/100% 2.9cqw,linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px) 0 0/2.9cqw 100%}
.k8 .org,.k8 .ct,.k8 .ti{font-family:var(--mono)}
.k8 .cn{font-family:var(--sans)!important}
.k8 .qr{border-radius:0}
`,
  html: `<div class="deco g"></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
