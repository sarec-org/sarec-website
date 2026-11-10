import type { CardTemplate } from '../types';

/** 66 · 亲笔签名：一张白卡，正中是一个蓝墨水的手写签名，其余信息小小地排在下面 */
const t: CardTemplate = {
  id: 66,
  name: '亲笔签名',
  desc: '一张白卡，正中是一个蓝墨水的手写签名，其余信息小小地排在下面',
  cat: '设计经典',
  batch: 2,
  cls: 'c22',
  css: `
.c22{background:#FFFFFF;--c:#1B2A4A;--a:#1F3FAE;--s:#44506A}
.c22 .sg{font-family:"Pinyon Script","Snell Roundhand",cursive;font-size:17cqw;line-height:.9;color:#1F3FAE;transform:rotate(-5deg);white-space:nowrap}
.c22 .ul{width:44cqw;height:.3cqw;background:#1F3FAE;border-radius:50%;transform:rotate(-5deg);margin-top:-1cqw!important;opacity:.7}
.c22 .nm{font-size:2.4cqw;letter-spacing:.2em;margin-top:3cqw!important;white-space:nowrap}
.c22 .org{color:#44506A}
.c22 .qr{border:1px solid #ddd;width:12cqw;height:12cqw}
`,
  html: `<div class="in ctr"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}</div><div class="sp"></div><p class="sg" data-nooverlap data-minzoom=".3">{{#nameEn}}{{nameEn}}{{/nameEn}}{{^nameEn}}{{name}}{{/nameEn}}</p><div class="ul"></div>{{#nameEn}}<p class="nm">{{nameTitleCo}}</p>{{/nameEn}}{{^nameEn}}{{#titleLine}}<p class="nm">{{titleLine}}</p>{{/titleLine}}{{/nameEn}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
