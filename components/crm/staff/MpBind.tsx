'use client';
import Link from 'next/link';
import { useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { api } from '@/components/crm/client';

/** 后台综合优化：从后台首页挪出来（三.5：绑定码挪到「设置与团队」，由子任务 A 挂上） */
/**
 * 1.3 N / 1.4.0（改动单 A5、B2）：在小程序里用手机工作台——给“自己”的手机生成一次性绑定码，用自己的微信扫一下。
 * 放在问候语下面；给同事开通去「团队」页每人一行「出码」。
 */
export function MpBind({ admin }: { admin: boolean }) {
  const [b, setB] = useState<{ code: string; qr: string | null; expiresAt: string } | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className={styles.card}>
      <p className={styles.cardTitle}>在手机上管：小程序工作台</p>
      <p className={styles.small} style={{ marginTop: 0 }}>
        用您自己的微信扫一下下面的码，就能在商会小程序「我的」里打开工作台：拍照传相册、看实时报名签到、现场代签到、待办和筹备清单。收款和会费只在这个网站后台看。
      </p>
      <p className={styles.small}>
        <strong>这个码是给您自己的手机用的；</strong>给同事开通请去{admin ? <Link href="/zh/staff/team" style={{ color: 'var(--gold)' }}>「团队」</Link> : '「团队」（请管理员操作）'}。
      </p>
      {!b && (
        <button
          className={styles.btn}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setErr('');
            const r = await api<{ code: string; qr: string | null; expiresAt: string }>('/api/v1/staff/mp-bind', { body: {} });
            setBusy(false);
            if (r.ok) setB(r.data);
            else setErr(r.message);
          }}
        >
          {busy ? '生成中…' : '生成我的绑定码'}
        </button>
      )}
      {err && <p className={styles.error}>{err}</p>}
      {b && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {b.qr ? <img src={b.qr} alt="我的工作台绑定码" className={styles.qrImg} style={{ width: 200 }} /> : null}
          <p className={b.qr ? styles.small : styles.notice}>
            {b.qr ? '扫不了的：' : '小程序码这会儿生成不了。请'}打开小程序「我的」→「工作人员绑定码」（旧版小程序在「我的 → 设置」里），输入 8 位码：
            <b className={styles.mono} style={{ fontSize: '1.3rem', letterSpacing: 3, marginLeft: 6 }}>{b.code}</b>
          </p>
          <p className={styles.small}>10 分钟内有效，只能用一次。过期了再点一次生成。</p>
          <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setB(null)}>重新生成</button>
        </>
      )}
    </div>
  );
}

