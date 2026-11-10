import type { CardTemplate } from '../types';

/** 10 · 包豪斯：红黄蓝三原色的方、圆、半圆拼成一面墙，设计圈的经典 */
const t: CardTemplate = {
  id: 10,
  name: '包豪斯',
  desc: '红黄蓝三原色的方、圆、半圆拼成一面墙，设计圈的经典',
  cat: '大胆款',
  batch: 2,
  cls: 'q10',
  css: `
.q10{background:#F2EDE0;--c:#151515;--a:#D62B1F;--s:#3A3A3A}
.q10 .bh{left:0;top:0;bottom:0;width:29.4cqw;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(4,1fr);background:#151515}
.q10 .bh i{display:block}
.q10 .a{background:#D62B1F;border-radius:0 0 100% 0}
.q10 .b{background:#F2B705}
.q10 .c{background:#1D4E9E;grid-column:1/3;grid-row:2/4;border-radius:50%;margin:1cqw}
.q10 .d{background:#F2EDE0;border-radius:100% 0 0 0}
.q10 .e{background:#D62B1F}
.q10 .f{display:none}
.q10 .in{padding-left:35cqw}
.q10 .cn,.q10 .org{font-family:var(--sans)!important;font-weight:900}
.q10 .tier{background:#151515;color:#fff;border-color:#151515}
.q10 .qr{border:.4cqw solid #151515;border-radius:0}
`,
  html: `<div class="deco bh"><i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i><i class="e"></i><i class="f"></i></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
