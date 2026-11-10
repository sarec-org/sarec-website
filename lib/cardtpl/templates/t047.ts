import type { CardTemplate } from '../types';

/** 47 · 国际主义留白：全白、左上角一小块无衬线小字，其余全空着，瑞士设计的经典 */
const t: CardTemplate = {
  id: 47,
  name: '国际主义留白',
  desc: '全白、左上角一小块无衬线小字，其余全空着，瑞士设计的经典',
  cat: '设计经典',
  batch: 2,
  cls: 'c3',
  css: `
.c3{background:#FFFFFF;--c:#111;--a:#E4002B;--s:#111}
.c3 .b{font-size:2.5cqw;line-height:1.5;white-space:nowrap}
.c3 .b b{font-weight:700}
.c3 .rd{font-weight:900;font-size:3cqw;letter-spacing:.06em;color:#E4002B}
.c3 .qr{width:11cqw;height:11cqw;padding:0}
`,
  html: `<div class="in"><p class="b"><b>王东 Andy Wang</b><br>创始人<br>SAREC 中美房地产商会</p><p class="b" style="margin-top:3.4cqw!important">949 787 8888<br>微信 逍遥<br>info@sinoamericanrec.org</p><div class="sp"></div><div class="bot"><span class="rd">SAREC</span><div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
