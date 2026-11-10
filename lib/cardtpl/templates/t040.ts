import type { CardTemplate } from '../types';

/** 40 · 城市地图：浅色街区地图上标出你的位置，做本地生意的人用 */
const t: CardTemplate = {
  id: 40,
  name: '城市地图',
  desc: '浅色街区地图上标出你的位置，做本地生意的人用',
  cat: '第一批',
  batch: 2,
  cls: 'k18',
  css: `
.k18{background:#E4EBF0;--c:#12324A;--a:#E4572E;--s:#3C566A}
.k18 .mp{inset:0;width:100%;height:100%}
.k18 .cn{font-family:var(--sans)!important;font-weight:900}
.k18 .tier{background:#12324A;color:#fff;border-color:#12324A}
`,
  html: `<svg class="deco mp" viewBox="0 0 170 100" preserveAspectRatio="none"><g stroke="#fff" stroke-width="2.4" fill="none"><path d="M-5 30L175 18M-5 62L175 52M-5 88L175 82M30 -5L22 105M70 -5L64 105M112 -5L108 105M150 -5L148 105"/><path d="M-5 5L80 105" stroke-width="4"/></g><path d="M71 53.6L110 51.6L109.3 80.6L66.6 83Z" fill="#BFD7EA"/><g transform="translate(128,34)"><path d="M0-12c-5 0-9 4-9 9 0 7 9 16 9 16s9-9 9-16c0-5-4-9-9-9z" fill="#E4572E"/><circle cx="0" cy="-3" r="3.4" fill="#fff"/></g></svg><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
