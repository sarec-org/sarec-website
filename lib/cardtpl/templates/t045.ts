import type { CardTemplate } from '../types';

/** 45 · 骨白凸版：米白厚纸、居中小号衬线字、电话在左上角，华尔街老派名片的标准样子 */
const t: CardTemplate = {
  id: 45,
  name: '骨白凸版',
  desc: '米白厚纸、居中小号衬线字、电话在左上角，华尔街老派名片的标准样子',
  cat: '设计经典',
  batch: 2,
  cls: 'c1',
  css: `
.c1{background:#F0EBDD;--c:#26241F;--a:#26241F;--s:#4A473F}
.c1 .tex{inset:0;background:radial-gradient(rgba(0,0,0,.04) .5px,transparent 1px) 0 0/1cqw 1cqw}
.c1 .top{font-family:var(--en);font-size:2.3cqw;letter-spacing:.14em;color:#26241F}
.c1 .nm{text-align:center;font-family:var(--serif);font-weight:600;font-size:4.6cqw;letter-spacing:.34em;white-space:nowrap;text-shadow:0 .12cqw 0 rgba(255,255,255,.8)}
.c1 .tt{text-align:center;font-size:2.2cqw;letter-spacing:.5em;margin-top:2cqw!important;color:#4A473F}
.c1 .ad{margin:0;font-family:var(--en);font-size:2.3cqw;letter-spacing:.1em;color:#4A473F;white-space:nowrap}
.c1 .qr{width:10cqw;height:10cqw;background:transparent;padding:0;mix-blend-mode:multiply}
`,
  html: `<div class="deco tex"></div><div class="in"><div class="top"><span>949 787 8888</span><span>SAREC 中美房地产商会</span></div><div class="sp"></div><p class="nm">王 东　ANDY WANG</p><p class="tt">创 始 人</p><div class="sp"></div><div class="bot"><p class="ad">微信 逍遥　·　info@sinoamericanrec.org</p><div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
