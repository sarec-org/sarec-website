import type { CardTemplate } from '../types';

/** 26 · 极光渐变：深紫到橙粉的流光，颜色最鲜活 */
const t: CardTemplate = {
  id: 26,
  name: '极光渐变',
  desc: '深紫到橙粉的流光，颜色最鲜活',
  cat: '第一批',
  batch: 2,
  cls: 'k4',
  css: `
.k4{background:radial-gradient(70% 90% at 10% 10%,#FF9A5A 0%,transparent 60%),radial-gradient(70% 90% at 95% 15%,#FF4F9A 0%,transparent 60%),radial-gradient(90% 100% at 30% 110%,#5B5BFF 0%,transparent 65%),radial-gradient(70% 90% at 100% 100%,#18C8C2 0%,transparent 60%),#2A1B6B;--c:#fff;--a:#fff;--s:rgba(255,255,255,.9)}
.k4 .tier{background:rgba(255,255,255,.22);border-color:transparent}
.k4 .qr{border-radius:2.4cqw}
`,
  html: `<div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
