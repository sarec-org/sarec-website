import type { CardTemplate } from '../types';

/** 64 · 购物小票：一张斜放的收银小票，上面一行行打着你的信息，俏皮、好记 */
const t: CardTemplate = {
  id: 64,
  name: '购物小票',
  desc: '一张斜放的收银小票，上面一行行打着你的信息，俏皮、好记',
  cat: '设计经典',
  batch: 2,
  cls: 'c20',
  css: `
.c20{background:#FFC53D;--c:#111;--a:#111;--s:#111}
.c20 .rc{left:7cqw;top:-3cqw;width:56cqw;bottom:-4cqw;background:#FFFEFA;transform:rotate(-4deg);box-shadow:0 1cqw 3cqw rgba(0,0,0,.25);padding:6cqw 4cqw;box-sizing:border-box;font-family:"Special Elite",var(--mono);font-size:2.3cqw;line-height:1.5;-webkit-mask:linear-gradient(#000,#000) 0 0/100% calc(100% - 1.6cqw) no-repeat,conic-gradient(from -45deg at 50% 0,#000 90deg,transparent 0) 0 100%/3.2cqw 1.6cqw repeat-x;mask:linear-gradient(#000,#000) 0 0/100% calc(100% - 1.6cqw) no-repeat,conic-gradient(from -45deg at 50% 0,#000 90deg,transparent 0) 0 100%/3.2cqw 1.6cqw repeat-x}
.c20 .rc p{margin:0;white-space:nowrap}
.c20 .rc .c{text-align:center;font-weight:700;font-family:var(--sans);font-size:2.6cqw}
.c20 .rc .s{font-family:"Special Elite",var(--mono);font-weight:400;font-size:2.1cqw;margin-bottom:1.4cqw}
.c20 .rc .r{display:flex;justify-content:space-between;gap:2cqw}
.c20 .rc .r b{font-weight:400}
.c20 .rc .dv{border-top:.3cqw dashed #111;margin:1.2cqw 0}
.c20 .rq{right:7cqw;top:50%;transform:translateY(-50%);display:grid;justify-items:center;gap:1.6cqw;font-size:2.2cqw;font-weight:700;letter-spacing:.14em}
.c20 .rq .qr{width:19cqw;height:19cqw;border:.6cqw solid #111;border-radius:0;box-shadow:1.2cqw 1.2cqw 0 #111}
`,
  html: `<div class="deco rc"><p class="c">SAREC 中美房地产商会</p><p class="c s">* * * 名片 CARD * * *</p><p class="r"><span>姓名</span><b>王东 Andy Wang</b></p><p class="r"><span>职务</span><b>创始人</b></p><p class="r"><span>级别</span><b>副会长</b></p><p class="dv"></p><p class="r"><span>电话</span><b>949 787 8888</b></p><p class="r"><span>微信</span><b>逍遥</b></p><p class="r"><span>邮箱</span><b>info@sinoamericanrec.org</b></p><p class="dv"></p><p class="c">谢谢惠顾 · 合作愉快</p></div><div class="deco rq"><div class="qr">{{{qrImg}}}</div><span>扫码存名片</span></div>`
};
export default t;
