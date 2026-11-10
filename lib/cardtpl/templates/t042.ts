import type { CardTemplate } from '../types';

/** 42 · 青花瓷：白瓷底、上下两道青花纹边，东方而不老气 */
const t: CardTemplate = {
  id: 42,
  name: '青花瓷',
  desc: '白瓷底、上下两道青花纹边，东方而不老气',
  cat: '第一批',
  batch: 2,
  cls: 'k22',
  css: `
.k22{background:#FDFDFB;--c:#173A82;--a:#1E4FA3;--s:#3A568F}
.k22 .bd{left:0;right:0;height:5.4cqw;background:radial-gradient(circle at 50% 0,#1E4FA3 0 1.5cqw,transparent 1.6cqw) 0 0/5.4cqw 5.4cqw,radial-gradient(circle at 50% 100%,transparent 0 2.1cqw,#1E4FA3 2.2cqw 2.5cqw,transparent 2.6cqw) 2.7cqw 0/5.4cqw 5.4cqw,#fff;border-top:.5cqw solid #1E4FA3;border-bottom:.5cqw solid #1E4FA3}
.k22 .t{top:0}
.k22 .b{bottom:0;transform:scaleY(-1)}
.k22 .in{padding:9.4cqw 6.5cqw}
`,
  html: `<div class="deco bd t"></div><div class="deco bd b"></div><div class="in ctr"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="rule"></div><div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
