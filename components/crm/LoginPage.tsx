'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoginBox } from './LoginBox';
import s from './crm.module.css';

export function LoginPage({ next, email }: { next: string; email: string }) {
  const router = useRouter();
  return (
    <div className={s.page}>
      <Link href="/zh" className={s.back}>‹ 返回首页</Link>
      <p className={s.eyebrow}>SIGN IN · 登录</p>
      <h1 className={s.h1}>登录 SAREC</h1>
      <p className={s.muted}>用邮箱收验证码即可，不需要密码。</p>
      <LoginBox initialEmail={email} onDone={() => { router.replace(next); router.refresh(); }} />
    </div>
  );
}
