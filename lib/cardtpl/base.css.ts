/** 设计稿公共样式（卡面骨架、文字块、联系方式、二维码框），由设计稿原样导入；各模板自己的样式在 templates/ */
export const BASE_CSS = `
:root{--bg:#EEF1F4;--fg:#13202F;--muted:#5B6B7F;--line:#D5DBE3;
  --serif:"Noto Serif SC","Songti SC",serif;--en:"Playfair Display",Georgia,serif;--num:"Oswald","Noto Sans SC",sans-serif;--sans:"Noto Sans SC","PingFang SC",sans-serif;--mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;--brush:"Ma Shan Zheng","Kaiti SC","STKaiti",serif}
.card{aspect-ratio:1.7/1;max-width:100%;border-radius:12px;position:relative;overflow:hidden;box-shadow:0 14px 38px rgba(10,20,40,.2);container-type:inline-size;font-family:var(--sans);color:var(--c)}
.deco{position:absolute;pointer-events:none;z-index:1}
.in{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;padding:6cqw 6.5cqw;box-sizing:border-box}
.in>*{margin:0;flex:none}
.card p{margin:0}
.sp{flex:1 1 0!important}
.top{display:flex;justify-content:space-between;align-items:center;font-size:2.3cqw;letter-spacing:.22em;color:var(--a)}
.tier{letter-spacing:.16em;padding:.7cqw 2cqw;border:1px solid currentColor;border-radius:99px;font-size:2.1cqw;white-space:nowrap}
.cn{font-family:var(--serif);font-weight:900;font-size:8.2cqw;letter-spacing:.2em;line-height:1.1;white-space:nowrap}
.cn.big{font-size:12cqw;letter-spacing:.06em}
.en{font-family:var(--en);font-weight:500;font-size:4cqw;letter-spacing:.04em;line-height:1;margin-top:1.6cqw!important;white-space:nowrap;color:var(--a)}
.ti{font-size:2.6cqw;letter-spacing:.08em;margin-top:1.8cqw!important;white-space:nowrap;color:var(--s)}
.ti .en{font-size:3.4cqw;margin:0 2cqw 0 0!important}
.rule{width:10cqw;height:.4cqw;background:var(--a);margin-top:2.6cqw!important}
.bot{display:flex;justify-content:space-between;align-items:flex-end}
.ct{display:grid;gap:1.1cqw;font-size:2.4cqw;letter-spacing:.03em;color:var(--s)}
.ct div{display:flex;gap:1.8cqw;align-items:baseline;white-space:nowrap}
.ct i{font-style:normal;font-size:1.8cqw;letter-spacing:.16em;width:5.2cqw;color:var(--a)}
.qr{width:14.5cqw;height:14.5cqw;background:#fff;padding:.9cqw;border-radius:1cqw;box-sizing:border-box;flex:none}
.qr canvas{display:block;width:100%;height:100%}
.ctr{align-items:center;text-align:center}
.ctr .top{justify-content:center;width:100%}
.ctr .bot{width:100%;text-align:left}
.ctr .rule{margin-left:auto;margin-right:auto}
.side{left:0;top:0;bottom:0;width:34%;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:7cqw 0 6cqw;box-sizing:border-box;z-index:2}
.side b{width:17cqw;height:17cqw;border-radius:50%;display:grid;place-items:center;font-family:var(--en);font-weight:700;font-size:9.6cqw}
.side .qr{width:14cqw;height:14cqw}
.spl{left:34%;padding-left:6cqw}
.lg{display:flex;align-items:center;gap:1.8cqw;letter-spacing:0}
.lg i{width:7.6cqw;height:7.6cqw;border-radius:50%;display:grid;place-items:center;font-family:var(--en);font-weight:700;font-size:4.4cqw;background:var(--a);color:var(--lgc,#fff);font-style:normal;flex:none}
.lg b{display:block;font-size:3.1cqw;letter-spacing:.06em;line-height:1.2;color:var(--c);white-space:nowrap}
.lg span{display:block;font-size:1.6cqw;letter-spacing:.04em;color:var(--s);white-space:nowrap}
.n2{display:flex;align-items:baseline;gap:2.4cqw;white-space:nowrap}
.n2 b{font-size:7cqw;font-weight:900;letter-spacing:.12em;font-family:var(--sans);line-height:1.1}
.n2 span{font-size:2.6cqw;color:var(--a);font-weight:700;letter-spacing:.1em}
.e2{font-size:2.4cqw;color:var(--s);letter-spacing:.08em;margin-top:1cqw!important;white-space:nowrap}
.ic2{display:grid;grid-template-columns:auto auto;gap:1.2cqw 3cqw;font-size:2.15cqw;color:var(--s);justify-content:start}
.ic2.one{grid-template-columns:auto}
.ic2 div{display:flex;align-items:center;gap:1.4cqw;white-space:nowrap}
.ic2 .w{grid-column:1/-1}
.ic2 i{font-style:normal;width:3.2cqw;height:3.2cqw;border-radius:50%;background:var(--a);color:var(--ic,#fff);display:grid;place-items:center;font-size:1.75cqw;font-weight:700;flex:none}
.seal{width:10cqw;height:10cqw;border-radius:50%;background:radial-gradient(circle at 35% 30%,#F8E6B0,#C39A4A 60%,#8D6B2B);display:grid;place-items:center;font-family:var(--en);font-weight:700;font-size:5.4cqw;color:#2A2110;letter-spacing:0}
.k19{background:#fff;--c:#111;--a:#111;--s:#444}
.k19 .blk{left:0;right:0;top:0;height:50%;background:#111}
.k19 .ti{color:#C9C9C9!important}
.k19 .top,.k19 .cn,.k19 .en{color:#fff!important}
.k19 .cn{font-family:var(--sans)!important;font-weight:900}
.k20{background:linear-gradient(180deg,#FFB347 0%,#FF5E8A 45%,#6A3DE8 100%);--c:#fff;--a:#fff;--s:rgba(255,255,255,.92)}
.k20 .tier{background:rgba(255,255,255,.25);border-color:transparent}
.k20 .qr{border-radius:4cqw}
.k25{background:radial-gradient(at 50% 30%,#12523F,#08271E);--c:#F3E7C4;--a:#E3C57A;--s:#CFC6A6}
.k25 .fr{inset:4cqw;border:1px solid rgba(227,197,122,.8)}
.k25 .f{left:50%;top:-36cqw;width:72cqw;height:72cqw;transform:translateX(-50%);border-radius:50%;background:repeating-conic-gradient(rgba(227,197,122,.5) 0 2deg,transparent 2deg 8deg);-webkit-mask:radial-gradient(circle,transparent 0 30%,#000 31% 69%,transparent 70%);mask:radial-gradient(circle,transparent 0 30%,#000 31% 69%,transparent 70%)}
.k25 .in{padding-top:34cqw;padding-bottom:9cqw}
.k25 .top{display:none}
.k25 .cn{font-size:15cqw}
.k25 .qr{width:22cqw;height:22cqw}
.k25 .vq{margin-top:4cqw!important}
.k25 .tier{margin-bottom:4cqw!important}
`;
