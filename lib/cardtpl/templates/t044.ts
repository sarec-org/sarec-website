import type { CardTemplate } from '../types';

/** 44 · 活力橙：亮橙底、白色大字、圆角白标签，一眼就醒目 */
const t: CardTemplate = {
  id: 44,
  name: '活力橙',
  desc: '亮橙底、白色大字、圆角白标签，一眼就醒目',
  cat: '第一批',
  batch: 2,
  cls: 'k24',
  css: `
.k24{background:#FF6B2C;--c:#fff;--a:#1B1F5E;--s:#FFF0E6}
.k24 .o1{right:-14cqw;top:-20cqw;width:60cqw;height:60cqw;border-radius:50%;background:rgba(255,255,255,.14)}
.k24 .o2{right:6cqw;top:-2cqw;width:30cqw;height:30cqw;border-radius:50%;background:rgba(255,255,255,.14)}
.k24 .cn{font-family:var(--sans)!important;font-weight:900}
.k24 .en{color:#1B1F5E!important}
.k24 .ct{background:#fff;color:#1B1F5E;padding:2.4cqw 3.4cqw;border-radius:2.4cqw}
.k24 .ct i{color:#FF6B2C!important}
.k24 .tier{background:#1B1F5E;color:#fff;border-color:#1B1F5E}
.k24 .qr{border-radius:2.4cqw}
`,
  html: `<div class="deco o1"></div><div class="deco o2"></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
