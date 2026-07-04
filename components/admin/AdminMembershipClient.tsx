'use client';

import { useEffect, useState } from 'react';

// 极简内部管理工具（M6）。token 只存 sessionStorage + 内存，绝不入 URL、不硬编码。
type AppRow = {
  id: string;
  application_type: string;
  selected_tier_slug: string | null;
  payment_plan: string | null;
  company_name: string | null;
  contact_name: string | null;
  email: string;
  payment_status: string;
  application_status: string;
  display_status: string;
  membership_start_date: string | null;
  membership_end_date: string | null;
  second_payment_due_date: string | null;
  second_payment_due_date_source: string | null;
};

const box: React.CSSProperties = {
  background: '#12161c',
  border: '1px solid #2a323c',
  borderRadius: 8,
  padding: 16,
  margin: '12px 0'
};
const input: React.CSSProperties = {
  background: '#0b0e12',
  color: '#e6e6e6',
  border: '1px solid #33404d',
  borderRadius: 4,
  padding: '6px 8px',
  margin: '2px 6px 2px 0'
};
const btn: React.CSSProperties = {
  background: '#c9a567',
  color: '#0b1a2b',
  border: 'none',
  borderRadius: 4,
  padding: '6px 12px',
  cursor: 'pointer',
  margin: '2px 6px 2px 0'
};

