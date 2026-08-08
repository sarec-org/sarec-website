'use client';

/**
 * ShareButton — 文章分享(最小 Client Component)。
 * ------------------------------------------------------------------
 * - title / url 由服务端文章页作为 props 传入;url 为该文 canonical 绝对地址。
 * - 不读 window.location,不调用任何动态请求 API;url 再做一次防御性清洗(去 query/hash)。
 * - 三级降级:navigator.share → Clipboard API → 可选中链接 + 长按复制提示。
 * - 用户主动取消系统分享(AbortError)不视为失败:不复制、不报错。
 * - 微信内置浏览器:navigator.share「假可用」(能调起系统面板但选微信后闪退),
 *   故微信环境下不调 share、不调 Clipboard,直接切引导模式(点右上角 ··· 转发)。
 *   UA 检测只在点击事件里做(纯客户端),渲染保持纯净,不影响 SSG。
 */

import { useState } from 'react';
import styles from './ShareButton.module.css';

type Phase = 'idle' | 'copied' | 'manual' | 'wechat';

// 微信内置浏览器 UA 含 MicroMessenger(大小写不敏感)。仅客户端调用。
function isWeChat(): boolean {
  return typeof navigator !== 'undefined' && /micromessenger/i.test(navigator.userAgent);
}

export function ShareButton({ title, url }: { title: string; url: string }) {
  const [phase, setPhase] = useState<Phase>('idle');

  // 防御性清洗:以 canonical 为准,去掉任何 query/hash(props 本应已是干净绝对地址)。
  const shareUrl = url.split('#')[0].split('?')[0];

  async function handleShare() {
    // 0) 微信内置浏览器:share「假可用」会闪退。直接切引导模式,不调 share/Clipboard。
    if (isWeChat()) {
      setPhase('wechat');
      return;
    }

    // 1) 系统分享面板(移动端 / 微信内多可用)
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch (err) {
        // 用户取消 → 静默返回,不降级、不报错
        if (err instanceof Error && err.name === 'AbortError') return;
        // 其它错误 → 继续降级到剪贴板
      }
    }

    // 2) 剪贴板 API(桌面 / 不支持 share 的浏览器)
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setPhase('copied');
        window.setTimeout(() => setPhase('idle'), 2500);
        return;
      } catch {
        // 继续降级到手动复制
      }
    }

    // 3) 手动兜底:展示可选中链接 + 长按复制提示
    setPhase('manual');
  }

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.button} onClick={handleShare}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 .12 1L8.7 8.5a3 3 0 1 0 0 7l6.42 3.51A3 3 0 1 0 18 16a2.98 2.98 0 0 0-2.12.88L9.46 13.4a3 3 0 0 0 0-2.8l6.42-3.48A2.98 2.98 0 0 0 18 8Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
        <span>{phase === 'copied' ? '链接已复制' : '分享这篇文章'}</span>
      </button>

      {phase === 'manual' ? (
        <div className={styles.manual}>
          <p className={styles.manualHint}>请长按复制链接：</p>
          <span className={styles.manualUrl}>{shareUrl}</span>
        </div>
      ) : null}

      {phase === 'wechat' ? (
        <div className={styles.wechat} role="status">
          <p className={styles.wechatHint}>
            <svg
              className={styles.wechatArrow}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path d="M6 18L18 6M18 6H9M18 6v9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            请点击右上角 <span className={styles.wechatDots}>···</span> 按钮，选择“转发给朋友”或“分享到朋友圈”
          </p>
          <p className={styles.wechatAlt}>或长按复制链接：</p>
          <span className={styles.manualUrl}>{shareUrl}</span>
        </div>
      ) : null}
    </div>
  );
}
