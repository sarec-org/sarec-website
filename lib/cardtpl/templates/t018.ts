import type { CardTemplate } from '../types';

/** 18 · 老花：棕色底铺满金色 S 字母和菱形的老花纹，奢侈品箱包的派头 */
const t: CardTemplate = {
  id: 18,
  name: '老花',
  desc: '棕色底铺满金色 S 字母和菱形的老花纹，奢侈品箱包的派头',
  cat: '大胆款',
  batch: 2,
  cls: 'q18',
  css: `
.q18{background:#3A2718;--c:#2A1B0E;--a:#8A5A22;--s:#4A3626}
.q18 .pt{inset:0;width:100%;height:100%;opacity:.55}
.q18 .lb{left:4cqw;top:4cqw;bottom:4cqw;width:58cqw;background:#F3E6CF;border-radius:1.4cqw;box-shadow:0 0 0 .4cqw #C39A4A,0 1cqw 3cqw rgba(0,0,0,.45)}
.q18 .in{padding:8cqw 6cqw 8cqw 8cqw}
.q18 .tier{background:#3A2718;color:#F3E6CF;border-color:#C39A4A;margin-right:-1cqw}
.q18 .qr{box-shadow:0 0 0 .4cqw #C39A4A}
`,
  html: `<svg class="deco pt"><defs><pattern id="mg" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(0)"><text x="6.5" y="10" text-anchor="middle" font-family="Playfair Display,Georgia,serif" font-weight="700" font-size="9" fill="#D9B46A">S</text><path d="M19.5 15.5l3 4-3 4-3-4z" fill="none" stroke="#D9B46A" stroke-width=".8"/><circle cx="19.5" cy="6.5" r="1.3" fill="#D9B46A"/><path d="M4 19.5h5M6.5 17v5" stroke="#D9B46A" stroke-width=".8"/></pattern></defs><rect width="100%" height="100%" fill="url(#mg)"/></svg><div class="deco lb"></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
