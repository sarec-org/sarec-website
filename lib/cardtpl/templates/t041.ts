import type { CardTemplate } from '../types';

/** 41 · 天际线夜色：藏蓝夜空下金线勾出的城市天际线，商会主色 */
const t: CardTemplate = {
  id: 41,
  name: '天际线夜色',
  desc: '藏蓝夜空下金线勾出的城市天际线，商会主色',
  cat: '第一批',
  batch: 2,
  cls: 'k21',
  css: `
.k21{background:linear-gradient(160deg,#0A1830 0%,#12305A 70%,#17407A 100%);--c:#F3EEDF;--a:#D6B36F;--s:#C9D3E2}
.k21 .sky{left:0;bottom:0;width:100%;height:20cqw;color:#D6B36F;opacity:.5}
.k21 .glow{left:20cqw;bottom:-30cqw;width:70cqw;height:50cqw;border-radius:50%;background:radial-gradient(rgba(201,165,103,.28),transparent 70%)}
`,
  html: `<div class="deco glow"></div><svg class="deco sky" viewBox="0 0 170 30" preserveAspectRatio="none"><path fill="none" stroke="currentColor" stroke-width=".35" d="M0 29h8V20h5v9h4V14h6v15h3V18h7v11h4V9h3V5h2v4h3v20h5V16h8v13h4V21h6v8h5V11h7v18h4V17h6v12h5V7h2V3h2v4h2v22h6V19h7v10h4V13h8v16h5V22h6v7h5V15h6v14h8"/></svg><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
