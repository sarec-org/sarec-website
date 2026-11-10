import type { CardTemplate } from '../types';

/** 43 · 巨型字母：宝蓝底上一个撑满的空心 W，大胆、好记 */
const t: CardTemplate = {
  id: 43,
  name: '巨型字母',
  desc: '宝蓝底上一个撑满的空心 W，大胆、好记',
  cat: '第一批',
  batch: 2,
  cls: 'k23',
  css: `
.k23{background:#1F3BFF;--c:#fff;--a:#FFE14D;--s:#DCE3FF}
.k23 .w{right:-6cqw;top:-14cqw;font-family:var(--num);font-weight:700;font-size:78cqw;line-height:1;color:transparent;-webkit-text-stroke:.5cqw rgba(255,255,255,.35)}
.k23 .cn{font-family:var(--sans)!important;font-weight:900}
.k23 .tier{background:#FFE14D;color:#1F3BFF;border-color:#FFE14D}
`,
  html: `<div class="deco w">W</div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="bot" style="margin-top:3cqw;align-items:flex-start">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div><div class="sp"></div><p class="cn big">{{name}}</p><p class="ti"><span class="en" style="margin-right:2cqw">Andy Wang</span>创始人 · 中美房地产商会</p></div>`
};
export default t;
