import type { CardTemplate } from '../types';

/** 58 · 扁平长影：纯色底、白色圆形图标拖一道 45 度长影，2013 年前后最流行的扁平风 */
const t: CardTemplate = {
  id: 58,
  name: '扁平长影',
  desc: '纯色底、白色圆形图标拖一道 45 度长影，2013 年前后最流行的扁平风',
  cat: '设计经典',
  batch: 2,
  cls: 'c14',
  css: `
.c14{background:#2F95DC;--c:#fff;--a:#FFE08A;--s:#EAF5FD}
.c14 .ls{left:15cqw;top:21cqw;width:60cqw;height:16cqw;background:linear-gradient(90deg,rgba(0,0,0,.2),rgba(0,0,0,0) 85%);transform:rotate(45deg);transform-origin:0 50%}
.c14 .icn{left:7cqw;top:13cqw;width:16cqw;height:16cqw;border-radius:50%;background:#fff;display:grid;place-items:center}
.c14 .icn i{width:7cqw;height:8.4cqw;background:linear-gradient(#2F95DC,#2F95DC) 1.2cqw 1.4cqw/1.4cqw 1.4cqw no-repeat,linear-gradient(#2F95DC,#2F95DC) 4.4cqw 1.4cqw/1.4cqw 1.4cqw no-repeat,linear-gradient(#2F95DC,#2F95DC) 1.2cqw 4.2cqw/1.4cqw 1.4cqw no-repeat,linear-gradient(#2F95DC,#2F95DC) 4.4cqw 4.2cqw/1.4cqw 1.4cqw no-repeat,#1B5E96}
.c14 .ft{left:0;right:0;bottom:0;height:22cqw;background:#2380C4}
.c14 .cn{font-family:var(--sans)!important;font-weight:900;font-size:7.4cqw}
.c14 .tier{background:#fff;color:#2F95DC;border-color:#fff}
.c14 .org{color:#fff}
`,
  html: `<div class="deco ls"></div><div class="deco icn"><i></i></div><div class="deco ft"></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><div style="padding-left:27cqw"><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}</div><div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
