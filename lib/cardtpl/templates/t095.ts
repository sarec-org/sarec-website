import type { CardTemplate } from '../types';

/** 95 · 上升曲线：深蓝底，右下一条一路向上的金色走势线，投资、理财、金融顾问用 */
const t: CardTemplate = {
  id: 95,
  name: '上升曲线',
  desc: '深蓝底，右下一条一路向上的金色走势线，投资、理财、金融顾问用',
  cat: '商务精选',
  batch: 1,
  cls: 'd6',
  css: `
.d6{background:linear-gradient(135deg,#07173A,#0F2E6B);--c:#fff;--a:#E3C57A;--s:#CBD6EC;--ic:#07173A;--lgc:#07173A}
.d6 .ch{left:26%;top:0;width:74%;height:100%;opacity:.8}
/* 没填公司时顶部一行留出原来 logo 行的高度，下面的姓名不往上跑 */
.d6 .top{min-height:7.6cqw}
`,
  html: `<svg class="deco ch" viewBox="0 0 170 100" preserveAspectRatio="none"><defs><linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9B46A" stop-opacity=".45"/><stop offset="1" stop-color="#D9B46A" stop-opacity="0"/></linearGradient></defs><g stroke="rgba(255,255,255,.07)" stroke-width=".4"><path d="M0 25H170M0 50H170M0 75H170M42 0V100M85 0V100M128 0V100"/></g><path d="M60 100L60 86L78 78L92 82L108 62L122 66L140 40L154 44L170 18V100Z" fill="url(#ar)"/><path d="M60 86L78 78L92 82L108 62L122 66L140 40L154 44L170 18" fill="none" stroke="#E3C57A" stroke-width="1"/><circle cx="140" cy="40" r="1.8" fill="#F6E2A6"/></svg><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
