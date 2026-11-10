import type { CardTemplate } from '../types';

/** 100 · 鎏金流光：第 100 款：黑底上两道流动的鎏金绸带，名字也是鎏金，做成压轴的一张 */
const t: CardTemplate = {
  id: 100,
  name: '鎏金流光',
  desc: '第 100 款：黑底上两道流动的鎏金绸带，名字也是鎏金，做成压轴的一张',
  cat: '商务精选',
  batch: 1,
  cls: 'd11',
  css: `
.d11{background:radial-gradient(at 30% 30%,#1B1B1F,#060607);--c:#fff;--a:#E3C57A;--s:#D6CFBD;--ic:#111;--lgc:#111}
.d11 .rbn{left:22%;top:0;width:78%;height:100%;filter:drop-shadow(0 0 2cqw rgba(227,197,122,.35))}
.d11 .n2 b{background:linear-gradient(180deg,#FFF3CF,#E3C57A 45%,#9A7632);-webkit-background-clip:text;background-clip:text;color:transparent;font-size:8cqw}
.d11 .tier{color:#111;background:#E3C57A;border-color:#E3C57A;position:relative;z-index:3}
.d11 .qr{box-shadow:0 0 0 .5cqw #111}
`,
  html: `<svg class="deco rbn" viewBox="0 0 170 100" preserveAspectRatio="none"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8D6B2B"/><stop offset=".3" stop-color="#F8E6B0"/><stop offset=".55" stop-color="#C39A4A"/><stop offset=".8" stop-color="#FFF3CF"/><stop offset="1" stop-color="#9A7632"/></linearGradient></defs><path d="M60 110C80 70 120 80 136 52S150 4 176 -6V14C158 22 154 44 144 62S100 86 86 110Z" fill="url(#g1)" opacity=".95"/><path d="M96 110C108 86 140 88 152 66S160 30 176 22V34C164 42 164 60 156 76S124 96 116 110Z" fill="url(#g1)" opacity=".55"/><path d="M40 110C64 60 112 74 130 46S142 0 170 -10" fill="none" stroke="#F6E2A6" stroke-width=".4" opacity=".7"/></svg><div class="in"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
