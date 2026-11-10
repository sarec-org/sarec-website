import type { CardTemplate } from '../types';

/** 39 · 镭射幻彩：珠光镭射膜一样的流动彩虹，潮牌感 */
const t: CardTemplate = {
  id: 39,
  name: '镭射幻彩',
  desc: '珠光镭射膜一样的流动彩虹，潮牌感',
  cat: '第一批',
  batch: 2,
  cls: 'k17',
  css: `
.k17{background:#F4F4F8;--c:#15151C;--a:#15151C;--s:#33333D}
.k17 .holo{inset:0;background:conic-gradient(from 210deg at 30% 40%,#B8F3FF,#D7C4FF,#FFC8EE,#FFF1B8,#C4FFD9,#B8F3FF,#E3CCFF,#FFD0E8,#B8F3FF);filter:saturate(1.15)}
.k17 .cn{font-family:var(--sans)!important;font-weight:900}
.k17 .tier{background:#15151C;color:#fff;border-color:#15151C}
.k17 .qr{border-radius:2cqw}
`,
  html: `<div class="deco holo"></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
