import type { CardTemplate } from '../types';

/** 11 · 波普漫画：明黄底、网点、粗黑描边加红色硬阴影，像漫画封面 */
const t: CardTemplate = {
  id: 11,
  name: '波普漫画',
  desc: '明黄底、网点、粗黑描边加红色硬阴影，像漫画封面',
  cat: '大胆款',
  batch: 2,
  cls: 'q11',
  css: `
.q11{background:#FFD60A;--c:#111;--a:#E4002B;--s:#111}
.q11 .ht{inset:0;background:radial-gradient(#111 30%,transparent 32%) 0 0/2.2cqw 2.2cqw;opacity:.35;-webkit-mask:radial-gradient(circle at 88% 12%,#000 0,transparent 55%);mask:radial-gradient(circle at 88% 12%,#000 0,transparent 55%)}
.q11 .bst{left:3cqw;top:12cqw;width:46cqw;height:22cqw;background:#fff;border:.7cqw solid #111;box-shadow:1.4cqw 1.4cqw 0 #E4002B;transform:rotate(-3deg)}
.q11 .cn{font-family:var(--sans)!important;font-weight:900;font-size:10cqw;transform:rotate(-3deg);transform-origin:left;margin-left:2cqw!important}
.q11 .en{max-width:40cqw;font-family:var(--num)!important;font-weight:700;text-transform:uppercase;transform:rotate(-3deg);transform-origin:left;margin-left:2cqw!important}
.q11 .ti{font-weight:700;margin-top:5cqw!important}
.q11 .ct{background:#fff;border:.5cqw solid #111;box-shadow:1cqw 1cqw 0 #111;padding:1.8cqw 2.6cqw;font-weight:700}
.q11 .tier{background:#E4002B;color:#fff;border-color:#111;border-width:.5cqw;font-weight:700}
.q11 .org{color:#111;font-weight:900}
.q11 .qr{border:.5cqw solid #111;border-radius:0;box-shadow:1cqw 1cqw 0 #111}
`,
  html: `<div class="deco ht"></div><div class="deco bst"></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn" data-nooverlap>{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
