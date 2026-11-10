import type { CardTemplate } from '../types';

/** 81 · 头像蓝条：名片全能王那种电子名片：顶上一条蓝，圆形头像压在上面，下面姓名、公司和联系方式 */
const t: CardTemplate = {
  id: 81,
  name: '头像蓝条',
  desc: '名片全能王那种电子名片：顶上一条蓝，圆形头像压在上面，下面姓名、公司和联系方式',
  cat: '商务经典',
  batch: 1,
  cls: 'b15',
  css: `
.b15{background:#F5F7FA;--c:#15233B;--a:#1E6FE0;--s:#44536B}
.b15 .hb{left:0;right:0;top:0;height:18cqw;background:linear-gradient(90deg,#1558C0,#2A86F0)}
.b15 .av{left:6.5cqw;top:7cqw;width:20cqw;height:20cqw;border-radius:50%;overflow:hidden;border:.8cqw solid #fff;box-shadow:0 .6cqw 1.6cqw rgba(0,0,0,.2)}
.b15 .av svg{display:block;width:100%;height:100%}
.b15 .tier{background:rgba(255,255,255,.22);color:#fff;border-color:transparent}
.b15 .qr{border:1px solid #DCE2EC}
`,
  html: `<div class="deco hb"></div><div class="deco av"><svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#8FA3BF"/><circle cx="50" cy="40" r="18" fill="#E6ECF4"/><path d="M14 100c0-22 16-34 36-34s36 12 36 34z" fill="#E6ECF4"/></svg></div><div class="in"><div class="top"><span class="org" style="color:#fff;margin-left:26cqw">SAREC 中美房地产商会</span>{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp" style="flex:0 0 9cqw!important"></div><div style="padding-left:26cqw"><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}</div><div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
