import type { CardTemplate } from '../types';

/** 6 · 欧普同心圆：黑底上一圈圈橙色同心圆，像靶心，谁都会多看一眼 */
const t: CardTemplate = {
  id: 6,
  name: '欧普同心圆',
  desc: '黑底上一圈圈橙色同心圆，像靶心，谁都会多看一眼',
  cat: '大胆款',
  batch: 2,
  cls: 'q6',
  css: `
.q6{background:#111;--c:#fff;--a:#FF6A2B;--s:#D8D8D8}
.q6 .rg{right:-26cqw;top:50%;width:84cqw;height:84cqw;transform:translateY(-50%);border-radius:50%;background:repeating-radial-gradient(circle,#FF5A1F 0 2.3cqw,#111 2.3cqw 4.6cqw)}
.q6 .cn{font-family:var(--sans)!important;font-weight:900}
.q6 .tier{background:#fff;color:#111;border-color:#fff}
`,
  html: `<div class="deco rg"></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
