import type { CardTemplate } from '../types';

/** 59 · 卡片层叠：彩色头部、白色信息卡、一颗悬浮的圆按钮，安卓系统那套卡片设计 */
const t: CardTemplate = {
  id: 59,
  name: '卡片层叠',
  desc: '彩色头部、白色信息卡、一颗悬浮的圆按钮，安卓系统那套卡片设计',
  cat: '设计经典',
  batch: 2,
  cls: 'c15',
  css: `
.c15{background:#ECEFF1;--c:#fff;--a:#fff;--s:#37474F}
.c15 .hd{left:0;right:0;top:0;height:27cqw;background:#00897B;box-shadow:0 .6cqw 1.6cqw rgba(0,0,0,.3)}
.c15 .sh{left:4cqw;right:4cqw;top:31cqw;bottom:3.4cqw;background:#fff;border-radius:1cqw;box-shadow:0 .4cqw 1.2cqw rgba(0,0,0,.2)}
.c15 .fab{right:22cqw;top:21cqw;width:12cqw;height:12cqw;border-radius:50%;background:#FF4081;color:#fff;display:grid;place-items:center;font-family:var(--en);font-weight:700;font-size:6cqw;box-shadow:0 1cqw 2cqw rgba(0,0,0,.35);z-index:3}
.c15 .cn{font-family:var(--sans)!important;font-weight:700;font-size:6.6cqw;letter-spacing:.1em}
.c15 .tier{background:rgba(255,255,255,.2);border-color:transparent}
.c15 .ls3{display:grid;gap:1.3cqw;font-size:2.4cqw;color:#37474F;padding-left:3cqw;padding-bottom:1cqw}
.c15 .ls3 div{display:flex;align-items:center;gap:2cqw;white-space:nowrap}
.c15 .ls3 i{font-style:normal;width:4cqw;height:4cqw;border-radius:50%;background:#E0F2F1;color:#00897B;display:grid;place-items:center;font-size:2.1cqw;font-weight:700}
.c15 .qr{margin:0 3cqw 1cqw 0;width:13cqw;height:13cqw;border:1px solid #ECEFF1}
`,
  html: `<div class="deco hd"></div><div class="deco sh"></div><div class="deco fab">S</div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp" style="flex:0 0 3.4cqw!important"></div><p class="cn">{{name}}</p><p class="ti" style="color:#E0F2F1">创始人 · 中美房地产商会</p><div class="sp"></div><div class="bot"><div class="ls3"><div><i>☎</i>949 787 8888</div><div><i>微</i>逍遥</div><div><i>@</i>info@sinoamericanrec.org</div></div><div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