export function AdminMembershipClient() {
  const [token, setToken] = useState('');
  const [apps, setApps] = useState<AppRow[]>([]);
  const [selected, setSelected] = useState<AppRow | null>(null);
  const [log, setLog] = useState<string>('');

  // form fields
  const [adminId, setAdminId] = useState('');
  const [note, setNote] = useState('');
  const [provider, setProvider] = useState('offline');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [secondDue, setSecondDue] = useState('');
  const [displayStatus, setDisplayStatus] = useState('published');

  useEffect(() => {
    const t = typeof window !== 'undefined' ? sessionStorage.getItem('sarec_admin_token') : null;
    if (t) setToken(t);
  }, []);

  function saveToken(v: string) {
    setToken(v);
    if (typeof window !== 'undefined') sessionStorage.setItem('sarec_admin_token', v);
  }

  async function post(payload: Record<string, unknown>) {
    try {
      const res = await fetch('/api/admin/membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      setLog(`[${res.status}] ${JSON.stringify(data)}`);
      return { status: res.status, data };
    } catch (e) {
      setLog(`network error: ${e instanceof Error ? e.message : 'unknown'}`);
      return { status: 0, data: {} };
    }
  }

  async function loadApps() {
    const { data } = await post({ action: 'list' });
    if (data && Array.isArray((data as { applications?: AppRow[] }).applications)) {
      setApps((data as { applications: AppRow[] }).applications);
    }
  }

  function base() {
    return { applicationId: selected?.id, adminIdentifier: adminId || null, adminNote: note || null };
  }

  async function act(payload: Record<string, unknown>) {
    if (!selected) {
      setLog('select an application first');
      return;
    }
    await post(payload);
    await loadApps();
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24, color: '#e6e6e6', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ ...box, borderColor: '#8a6d3b', background: '#241d0f' }}>
        <strong>⚠️ Internal admin tool — SAREC membership.</strong> 仅供内部本地 / Preview 使用。
        操作需管理员 token（通过 Authorization 头发送，不入 URL、不硬编码）。请勿分享此页链接或 token。
      </div>

      <div style={box}>
        <label>Admin token: </label>
        <input
          style={{ ...input, width: 320 }}
          type="password"
          value={token}
          onChange={(e) => saveToken(e.target.value)}
          placeholder="ADMIN_ACTION_TOKEN"
          autoComplete="off"
        />
        <button style={btn} onClick={loadApps}>
          Load applications
        </button>
        <span style={{ marginLeft: 12, fontSize: 13, color: '#9aa' }}>
          token 存 sessionStorage，随标签页关闭清除。
        </span>
      </div>

      <div style={box}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#9aa' }}>
              <th>company</th>
              <th>type/tier</th>
              <th>plan</th>
              <th>pay</th>
              <th>app</th>
              <th>display</th>
              <th>2nd due</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.id} style={{ borderTop: '1px solid #222', background: selected?.id === a.id ? '#1c2530' : undefined }}>
                <td>{a.company_name || a.contact_name || a.email}</td>
                <td>{a.application_type}/{a.selected_tier_slug}</td>
                <td>{a.payment_plan}</td>
                <td>{a.payment_status}</td>
                <td>{a.application_status}</td>
                <td>{a.display_status}</td>
                <td>{a.second_payment_due_date || '-'}{a.second_payment_due_date_source ? ` (${a.second_payment_due_date_source})` : ''}</td>
                <td>
                  <button style={{ ...btn, padding: '2px 8px' }} onClick={() => setSelected(a)}>
                    select
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {apps.length === 0 && <p style={{ color: '#9aa' }}>No applications loaded. Enter token and click Load.</p>}
      </div>

      {selected && (
        <div style={box}>
          <h3 style={{ marginTop: 0 }}>Selected: {selected.company_name || selected.email}</h3>
          <p style={{ fontSize: 12, color: '#9aa' }}>id: {selected.id}</p>

          <div style={{ margin: '8px 0' }}>
            <input style={input} value={adminId} onChange={(e) => setAdminId(e.target.value)} placeholder="adminIdentifier" />
            <input style={{ ...input, width: 260 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="adminNote" />
          </div>

          <div style={{ margin: '8px 0' }}>
            <strong>Mark first payment paid (offline): </strong>
            <select style={input} value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="offline">offline</option>
              <option value="zelle">zelle</option>
              <option value="check">check</option>
              <option value="bank_transfer">bank_transfer</option>
            </select>
            <input style={{ ...input, width: 110 }} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="amountCents" />
            <input style={{ ...input, width: 140 }} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="reference" />
            <button style={btn} onClick={() => act({ action: 'mark_payment_paid', ...base(), paymentProvider: provider, amountCents: amount, offlinePaymentReference: reference || null })}>
              mark paid
            </button>
          </div>

          <div style={{ margin: '8px 0' }}>
            <strong>Second payment due date: </strong>
            <input style={input} value={secondDue} onChange={(e) => setSecondDue(e.target.value)} placeholder="YYYY-MM-DD" />
            <button style={btn} onClick={() => act({ action: 'update_second_payment_due_date', ...base(), secondPaymentDueDate: secondDue })}>
              set (manual_override)
            </button>
            <button style={btn} onClick={() => act({ action: 'mark_second_payment_paid', ...base(), paymentProvider: provider, amountCents: amount, offlinePaymentReference: reference || null })}>
              mark 2nd paid
            </button>
          </div>

          <div style={{ margin: '8px 0' }}>
            <strong>Review: </strong>
            <button style={btn} onClick={() => act({ action: 'review_application', ...base(), decision: 'approve' })}>
              approve
            </button>
            <button style={{ ...btn, background: '#b06a5c', color: '#fff' }} onClick={() => act({ action: 'review_application', ...base(), decision: 'reject' })}>
              reject
            </button>
          </div>

          <div style={{ margin: '8px 0' }}>
            <strong>Display status: </strong>
            <select style={input} value={displayStatus} onChange={(e) => setDisplayStatus(e.target.value)}>
              {['pending_review', 'approved', 'published', 'hidden', 'rejected'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button style={btn} onClick={() => act({ action: 'update_display_status', ...base(), displayStatus, displayOnWebsite: displayStatus === 'published' })}>
              update display
            </button>
          </div>
        </div>
      )}

      <div style={{ ...box, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {log || 'result log…'}
      </div>
    </div>
  );
}
