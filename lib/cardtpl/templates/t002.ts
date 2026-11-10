import type { CardTemplate } from '../types';

/** 2 · 海上日出：深蓝夜色里一轮刚冒头的太阳，水面一道道金光 */
const t: CardTemplate = {
  id: 2,
  name: '海上日出',
  desc: '深蓝夜色里一轮刚冒头的太阳，水面一道道金光',
  cat: '大胆款',
  batch: 2,
  cls: 'q2',
  css: `
.q2{background:#0A0F22;--c:#fff;--a:#FFD08A;--s:#E6E0F0}
.q2 .skyb{left:0;right:0;top:0;height:36cqw;overflow:hidden;background:linear-gradient(180deg,#0B1437 0%,#3B2A6B 45%,#C9506A 78%,#FF9A4D 100%)}
.q2 .sun{position:absolute;right:20cqw;top:20cqw;width:30cqw;height:30cqw;border-radius:50%;background:radial-gradient(circle at 50% 40%,#FFF3C4,#FFB347 60%,#FF7A3D);box-shadow:0 0 10cqw 4cqw rgba(255,170,90,.55)}
.q2 .sea{left:0;right:0;top:36cqw;bottom:0;background:linear-gradient(90deg,transparent 46%,rgba(255,180,90,.5) 62%,transparent 80%),repeating-linear-gradient(180deg,rgba(255,255,255,.07) 0 .3cqw,transparent .3cqw 1.6cqw),linear-gradient(180deg,#1B1740,#0A0F22)}
`,
  html: `<div class="deco skyb"><div class="sun"></div></div><div class="deco sea"></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
