import type { CardTemplate } from '../types';

/** 49 · 企业飘带：白底、底部两道蓝绿弧线飘带，两千年代大公司名片的标配 */
const t: CardTemplate = {
  id: 49,
  name: '企业飘带',
  desc: '白底、底部两道蓝绿弧线飘带，两千年代大公司名片的标配',
  cat: '设计经典',
  batch: 2,
  cls: 'c5',
  css: `
.c5{background:#FFFFFF;--c:#0C3C6E;--a:#1E88C8;--s:#3F5A78}
.c5 .sw{left:0;right:0;bottom:0;width:100%;height:13cqw}
.c5 .cn{font-family:var(--sans)!important;font-weight:900}
.c5 .in{padding-bottom:14cqw}
.c5 .cn{font-size:7cqw}
.c5 .qr{border:1px solid #D5DBE6}
.c5 .tier{background:#4CB648;color:#fff;border-color:#4CB648}
`,
  html: `<svg class="deco sw" viewBox="0 0 170 40" preserveAspectRatio="none"><path d="M0 40V24C40 6 90 34 170 8V40Z" fill="#1E88C8"/><path d="M0 40V30C50 14 100 40 170 18V40Z" fill="#4CB648"/><path d="M0 40V34C60 22 110 44 170 27V40Z" fill="#0C4F8A"/></svg><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
