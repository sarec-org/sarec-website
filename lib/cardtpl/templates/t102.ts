import type { CardTemplate } from '../types';

/** 102 · 中英对照：左半边中文、右半边英文，中间徽标压在分界线上，做中美两边生意的人最实用 */
const t: CardTemplate = {
  id: 102,
  name: '中英对照',
  desc: '左半边中文、右半边英文，中间徽标压在分界线上，做中美两边生意的人最实用',
  cat: '商务精选',
  batch: 1,
  cls: 'd13',
  css: `
.d13{background:#fff;--c:#0F2347;--a:#B08A3C;--s:#3D4D6E}
.d13 .md{left:50%;top:5cqw;height:33cqw;width:1px;background:#B08A3C}
.d13 .sl{left:50%;top:15cqw;transform:translateX(-50%);width:9cqw;height:9cqw;border-radius:50%;background:#0F2347;color:#F1DDA6;display:grid;place-items:center;font-family:var(--en);font-weight:700;font-size:5cqw;box-shadow:0 0 0 .8cqw #fff,0 0 0 1cqw #B08A3C;z-index:3}
.d13 .bi{flex-direction:row;padding:6cqw 6.5cqw 0;gap:13cqw;bottom:auto;height:40cqw}
.d13 .hf{flex:1 1 0!important;display:flex;flex-direction:column;justify-content:center;text-align:right;min-width:0}
.d13 .hf.r{text-align:left}
.d13 .o1{font-size:1.75cqw;letter-spacing:.08em;color:#B08A3C;white-space:nowrap}
.d13 .n1{font-family:var(--serif);font-weight:900;font-size:8cqw;letter-spacing:.14em;line-height:1.2;margin-top:1.6cqw;white-space:nowrap}
.d13 .n1.e{font-family:var(--en);font-weight:700;font-size:5.6cqw;letter-spacing:.02em;line-height:1.5}
.d13 .t1{font-size:2.4cqw;margin-top:.8cqw;white-space:nowrap}
.d13 .a1{font-size:2cqw;color:#7A869F;margin-top:1cqw;white-space:nowrap}
.d13 .ft{left:0;right:0;bottom:0;height:16cqw;background:#0F2347;display:flex;justify-content:space-between;align-items:center;padding:0 6.5cqw;box-sizing:border-box;z-index:2}
.d13 .rowx{grid-template-columns:auto auto auto;color:#E6ECF7;--ic:#0F2347}
.d13 .rowx i{background:#D9B46A}
.d13 .ft .qr{width:11.6cqw;height:11.6cqw}
`,
  html: `<div class="deco md"></div><div class="deco sl">S</div><div class="in bi"><div class="hf"><p class="o1">中美房地产商会</p><p class="n1">王东</p><p class="t1">创始人　·　副会长</p><p class="a1">美国加州洛杉矶</p></div><div class="hf r"><p class="o1">Sino-American Real Estate Chamber</p><p class="n1 e">Andy Wang</p><p class="t1">Founder · Vice President</p><p class="a1">Los Angeles, California</p></div></div><div class="deco ft"><div class="ic2 rowx"><div><i>手</i>949 787 8888</div><div><i>微</i>逍遥</div><div><i>邮</i>info@sinoamericanrec.org</div></div><div class="qr">{{{qrImg}}}</div></div>`
};
export default t;
