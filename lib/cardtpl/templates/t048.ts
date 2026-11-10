import type { CardTemplate } from '../types';

/** 48 · 左徽右文：左边一枚徽章，中间一条竖线，右边姓名和联系方式——全世界用得最多的商务版式 */
const t: CardTemplate = {
  id: 48,
  name: '左徽右文',
  desc: '左边一枚徽章，中间一条竖线，右边姓名和联系方式——全世界用得最多的商务版式',
  cat: '设计经典',
  batch: 2,
  cls: 'c4',
  css: `
.c4{background:#FFFFFF;--c:#0F2347;--a:#B08A3C;--s:#3D4D6E}
.c4 .lf{left:0;top:0;bottom:0;width:38cqw;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.4cqw;color:#0F2347}
.c4 .lf i{width:17cqw;height:17cqw;border-radius:50%;border:.5cqw solid #0F2347;box-shadow:0 0 0 .5cqw #fff,0 0 0 .8cqw #B08A3C;display:grid;place-items:center;font-style:normal;font-family:var(--en);font-weight:700;font-size:10cqw}
.c4 .lf b{font-family:var(--en);font-size:3.6cqw;letter-spacing:.3em;margin-top:1.6cqw}
.c4 .lf span{font-size:2.1cqw;letter-spacing:.3em;color:#B08A3C}
.c4 .vr{left:38cqw;top:9cqw;bottom:9cqw;width:1px;background:#B08A3C}
.c4 .cn{font-size:7cqw}
.c4 .tier{background:#0F2347;color:#fff;border-color:#0F2347}
.c4 .qr{border:1px solid #D5DBE6;width:12.5cqw;height:12.5cqw}
`,
  html: `<div class="deco lf"><i>S</i><b>SAREC</b><span>中美房地产商会</span></div><div class="deco vr"></div><div class="in" style="padding-left:44cqw"><div class="top"><span></span>{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
