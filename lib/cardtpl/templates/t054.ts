import type { CardTemplate } from '../types';

/** 54 · 色卡：上面一大块纯色、下面白色标签，像设计师手里的一张色卡 */
const t: CardTemplate = {
  id: 54,
  name: '色卡',
  desc: '上面一大块纯色、下面白色标签，像设计师手里的一张色卡',
  cat: '设计经典',
  batch: 2,
  cls: 'c10',
  css: `
.c10{background:#FFFFFF;--c:#111;--a:#0F4C81;--s:#333}
.c10 .chip{left:0;right:0;top:0;height:36cqw;background:#0F4C81;display:flex;justify-content:flex-end;align-items:flex-start;padding:4cqw;box-sizing:border-box}
.c10 .chip .qr{width:13cqw;height:13cqw}
.c10 .in{padding:0 5cqw 4cqw}
.c10 .h{font-weight:900;font-size:5.4cqw;letter-spacing:.02em;margin-top:2.6cqw!important;white-space:nowrap}
.c10 .h sup{font-size:2.4cqw}
.c10 .l{font-size:2.6cqw;margin-top:1.4cqw!important;white-space:nowrap}
.c10 .l2{font-size:2.2cqw;color:#555;margin-top:.8cqw!important;white-space:nowrap}
`,
  html: `<div class="deco chip"><div class="qr">{{{qrImg}}}</div></div><div class="in"><div class="sp" style="flex:0 0 37cqw!important"></div><p class="h">SAREC<sup>®</sup> 经典蓝</p><p class="l"><b>王东 Andy Wang</b>　创始人 · 中美房地产商会</p><p class="l2">949 787 8888　微信 逍遥　info@sinoamericanrec.org</p></div>`
};
export default t;
