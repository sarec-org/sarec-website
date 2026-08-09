/**
 * ViewportLockScript — 修法 A 的锁定脚本(仅文章详情页挂载)。
 * ------------------------------------------------------------------
 * 真机实测:微信/iOS WKWebView 中 svh 等同 vh(随地址栏伸缩变化,Δ≈vh),
 * 故 svh 兜底在微信内无效——视口高元素滚动时反复变尺寸,造成半屏级上下弹跳。
 *
 * 本内联脚本在 HTML 解析阶段(视口高元素绘制前)把 window.innerHeight/100 一次性
 * 写入根节点 CSS 变量 --locked-vh,此后**只在 orientationchange 重锁**,不随
 * resize/scroll 更新 → 视口高元素高度恒定 → 地址栏伸缩不再引起弹跳。
 *
 * 消费方 CSS 写法:height: calc(var(--locked-vh, 1svh) * N);
 *   - --locked-vh 未就绪 / 旧浏览器 → 回落 1svh(即现状,不劣化);
 *   - 桌面无动态工具栏 → --locked-vh = innerHeight/100 = 1vh → 与 Nvh 逐像素相同,零变化。
 *
 * 纯静态内联脚本:HTML 仍是 SSG 预渲染,不引入任何动态请求 API。
 */
const LOCK_SCRIPT =
  "(function(){function l(){try{document.documentElement.style.setProperty('--locked-vh',(window.innerHeight/100)+'px');}catch(e){}}l();window.addEventListener('orientationchange',function(){setTimeout(l,120);});})();";

export function ViewportLockScript() {
  return <script dangerouslySetInnerHTML={{ __html: LOCK_SCRIPT }} />;
}
