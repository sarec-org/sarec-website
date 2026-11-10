import type { CardTemplate } from '../types';

/** 104 · 工程刻度：白底，左边一把比例尺的刻度，橙色标记点，建筑师、工程师、测量师的名片 */
const t: CardTemplate = {
  id: 104,
  name: '工程刻度',
  desc: '白底，左边一把比例尺的刻度，橙色标记点，建筑师、工程师、测量师的名片',
  cat: '商务精选',
  batch: 1,
  cls: 'd15',
  css: `
.d15{background:#fff;--c:#1B2430;--a:#F26B21;--s:#3F4A58}
.d15 .rl{left:0;top:0;bottom:0;width:6cqw;background:repeating-linear-gradient(180deg,#1B2430 0 .25cqw,transparent .25cqw 1.96cqw) 0 0/2.2cqw 100% no-repeat,repeating-linear-gradient(180deg,#1B2430 0 .3cqw,transparent .3cqw 9.8cqw) 0 0/4.4cqw 100% no-repeat,#F4F5F7;border-right:.3cqw solid #1B2430}
.d15 .rn{left:6.8cqw;top:-.8cqw;bottom:0;display:grid;grid-auto-rows:9.8cqw;font-family:var(--mono);font-size:1.7cqw;color:#7A8594}
.d15 .mk{left:4.2cqw;top:28.6cqw;width:0;height:0;border-top:1.2cqw solid transparent;border-bottom:1.2cqw solid transparent;border-left:2cqw solid #F26B21}
.d15 .lg span,.d15 .e2{font-family:var(--mono)}
.d15 .tier{background:#1B2430;color:#fff;border-color:#1B2430}
.d15 .qr{border:1px solid #D5DBE6;border-radius:0}
`,
  html: `<div class="deco rl"></div><div class="deco rn"><span>0</span><span>10</span><span>20</span><span>30</span><span>40</span><span>50</span></div><div class="deco mk"></div><div class="in" style="padding-left:13cqw"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
