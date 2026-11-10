import type { CardTemplate } from '../types';

/** 9 · 青绿山水：千里江山图那种石青石绿，泥金底，层层远山 */
const t: CardTemplate = {
  id: 9,
  name: '青绿山水',
  desc: '千里江山图那种石青石绿，泥金底，层层远山',
  cat: '大胆款',
  batch: 2,
  cls: 'q9',
  css: `
.q9{background:linear-gradient(180deg,#F6EBCB,#E9D7A6);--c:#0E3B43;--a:#9A6B14;--s:#28555C}
.q9 .ms{right:0;bottom:0;width:74cqw;height:36cqw}
.q9 .sn{right:15cqw;top:7cqw;width:11cqw;height:11cqw;border-radius:50%;background:radial-gradient(circle at 40% 35%,#F9E2A0,#D9A93A)}
.q9 .tier{background:#0E3B43;color:#F6EBCB;border-color:#0E3B43}
`,
  html: `<div class="deco sn"></div><svg class="deco ms" viewBox="0 0 120 60" preserveAspectRatio="none"><path d="M0 60V34l10-8 8 5 12-16 9 9 7-5 12 14 8-7 10 9 9-13 12 12 11-7 12 10v23z" fill="#8EC3B8"/><path d="M0 60V42l14-9 10 6 13-13 11 11 15-9 13 10 14-8 13 8 17-6v28z" fill="#2E8F8B"/><path d="M0 60V50l18-7 14 5 19-10 17 9 21-7 15 7 16-5v18z" fill="#1E5F93"/><path d="M0 60V56l22-4 20 3 24-6 22 5 32-4v10z" fill="#0F6B55"/><g fill="none" stroke="#E7C873" stroke-width=".35"><path d="M0 42l14-9 10 6 13-13 11 11 15-9 13 10 14-8 13 8 17-6"/><path d="M0 50l18-7 14 5 19-10 17 9 21-7 15 7 16-5"/></g></svg><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
