'use client';

import { FormEvent } from 'react';
import styles from './research.module.css';

/**
 * RC03 订阅简报 — 静态 form (不接后端)
 * 提交弹 alert 引导用户发邮件; 后端订阅功能 Phase 5 上线。
 */
export function SubscribeForm() {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.alert(
      '订阅功能即将上线,请发邮件至 info@sinoamericanrec.org 申请订阅。'
    );
  };

  return (
    <form className={styles.subscribeForm} onSubmit={handleSubmit} noValidate>
      <div className={styles.subscribeField}>
        <label className={styles.subscribeLabel} htmlFor="subscribe-email">
          01 / 邮箱 *
        </label>
        <input
          id="subscribe-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={styles.subscribeInput}
          placeholder="you@example.com"
        />
      </div>

      <div className={styles.subscribeField}>
        <label className={styles.subscribeLabel} htmlFor="subscribe-role">
          02 / 你的身份(选填)
        </label>
        <select
          id="subscribe-role"
          name="role"
          className={styles.subscribeSelect}
          defaultValue=""
        >
          <option value="" disabled>
            选择身份
          </option>
          <option value="us-chinese-investor">在美华人投资人</option>
          <option value="outbound-entrepreneur">出海企业家</option>
          <option value="china-real-estate">中国地产同行</option>
          <option value="us-developer">美国项目方</option>
          <option value="other">其他</option>
        </select>
      </div>

      <button type="submit" className={styles.subscribeSubmit}>
        订阅
      </button>

      <p className={styles.subscribeNote}>
        你的邮箱仅用于 SAREC 研究简报发送,不会用于其他用途。
      </p>
    </form>
  );
}
