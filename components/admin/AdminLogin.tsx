'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 最小 admin 登录:输入 token → POST /api/admin/login → 服务端写 httpOnly cookie → 刷新进入工作台。
// token 只在请求体里发送,绝不入 URL、不存 localStorage、不硬编码。
const wrap: React.CSSProperties = {
  maxWidth: 420,
  margin: '80px auto',
  padding: 24,
  color: '#e6e6e6',
  fontFamily: 'system-ui, sans-serif'
};
const box: React.CSSProperties = {
  background: '#12161c',
  border: '1px solid #2a323c',
  borderRadius: 8,
  padding: 20
};
const input: React.CSSProperties = {
  background: '#0b0e12',
  color: '#e6e6e6',
  border: '1px solid #33404d',
  borderRadius: 4,
  padding: '8px 10px',
  width: '100%',
  boxSizing: 'border-box'
};
const btn: React.CSSProperties = {
  background: '#c9a567',
  color: '#0b1a2b',
  border: 'none',
  borderRadius: 4,
  padding: '8px 16px',
  cursor: 'pointer',
  marginTop: 12
};

export function AdminLogin() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token })
      });
      if (res.ok) {
        setToken('');
        router.refresh();
      } else {
        setErr(res.status === 401 ? 'token 不正确' : `登录失败 (${res.status})`);
      }
    } catch {
      setErr('网络错误');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={wrap}>
      <h2 style={{ marginBottom: 4 }}>SAREC 会员运营工作台</h2>
      <p style={{ fontSize: 13, color: '#9aa', marginTop: 0 }}>内部工具 · 需管理员 token 登录</p>
      <form style={box} onSubmit={login}>
        <label style={{ fontSize: 13, color: '#9aa' }}>Admin token</label>
        <input
          style={{ ...input, marginTop: 6 }}
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ADMIN_ACTION_TOKEN"
          autoComplete="off"
        />
        <button style={{ ...btn, opacity: busy ? 0.6 : 1 }} type="submit" disabled={busy}>
          {busy ? '登录中…' : '登录'}
        </button>
        {err && <p style={{ color: '#e08a7c', fontSize: 13, marginBottom: 0 }}>{err}</p>}
      </form>
      <p style={{ fontSize: 12, color: '#667', marginTop: 12 }}>
        登录后写入 httpOnly session cookie(12 小时);token 不会出现在网址或前端代码里。
      </p>
    </div>
  );
}
