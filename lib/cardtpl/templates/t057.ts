import type { CardTemplate } from '../types';

/** 57 · 双色调：紫和青两种颜色叠出来的城市剪影，前几年流媒体海报的那种调子 */
const t: CardTemplate = {
  id: 57,
  name: '双色调',
  desc: '紫和青两种颜色叠出来的城市剪影，前几年流媒体海报的那种调子',
  cat: '设计经典',
  batch: 2,
  cls: 'c13',
  css: `
.c13{background:linear-gradient(135deg,#5B2BE0 0%,#8A3FE8 35%,#18D6C4 100%);--c:#fff;--a:#D6FFF9;--s:#EFE8FF}
.c13 .d1{left:-12cqw;top:-22cqw;width:60cqw;height:60cqw;border-radius:50%;background:#18D6C4;mix-blend-mode:screen;opacity:.45}
.c13 .d2{right:-10cqw;bottom:-30cqw;width:70cqw;height:70cqw;border-radius:50%;background:#3A12B8;mix-blend-mode:multiply;opacity:.6}
.c13 .sky{left:0;bottom:0;width:100%;height:24cqw;color:#2A0E8C;opacity:.55}
.c13 .cn{font-family:var(--sans)!important;font-weight:900}
.c13 .tier{background:rgba(255,255,255,.2);border-color:transparent}
`,
  html: `<div class="deco d1"></div><div class="deco d2"></div><svg class="deco sky" viewBox="0 0 170 30" preserveAspectRatio="none"><path fill="currentColor" d="M0 29h8V20h5v9h4V14h6v15h3V18h7v11h4V9h3V5h2v4h3v20h5V16h8v13h4V21h6v8h5V11h7v18h4V17h6v12h5V7h2V3h2v4h2v22h6V19h7v10h4V13h8v16h5V22h6v7h5V15h6v14h8"/></svg><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
