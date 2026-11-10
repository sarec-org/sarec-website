import type { CardTemplate } from '../types';

/** 5 · 中美登机牌：做成一张洛杉矶飞中国的登机牌，一看就知道你是做中美生意的 */
const t: CardTemplate = {
  id: 5,
  name: '中美登机牌',
  desc: '做成一张洛杉矶飞中国的登机牌，一看就知道你是做中美生意的',
  cat: '大胆款',
  batch: 2,
  cls: 'q5',
  css: `
.q5{background:#FDFCF8;--c:#0B2A6B;--a:#E4572E;--s:#3D4F7A}
.q5 .hb{left:0;right:0;top:0;height:8.4cqw;background:#0B2A6B}
.q5 .pf{left:73%;top:8.4cqw;bottom:0;border-left:.5cqw dashed #B8C2D6}
.q5 .bp{right:27%;padding:0 4cqw 4cqw 5.4cqw}
.q5 .bt{height:8.4cqw;display:flex;justify-content:space-between;align-items:center;color:#fff;font-size:2.2cqw;letter-spacing:.2em;font-weight:700}
.q5 .rt{display:flex;align-items:center;gap:4cqw;margin-top:3.4cqw!important}
.q5 .rt b{display:block;font-family:var(--num);font-weight:700;font-size:11cqw;line-height:1;letter-spacing:.04em}
.q5 .rt small{font-size:2.3cqw;letter-spacing:.3em;color:var(--s)}
.q5 .rt i{font-style:normal;font-size:6cqw;color:#E4572E}
.q5 .fl{display:grid;grid-template-columns:1.25fr 1fr;gap:2cqw 3cqw;margin-top:3cqw!important}
.q5 .fl small{display:block;font-size:1.7cqw;letter-spacing:.16em;color:#7A869F}
.q5 .fl b{font-size:2.8cqw;white-space:nowrap}
.q5 .fl2{font-family:var(--mono);font-size:2.1cqw;color:var(--s);white-space:nowrap}
.q5 .stub{left:73%;right:0;top:8.4cqw;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:4.4cqw 0 4cqw;box-sizing:border-box}
.q5 .stub .qr{width:17cqw;height:17cqw;border:1px solid #D5DBE6}
.q5 .bar{width:19cqw;height:8cqw;background:repeating-linear-gradient(90deg,#0B2A6B 0 .5cqw,transparent .5cqw 1.1cqw,#0B2A6B 1.1cqw 2cqw,transparent 2cqw 2.5cqw,#0B2A6B 2.5cqw 2.8cqw,transparent 2.8cqw 3.8cqw)}
`,
  html: `<div class="deco hb"></div><div class="deco pf"></div><div class="in bp"><div class="bt"><span>BUSINESS PASS</span><span>商务通行</span></div><div class="rt" data-nooverlap><div><b>LAX</b><small>洛杉矶</small></div><i>✈</i><div><b>CHN</b><small>中国</small></div></div><div class="fl"><div><small>姓名 NAME</small><b>{{nameFull}}</b></div>{{#tierName}}<div><small>级别 CLASS</small><b>SAREC {{tierName}}</b></div>{{/tierName}}{{#titleLine}}<div><small>职务 TITLE</small><b>{{titleLine}}</b></div>{{/titleLine}}{{#wechat}}<div><small>微信 WECHAT</small><b>{{wechat}}</b></div>{{/wechat}}</div><div class="sp"></div>{{#phoneMail}}<div class="fl2">{{phoneMail}}</div>{{/phoneMail}}</div><div class="deco stub"><div class="qr">{{{qrImg}}}</div><div class="bar"></div></div>`
};
export default t;
