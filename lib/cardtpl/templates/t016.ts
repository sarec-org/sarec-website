import type { CardTemplate } from '../types';

/** 16 · 等高线：沙色底上一圈圈地形等高线，像一张土地勘测图 */
const t: CardTemplate = {
  id: 16,
  name: '等高线',
  desc: '沙色底上一圈圈地形等高线，像一张土地勘测图',
  cat: '大胆款',
  batch: 2,
  cls: 'q16',
  css: `
.q16{background:#EAE4D2;--c:#2B3620;--a:#B5552B;--s:#49553B}
.q16 .cl{inset:0;width:100%;height:100%;opacity:.75}
.q16 .tier{background:#2B3620;color:#EAE4D2;border-color:#2B3620}
.q16 .org,.q16 .ct i{font-family:var(--mono)}
`,
  html: `<svg class="deco cl" viewBox="0 0 170 100" preserveAspectRatio="none"><g fill="none" stroke="#6F8552" stroke-width=".35"><ellipse cx="118" cy="40" rx="6.0" ry="4.0" transform="rotate(-14.0 118 40)"/><ellipse cx="118" cy="40" rx="13.5" ry="9.2" transform="rotate(-12.7 118 40)"/><ellipse cx="118" cy="40" rx="21.0" ry="14.4" transform="rotate(-11.4 118 40)"/><ellipse cx="118" cy="40" rx="28.5" ry="19.6" transform="rotate(-10.1 118 40)"/><ellipse cx="118" cy="40" rx="36.0" ry="24.8" transform="rotate(-8.8 118 40)"/><ellipse cx="118" cy="40" rx="43.5" ry="30.0" transform="rotate(-7.5 118 40)"/><ellipse cx="118" cy="40" rx="51.0" ry="35.2" transform="rotate(-6.199999999999999 118 40)"/><ellipse cx="118" cy="40" rx="58.5" ry="40.4" transform="rotate(-4.9 118 40)"/><ellipse cx="118" cy="40" rx="66.0" ry="45.6" transform="rotate(-3.5999999999999996 118 40)"/><ellipse cx="118" cy="40" rx="73.5" ry="50.800000000000004" transform="rotate(-2.299999999999999 118 40)"/><ellipse cx="118" cy="40" rx="81.0" ry="56.0" transform="rotate(-1.0 118 40)"/><ellipse cx="30" cy="96" rx="8" ry="5" transform="rotate(10 30 96)"/><ellipse cx="30" cy="96" rx="16" ry="10" transform="rotate(9 30 96)"/><ellipse cx="30" cy="96" rx="24" ry="15" transform="rotate(8 30 96)"/><ellipse cx="30" cy="96" rx="32" ry="20" transform="rotate(7 30 96)"/><ellipse cx="30" cy="96" rx="40" ry="25" transform="rotate(6 30 96)"/><ellipse cx="30" cy="96" rx="48" ry="30" transform="rotate(5 30 96)"/><ellipse cx="30" cy="96" rx="56" ry="35" transform="rotate(4 30 96)"/><ellipse cx="30" cy="96" rx="64" ry="40" transform="rotate(3 30 96)"/></g><circle cx="118" cy="40" r="1.8" fill="#B5552B"/></svg><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
