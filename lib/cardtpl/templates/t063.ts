import type { CardTemplate } from '../types';

/** 63 · 借书卡：老图书馆书后面那张借书卡：牛皮色卡纸、打字机字体、一格一格的横线 */
const t: CardTemplate = {
  id: 63,
  name: '借书卡',
  desc: '老图书馆书后面那张借书卡：牛皮色卡纸、打字机字体、一格一格的横线',
  cat: '设计经典',
  batch: 2,
  cls: 'c19',
  css: `
.c19{background:#EFE1B9;--c:#2B2416;--a:#9C2B1E;--s:#2B2416}
.c19 .hl{left:0;right:0;top:11.4cqw;height:.5cqw;background:#9C2B1E;box-shadow:0 1cqw 0 rgba(156,43,30,.5)}
.c19 .lib{padding:4.4cqw 6cqw 4cqw;font-family:"Special Elite",var(--mono)}
.c19 .h{font-size:2.8cqw;letter-spacing:.16em;white-space:nowrap;font-family:var(--serif);font-weight:900;margin-bottom:5.4cqw!important}
.c19 .rw{display:grid;grid-template-columns:11cqw 1fr;border-bottom:1px solid rgba(43,36,22,.55);padding:1.75cqw 0 1cqw;font-size:2.9cqw;white-space:nowrap;margin-right:22cqw}
.c19 .rw b{font-family:var(--sans);font-weight:500;font-size:2.1cqw;letter-spacing:.2em;color:#6B5A3A;border-right:1px solid rgba(43,36,22,.55);margin-right:2.4cqw;align-self:stretch;display:flex;align-items:center}
.c19 .stp{right:5cqw;top:15cqw;border:.6cqw solid #9C2B1E;color:#9C2B1E;padding:1cqw 2.4cqw;font-family:var(--num);font-weight:700;font-size:2.6cqw;line-height:1.3;letter-spacing:.16em;text-align:center;transform:rotate(-9deg);opacity:.8;z-index:3}
.c19 .lq{right:5.4cqw;bottom:5cqw;z-index:3}
.c19 .lq .qr{background:transparent;mix-blend-mode:multiply;width:14cqw;height:14cqw}
`,
  html: `<div class="deco hl"></div>{{#tier}}<div class="deco stp">MEMBER<br>{{tierName}}</div>{{/tier}}<div class="in lib"><p class="h">{{#company}}{{company}} · {{/company}}名片</p><div class="rw"><b>姓名</b><span>{{name}}{{#nameEn}} {{nameEn}}{{/nameEn}}</span></div>{{#titleTier}}<div class="rw"><b>职务</b><span>{{titleTier}}</span></div>{{/titleTier}}{{#phone}}<div class="rw"><b>电话</b><span>{{phone}}</span></div>{{/phone}}{{#wechat}}<div class="rw"><b>微信</b><span>{{wechat}}</span></div>{{/wechat}}{{#email}}<div class="rw"><b>邮箱</b><span>{{email}}</span></div>{{/email}}{{#website}}<div class="rw"><b>网址</b><span>{{website}}</span></div>{{/website}}</div><div class="deco lq"><div class="qr">{{{qrImg}}}</div></div>`
};
export default t;
