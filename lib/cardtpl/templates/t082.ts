import type { CardTemplate } from '../types';

/** 82 · 头像金环：藏蓝底，右上角金色圆环里的头像，左边姓名职务，下面联系方式 */
const t: CardTemplate = {
  id: 82,
  name: '头像金环',
  desc: '藏蓝底，右上角金色圆环里的头像，左边姓名职务，下面联系方式',
  cat: '商务经典',
  batch: 1,
  cls: 'b16',
  css: `
.b16{background:linear-gradient(135deg,#0A1830,#143A6E);--c:#fff;--a:#D9B46A;--s:#CBD6EA;--ic:#0A1830;--lgc:#0A1830}
.b16 .av{right:6.5cqw;top:5.4cqw;width:21cqw;height:21cqw;border-radius:50%;overflow:hidden;border:.7cqw solid #D9B46A;box-shadow:0 0 0 1cqw rgba(217,180,106,.25)}
.b16 .av svg{display:block;width:100%;height:100%}
.b16 .tr{margin-top:1.6cqw!important}
.b16 .tier{color:#D9B46A;border-color:#D9B46A}
/* 没填公司时顶部一行留出原来 logo 行的高度，下面的姓名不往上跑 */
.b16 .top{min-height:7.6cqw}
`,
  html: `<div class="deco av"><svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#8FA3BF"/><circle cx="50" cy="40" r="18" fill="#E6ECF4"/><path d="M14 100c0-22 16-34 36-34s36 12 36 34z" fill="#E6ECF4"/></svg></div><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<p class="tr">{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</p><div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
