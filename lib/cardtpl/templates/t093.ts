import type { CardTemplate } from '../types';

/** 93 · 楼盘线稿：浅灰白底，右下角一排楼盘的线稿，开发商、经纪人、物业公司专用 */
const t: CardTemplate = {
  id: 93,
  name: '楼盘线稿',
  desc: '浅灰白底，右下角一排楼盘的线稿，开发商、经纪人、物业公司专用',
  cat: '商务精选',
  batch: 1,
  cls: 'd4',
  css: `
.d4{background:linear-gradient(180deg,#FFFFFF,#EEF3F9);--c:#0E2A5C;--a:#0B4DA2;--s:#3B4F78}
.d4 .bl{right:19cqw;bottom:0;width:50cqw;height:20cqw;opacity:.2}
.d4 .n2 span{color:#F28C28}
.d4 .qr{border:1px solid #D5DBE6}
/* 没填公司时顶部一行留出原来 logo 行的高度，下面的姓名不往上跑 */
.d4 .top{min-height:7.6cqw}
`,
  html: `<svg class="deco bl" viewBox="0 0 100 40"><g fill="none" stroke="#0B4DA2" stroke-width=".4"><path d="M0 40h100"/><rect x="6" y="18" width="12" height="22"/><path d="M6 24h12M6 30h12M6 36h12M12 18v22"/><rect x="22" y="6" width="16" height="34"/><path d="M22 12h16M22 18h16M22 24h16M22 30h16M22 36h16M27.3 6v34M32.6 6v34M30 6V1"/><rect x="42" y="14" width="14" height="26"/><path d="M42 20h14M42 26h14M42 32h14M49 14v26"/><path d="M60 40V22l9-7 9 7v18"/><rect x="66" y="30" width="6" height="10"/><rect x="82" y="10" width="12" height="30"/><path d="M82 16h12M82 22h12M82 28h12M82 34h12M88 10v30"/></g><rect x="27.3" y="18" width="5.3" height="6" fill="#F28C28"/></svg><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
