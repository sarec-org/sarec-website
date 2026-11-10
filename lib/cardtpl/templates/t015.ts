import type { CardTemplate } from '../types';

/** 15 · 透明亚克力：像一块半透明磨砂亚克力，背后的色彩透上来，一个巨大的"东"字叠在后面 */
const t: CardTemplate = {
  id: 15,
  name: '透明亚克力',
  desc: '像一块半透明磨砂亚克力，背后的色彩透上来，一个巨大的"东"字叠在后面',
  cat: '大胆款',
  batch: 2,
  cls: 'q15',
  css: `
.q15{background:#DCE8F2;--c:#0F1F3D;--a:#0F1F3D;--s:#2C3C5C}
.q15 .b1{left:-6cqw;top:-18cqw;width:54cqw;height:54cqw;border-radius:50%;background:#16C7B8}
.q15 .b2{right:-10cqw;bottom:-22cqw;width:60cqw;height:60cqw;border-radius:50%;background:#FF8A3D}
.q15 .b3{right:18cqw;top:-10cqw;width:34cqw;height:34cqw;border-radius:50%;background:#FF4F8B}
.q15 .fz{inset:0;background:rgba(255,255,255,.42);-webkit-backdrop-filter:blur(22px);backdrop-filter:blur(22px);box-shadow:inset 0 0 0 .5cqw rgba(255,255,255,.7)}
.q15 .gz{right:4cqw;top:-9cqw;font-family:var(--serif);font-weight:900;font-size:62cqw;line-height:1;color:rgba(255,255,255,.5)}
.q15 .cn{font-family:var(--sans)!important;font-weight:900}
.q15 .tier{background:#0F1F3D;color:#fff;border-color:#0F1F3D}
.q15 .qr{border-radius:2cqw}
`,
  html: `<div class="deco b1"></div><div class="deco b2"></div><div class="deco b3"></div><div class="deco fz"></div><div class="deco gz">{{nameLast}}</div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
