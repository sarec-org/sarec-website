import type { CardTemplate } from '../types';

/** 60 · 新拟态：整张卡一个颜色，按钮和面板像从卡面上鼓出来或者按下去，2020 年的界面风 */
const t: CardTemplate = {
  id: 60,
  name: '新拟态',
  desc: '整张卡一个颜色，按钮和面板像从卡面上鼓出来或者按下去，2020 年的界面风',
  cat: '设计经典',
  batch: 2,
  cls: 'c16',
  css: `
.c16{background:#E4E9F1;--c:#3B4658;--a:#5B7CFA;--s:#5A6578}
.c16 .nb{width:9cqw;height:9cqw;border-radius:50%;display:grid;place-items:center;font-family:var(--en);font-weight:700;font-size:4.6cqw;color:#5B7CFA;letter-spacing:0;box-shadow:.8cqw .8cqw 1.6cqw #C3C9D4,-.8cqw -.8cqw 1.6cqw #FFFFFF}
.c16 .pl{align-self:flex-start;padding:2.6cqw 4cqw;border-radius:3cqw;box-shadow:.8cqw .8cqw 1.8cqw #C3C9D4,-.8cqw -.8cqw 1.8cqw #FFFFFF;margin-left:-1cqw}
.c16 .pl .cn{font-family:var(--sans)!important;font-weight:900;font-size:6.6cqw}
.c16 .pl .en{font-family:var(--sans);font-size:3.2cqw}
.c16 .ins{padding:2.2cqw 3cqw;border-radius:2.4cqw;box-shadow:inset .5cqw .5cqw 1.2cqw #C3C9D4,inset -.5cqw -.5cqw 1.2cqw #FFFFFF;margin-left:-1cqw}
.c16 .qw{padding:1.2cqw;border-radius:2.4cqw;box-shadow:.8cqw .8cqw 1.6cqw #C3C9D4,-.8cqw -.8cqw 1.6cqw #FFFFFF}
.c16 .qr{width:12.5cqw;height:12.5cqw;background:#F4F6FA}
.c16 .top{color:#5A6578}
`,
  html: `<div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}<span class="nb">{{mark}}</span></div><div class="sp"></div><div class="pl"><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}</div><div class="sp"></div><div class="bot"><div class="ins">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}</div><div class="qw"><div class="qr">{{{qrImg}}}</div></div></div></div>`
};
export default t;
