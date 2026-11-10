import type { CardTemplate } from '../types';

/** 23 · 黑金拉丝：金属拉丝底，金色圆徽，像高端会员卡 */
const t: CardTemplate = {
  id: 23,
  name: '黑金拉丝',
  desc: '金属拉丝底，金色圆徽，像高端会员卡',
  cat: '第一批',
  batch: 2,
  cls: 'k1',
  css: `
.k1{background:linear-gradient(125deg,#17181B 0%,#2B2D33 28%,#101114 52%,#34363D 78%,#131417 100%);--c:#F1E6C8;--a:#E3C57A;--s:#C6B890}
.k1 .sheen{inset:0;background:repeating-linear-gradient(100deg,rgba(255,255,255,.035) 0 .25cqw,transparent .25cqw .6cqw)}
.k1 .glint{left:-20cqw;top:-40cqw;width:60cqw;height:160cqw;background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);transform:rotate(24deg)}
.k1 .cn{background:linear-gradient(180deg,#F8E6B0,#C39A4A);-webkit-background-clip:text;background-clip:text;color:transparent}
`,
  html: `<div class="deco sheen"></div><div class="deco glint"></div><div class="in"><div class="top"><span class="seal">S</span>{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
