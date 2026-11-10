import type { CardTemplate } from '../types';

/** 46 · 铜版花体：纯白卡、一行手写花体英文名、细细一道压痕框，银行家和律师的传统 */
const t: CardTemplate = {
  id: 46,
  name: '铜版花体',
  desc: '纯白卡、一行手写花体英文名、细细一道压痕框，银行家和律师的传统',
  cat: '设计经典',
  batch: 2,
  cls: 'c2',
  css: `
.c2{background:#FFFFFF;--c:#111;--a:#111;--s:#333}
.c2 .pm{inset:3cqw;box-shadow:inset 0 0 0 1px rgba(0,0,0,.1),inset .3cqw .3cqw .6cqw rgba(0,0,0,.08),inset -.3cqw -.3cqw .6cqw rgba(255,255,255,.9)}
.c2 .in{padding:7.4cqw 8cqw}
.c2 .sc{font-family:"Pinyon Script","Snell Roundhand",cursive;font-size:12cqw;line-height:1;white-space:nowrap}
.c2 .nm{font-family:var(--serif);font-size:2.8cqw;letter-spacing:.4em;margin-top:2cqw!important;white-space:nowrap}
.c2 .rule{width:6cqw;height:1px}
.c2 .org{font-family:var(--en);letter-spacing:.3em}
.c2 .qr{border:1px solid #ddd;width:12cqw;height:12cqw}
`,
  html: `<div class="deco pm"></div><div class="in ctr"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}</div><div class="sp"></div>{{#nameEn}}<p class="sc">{{nameEn}}</p>{{/nameEn}}<p class="nm">{{nameTitle}}</p><div class="rule"></div><div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
