import type { CardTemplate } from '../types';

/** 1 · 金缮：黑釉上一道道金色裂纹，日本金缮工艺，残缺也贵气 */
const t: CardTemplate = {
  id: 1,
  name: '金缮',
  desc: '黑釉上一道道金色裂纹，日本金缮工艺，残缺也贵气',
  cat: '大胆款',
  batch: 2,
  cls: 'q1',
  css: `
.q1{background:radial-gradient(at 30% 20%,#1F1F24,#0A0A0C);--c:#F4EEDD;--a:#E3C57A;--s:#C9C2AE}
.q1 .kc{inset:0;width:100%;height:100%;opacity:.9}
`,
  html: `<svg class="deco kc" viewBox="0 0 170 100" preserveAspectRatio="none"><g fill="none" stroke="#C99A3C" stroke-width="1.1" stroke-linejoin="round"><path d="M-2 20L30 34L52 28L78 52L110 46L130 70L172 62"/><path d="M52 28L60 -2"/><path d="M78 52L70 80L84 102"/><path d="M110 46L124 22L150 14L172 20"/><path d="M30 34L18 60L-2 70"/><path d="M130 70L138 102"/></g><g fill="none" stroke="#FFF1C4" stroke-width=".3"><path d="M-2 20L30 34L52 28L78 52L110 46L130 70L172 62"/><path d="M110 46L124 22L150 14L172 20"/><path d="M78 52L70 80L84 102"/></g></svg><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
