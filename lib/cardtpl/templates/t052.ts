import type { CardTemplate } from '../types';

/** 52 · 荧光彩边：加厚白卡，正面极简，侧边刷一圈荧光粉，叠在桌上最抢眼 */
const t: CardTemplate = {
  id: 52,
  name: '荧光彩边',
  desc: '加厚白卡，正面极简，侧边刷一圈荧光粉，叠在桌上最抢眼',
  cat: '设计经典',
  batch: 2,
  cls: 'c8',
  css: `
.c8{background:linear-gradient(180deg,#FF2E88 0%,#FF2E88 60%,#D4156B 100%);--c:#111;--a:#FF2E88;--s:#444}
.c8 .face{left:0;right:1.4cqw;top:0;bottom:2.6cqw;background:#FFFFFF;border-radius:10px 6px 8px 10px;box-shadow:.4cqw .5cqw 0 rgba(120,0,50,.25)}
.c8 .in{padding:5.4cqw 8cqw 8.6cqw 6.5cqw}
.c8 .cn{font-family:var(--sans)!important;font-weight:900}
.c8 .tier{background:#FF2E88;color:#fff;border-color:#FF2E88}
.c8 .qr{border:1px solid #eee}
`,
  html: `<div class="deco face"></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
