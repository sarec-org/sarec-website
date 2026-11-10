import type { CardTemplate } from '../types';

/** 98 · 黑白对开：左半张黑、右半张白，中间夹一道红线，干脆利落的设计公司味道 */
const t: CardTemplate = {
  id: 98,
  name: '黑白对开',
  desc: '左半张黑、右半张白，中间夹一道红线，干脆利落的设计公司味道',
  cat: '商务精选',
  batch: 1,
  cls: 'd9',
  css: `
.d9{background:#fff;--c:#111;--a:#111;--s:#333}
.d9 .bk{left:0;top:0;bottom:0;width:40cqw;background:#111;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1cqw;color:#fff}
.d9 .bk i{width:12cqw;height:12cqw;border-radius:50%;background:#fff;color:#111;display:grid;place-items:center;font-style:normal;font-family:var(--en);font-weight:700;font-size:7cqw}
.d9 .bk b{font-size:3.4cqw;letter-spacing:.3em;margin-top:.8cqw}
.d9 .bk span{font-size:1.9cqw;letter-spacing:.24em;color:#BDBDBD;margin-bottom:2.4cqw}
.d9 .bk .qr{width:12.5cqw;height:12.5cqw}
.d9 .rl{left:40cqw;top:0;bottom:0;width:.8cqw;background:#E4002B}
.d9 .n2 span{color:#E4002B}
.d9 .tier{background:#111;color:#fff;border-color:#111}
/* 自己的公司名比设计稿里的 SAREC 长：允许换行、两侧留白 */
.d9 .bk b,.d9 .bk span{max-width:100%;padding:0 3cqw;box-sizing:border-box;text-align:center;line-height:1.4;letter-spacing:.12em}
`,
  html: `<div class="deco bk" data-fit>{{{markI}}}{{#company}}<b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}{{/company}}<div class="qr">{{{qrImg}}}</div></div><div class="deco rl"></div><div class="in" style="padding-left:46cqw"><div class="top"><span></span>{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div>{{#hasIc}}<div class="ic2 one">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}</div>`
};
export default t;
