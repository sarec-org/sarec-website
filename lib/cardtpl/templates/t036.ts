import type { CardTemplate } from '../types';

/** 36 · 酒红烫金：酒红底，左边一枚烫金姓氏徽章，沉稳贵气 */
const t: CardTemplate = {
  id: 36,
  name: '酒红烫金',
  desc: '酒红底，左边一枚烫金姓氏徽章，沉稳贵气',
  cat: '第一批',
  batch: 2,
  cls: 'k14',
  css: `
.k14{background:linear-gradient(135deg,#6A1326,#3F0915);--c:#F6EAD0;--a:#E3C57A;--s:#E1CFC0}
.k14 .side{background:linear-gradient(180deg,#4A0B1A,#2C050F);border-right:.4cqw solid #C39A4A}
.k14 .side b{background:radial-gradient(circle at 35% 30%,#F8E6B0,#C39A4A 60%,#8D6B2B);color:#3A0912}
`,
  html: `<div class="deco side"><b>W</b><div class="qr">{{{qrImg}}}</div></div><div class="in spl"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div>{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}</div>`
};
export default t;
