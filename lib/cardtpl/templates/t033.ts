import type { CardTemplate } from '../types';

/** 33 · 午夜霓虹：黑底、青色发光描边的名字，科技圈气质 */
const t: CardTemplate = {
  id: 33,
  name: '午夜霓虹',
  desc: '黑底、青色发光描边的名字，科技圈气质',
  cat: '第一批',
  batch: 2,
  cls: 'k11',
  css: `
.k11{background:#07070C;--c:#fff;--a:#FF4FD8;--s:#B9C4D6}
.k11 .g{inset:0;background:linear-gradient(rgba(125,249,255,.07) 1px,transparent 1px) 0 0/100% 5cqw,linear-gradient(90deg,rgba(125,249,255,.07) 1px,transparent 1px) 0 0/5cqw 100%}
.k11 .cn{font-family:var(--sans)!important;color:transparent;-webkit-text-stroke:.28cqw #7DF9FF;text-shadow:0 0 3cqw rgba(125,249,255,.75)}
.k11 .rule{background:linear-gradient(90deg,transparent,#FF4FD8,transparent)!important;box-shadow:0 0 2cqw #FF4FD8}
.k11 .org{color:#7DF9FF}
`,
  html: `<div class="deco g"></div><div class="in ctr"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="rule"></div><div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
