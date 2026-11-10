import type { CardTemplate } from '../types';

/** 50 · 哑黑亮黑：哑光黑卡上一层只在反光时才看得见的亮黑图案，银色小字 */
const t: CardTemplate = {
  id: 50,
  name: '哑黑亮黑',
  desc: '哑光黑卡上一层只在反光时才看得见的亮黑图案，银色小字',
  cat: '设计经典',
  batch: 2,
  cls: 'c6',
  css: `
.c6{background:#121214;--c:#E9EAEE;--a:#B9BEC8;--s:#9AA0AB}
.c6 .uv{right:-2cqw;top:-18cqw;font-family:var(--en);font-weight:700;font-size:88cqw;line-height:1;background:linear-gradient(115deg,rgba(255,255,255,.02) 30%,rgba(255,255,255,.2) 48%,rgba(255,255,255,.03) 62%);-webkit-background-clip:text;background-clip:text;color:transparent}
.c6 .uv2{inset:0;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.05) 50%,transparent 60%)}
.c6 .cn{background:linear-gradient(180deg,#fff,#9AA0AB);-webkit-background-clip:text;background-clip:text;color:transparent}
.c6 .tier{border-color:#6A6F7A}
`,
  html: `<div class="deco uv">S</div><div class="deco uv2"></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
