import type { CardTemplate } from '../types';

/** 29 · 建筑线稿：白底上一栋楼的立面线稿，地产人专属 */
const t: CardTemplate = {
  id: 29,
  name: '建筑线稿',
  desc: '白底上一栋楼的立面线稿，地产人专属',
  cat: '第一批',
  batch: 2,
  cls: 'k7',
  css: `
.k7{background:#FFFFFF;--c:#1B2A4A;--a:#F28C28;--s:#4B5871}
.k7 .bd{right:24cqw;top:4cqw;width:34cqw;height:56cqw;opacity:.5}
.k7 .tier{background:#1B2A4A;color:#fff;border-color:#1B2A4A}
`,
  html: `<svg class="deco bd" viewBox="0 0 60 60"><g fill="none" stroke="#1B2A4A" stroke-width=".3"><rect x="14" y="6" width="26" height="54"/><rect x="40" y="22" width="16" height="38"/><path d="M14 6l13-5 13 5M2 60h58"/><path d="M14 12h26"/><path d="M14 18h26"/><path d="M14 24h26"/><path d="M14 30h26"/><path d="M14 36h26"/><path d="M14 42h26"/><path d="M14 48h26"/><path d="M14 54h26"/><path d="M20.5 6v54"/><path d="M27 6v54"/><path d="M33.5 6v54"/><path d="M40 28h16"/><path d="M40 34h16"/><path d="M40 40h16"/><path d="M40 46h16"/><path d="M40 52h16"/><path d="M40 58h16"/><path d="M48 22v38"/></g><rect x="27" y="30" width="6.5" height="6" fill="#F28C28"/></svg><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
