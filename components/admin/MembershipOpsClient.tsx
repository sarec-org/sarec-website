'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  OPERATIONS_STATUS_LABELS_ZH,
  OPERATIONS_ACTION_STATUSES,
  type OperationsStatus
} from '@/lib/membership/operations';

// 会员运营工作台。cookie session 鉴权(credentials:include),token 不出现在前端。
type OpsRow = {
  id: string;
  application_type: string;
  selected_tier_slug: string | null;
  payment_plan: string | null;
  company_name: string | null;
  contact_name: string | null;
  email: string;
  phone: string | null;
  current_price_cents: number | null;
  payment_status: string;
  application_status: string;
  operations_status: string | null;
  membership_start_date: string | null;
  membership_end_date: string | null;
  created_at: string | null;
  first_payment_paid_at: string | null;
  pay_status: string | null;
  pay_amount_cents: number | null;
  payment_intent_last6: string | null;
};

type Detail = {
  application: Record<string, unknown>;
  payments: Record<string, unknown>[];
  audit: Record<string, unknown>[];
};

const PENDING_STATUSES: OperationsStatus[] = [
  'paid_under_review',
  'need_more_info',
  'needs_owner_review'
];

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
  padding: '5px 10px',
  cursor: 'pointer',
  margin: '2px 6px 2px 0',
  fontSize: 13
};

const STATUS_COLORS: Record<string, string> = {
  paid_under_review: '#4a7fb0',
  need_more_info: '#b0904a',
  needs_owner_review: '#b06a5c',
  approved: '#4aa06a',
  onboarding_completed: '#5a8a5a',
  rejected: '#8a5a5a',
  refund_pending: '#9a6ab0'
};

// 按钮配色:通过=金/绿,拒绝/退款=红,其他中性。
const ACTION_STYLE: Record<OperationsStatus, React.CSSProperties> = {
  paid_under_review: {},
  need_more_info: { background: '#c8b06a' },
  needs_owner_review: { background: '#c88f6a' },
  approved: { background: '#4aa06a', color: '#fff' },
  onboarding_completed: { background: '#5a8a5a', color: '#fff' },
  rejected: { background: '#b06a5c', color: '#fff' },
  refund_pending: { background: '#9a6ab0', color: '#fff' }
};

function money(cents: number | null | undefined): string {
  if (cents == null) return '-';
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}

function statusLabel(s: string | null): string {
  if (!s) return '未分类';
  return OPERATIONS_STATUS_LABELS_ZH[s as OperationsStatus] ?? s;
}

export function MembershipOpsClient() {
  const router = useRouter();
  const [rows, setRows] = useState<OpsRow[]>([]);
  const [view, setView] = useState<'pending' | 'all' | OperationsStatus>('pending');
  const [selected, setSelected] = useState<OpsRow | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [adminId, setAdminId] = useState('');
  const [note, setNote] = useState('');
  const [log, setLog] = useState('');
  const [busy, setBusy] = useState(false);

  const post = useCallback(
    async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/admin/membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (res.status === 401) {
        setLog('会话已过期,请重新登录。');
        router.refresh();
        return { status: 401, data: {} as Record<string, unknown> };
      }
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      return { status: res.status, data };
    },
    [router]
  );

  const loadList = useCallback(async () => {
    setBusy(true);
    const { data } = await post({ action: 'list_operations' });
    if (Array.isArray((data as { applications?: OpsRow[] }).applications)) {
      setRows((data as { applications: OpsRow[] }).applications);
    }
    setBusy(false);
  }, [post]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const visible = useMemo(() => {
    if (view === 'all') return rows;
    if (view === 'pending')
      return rows.filter((r) => PENDING_STATUSES.includes((r.operations_status ?? '') as OperationsStatus));
    return rows.filter((r) => r.operations_status === view);
  }, [rows, view]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.operations_status ?? 'null'] = (c[r.operations_status ?? 'null'] ?? 0) + 1;
    return c;
  }, [rows]);

  async function openDetail(row: OpsRow) {
    setSelected(row);
    setDetail(null);
    const { data } = await post({ action: 'application_detail', applicationId: row.id });
    if (data && data.application) setDetail(data as unknown as Detail);
  }

  async function setStatus(row: OpsRow, target: OperationsStatus) {
    if (!confirm(`确认将「${row.company_name || row.contact_name || row.email}」标记为「${statusLabel(target)}」?`))
      return;
    setBusy(true);
    const { status, data } = await post({
      action: 'set_operations_status',
      applicationId: row.id,
      operationsStatus: target,
      adminIdentifier: adminId || null,
      adminNote: note || null
    });
    setLog(`[${status}] ${JSON.stringify(data)}`);
    setBusy(false);
    await loadList();
    if (selected?.id === row.id) await openDetail(row);
  }

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE', credentials: 'include' });
    router.refresh();
  }

  const filterKeys: ('pending' | 'all' | OperationsStatus)[] = [
    'pending',
    'paid_under_review',
    ...OPERATIONS_ACTION_STATUSES,
    'all'
  ];
  const filters = filterKeys.map((key) => ({
    key,
    label:
      key === 'pending' ? '待处理' : key === 'all' ? '全部' : OPERATIONS_STATUS_LABELS_ZH[key]
  }));

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24, color: '#e6e6e6', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>SAREC 会员运营工作台</h2>
        <button style={{ ...btn, background: '#33404d', color: '#e6e6e6' }} onClick={logout}>
          退出登录
        </button>
      </div>
      <p style={{ fontSize: 13, color: '#9aa' }}>
        内部工具 · 敏感字段仅显示 Stripe 付款号后 6 位 · 所有状态变更写审计日志
      </p>

      <div style={box}>
        <input style={{ ...input, width: 150 }} value={adminId} onChange={(e) => setAdminId(e.target.value)} placeholder="操作人(adminIdentifier)" />
        <input style={{ ...input, width: 260 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="备注(可选,写入审计)" />
        <button style={btn} onClick={loadList} disabled={busy}>
          {busy ? '加载中…' : '刷新列表'}
        </button>
      </div>

      <div style={{ ...box, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {filters.map((f) => {
          const n = f.key === 'all' ? rows.length : f.key === 'pending' ? visiblePendingCount(rows) : counts[f.key] ?? 0;
          return (
            <button
              key={f.key}
              style={{
                ...btn,
                background: view === f.key ? '#c9a567' : '#1c2530',
                color: view === f.key ? '#0b1a2b' : '#cdd'
              }}
              onClick={() => setView(f.key)}
            >
              {f.label} ({n})
            </button>
          );
        })}
      </div>

      <div style={box}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#9aa' }}>
              <th>申请时间</th>
              <th>付款时间</th>
              <th>档位</th>
              <th>金额</th>
              <th>姓名 / 单位</th>
              <th>联系方式</th>
              <th>付款</th>
              <th>运营状态</th>
              <th>有效期</th>
              <th>付款号</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #222', background: selected?.id === r.id ? '#1c2530' : undefined }}>
                <td>{r.created_at || '-'}</td>
                <td>{r.first_payment_paid_at || '-'}</td>
                <td>{r.selected_tier_slug || r.application_type}</td>
                <td>{money(r.pay_amount_cents ?? r.current_price_cents)}</td>
                <td>{r.company_name || r.contact_name || '-'}</td>
                <td style={{ fontSize: 12 }}>
                  {r.email}
                  {r.phone ? <br /> : null}
                  {r.phone || ''}
                </td>
                <td>{r.pay_status || r.payment_status}</td>
                <td>
                  <span style={{ padding: '2px 6px', borderRadius: 4, background: STATUS_COLORS[r.operations_status ?? ''] ?? '#444', color: '#fff', fontSize: 12 }}>
                    {statusLabel(r.operations_status)}
                  </span>
                </td>
                <td style={{ fontSize: 12 }}>
                  {r.membership_start_date || '-'}
                  {r.membership_end_date ? ` → ${r.membership_end_date}` : ''}
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.payment_intent_last6 ? `…${r.payment_intent_last6}` : '-'}</td>
                <td>
                  <button style={{ ...btn, padding: '2px 8px' }} onClick={() => openDetail(r)}>
                    详情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p style={{ color: '#9aa' }}>该筛选下没有记录。</p>}
      </div>

      {selected && (
        <div style={box}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{selected.company_name || selected.contact_name || selected.email}</h3>
            <button style={{ ...btn, background: '#33404d', color: '#e6e6e6' }} onClick={() => { setSelected(null); setDetail(null); }}>
              关闭
            </button>
          </div>

          <div style={{ margin: '12px 0' }}>
            <strong style={{ color: '#9aa', fontSize: 13 }}>秘书操作: </strong>
            {OPERATIONS_ACTION_STATUSES.map((s) => (
              <button key={s} style={{ ...btn, ...ACTION_STYLE[s] }} disabled={busy} onClick={() => setStatus(selected, s)}>
                标记为 {OPERATIONS_STATUS_LABELS_ZH[s]}
              </button>
            ))}
          </div>

          {!detail && <p style={{ color: '#9aa' }}>加载详情中…</p>}
          {detail && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                {detailFields(detail.application).map(([k, v]) => (
                  <div key={k} style={{ borderBottom: '1px solid #222', padding: '3px 0' }}>
                    <span style={{ color: '#9aa' }}>{k}: </span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>

              <h4 style={{ marginBottom: 4 }}>付款</h4>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#9aa' }}>
                    <th>期</th><th>渠道</th><th>金额</th><th>状态</th><th>付款号</th><th>付款时间</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.payments.map((p, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #222' }}>
                      <td>{String(p.installment_number ?? '-')}</td>
                      <td>{String(p.payment_provider ?? '-')}</td>
                      <td>{money(p.amount_cents as number)}</td>
                      <td>{String(p.payment_status ?? '-')}</td>
                      <td style={{ fontFamily: 'monospace' }}>{p.payment_intent_last6 ? `…${p.payment_intent_last6}` : '-'}</td>
                      <td>{String(p.paid_at ?? '-')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4 style={{ marginBottom: 4 }}>审计日志</h4>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#9aa' }}>
                    <th>时间</th><th>动作</th><th>前→后</th><th>操作人</th><th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.audit.map((a, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #222' }}>
                      <td>{String(a.action_at ?? '-')}</td>
                      <td>{String(a.admin_action_type ?? '-')}</td>
                      <td>{`${a.previous_status ?? a.previous_value ?? '-'} → ${a.new_status ?? a.new_value ?? '-'}`}</td>
                      <td>{String(a.admin_identifier ?? '-')}</td>
                      <td>{String(a.admin_note ?? '-')}</td>
                    </tr>
                  ))}
                  {detail.audit.length === 0 && (
                    <tr><td colSpan={5} style={{ color: '#9aa' }}>无</td></tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      <div style={{ ...box, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {log || 'result log…'}
      </div>
    </div>
  );
}

function visiblePendingCount(rows: OpsRow[]): number {
  return rows.filter((r) => PENDING_STATUSES.includes((r.operations_status ?? '') as OperationsStatus)).length;
}

// 详情字段中文标签(只展示有意义的申请数据)。
const FIELD_LABELS: Record<string, string> = {
  application_type: '申请类型',
  selected_tier_slug: '会员档位',
  payment_plan: '付款方式',
  company_name: '单位名称',
  contact_name: '联系人',
  contact_title: '职务',
  email: '邮箱',
  phone: '电话',
  company_address: '地址',
  website_url: '官网',
  industry_category: '行业',
  service_area: '服务区域',
  company_description: '公司简介',
  notes: '备注',
  current_price_cents: '档位金额',
  payment_status: '付款状态',
  application_status: '审核状态',
  operations_status: '运营状态',
  operations_notes: '运营备注',
  reviewed_by: '审核人',
  reviewed_at: '审核时间',
  membership_start_date: '有效期起',
  membership_end_date: '有效期止',
  second_payment_due_date: '第二期到期',
  created_at: '申请时间',
  first_payment_paid_at: '首付时间'
};

function detailFields(app: Record<string, unknown>): [string, string][] {
  const out: [string, string][] = [];
  for (const [k, label] of Object.entries(FIELD_LABELS)) {
    const raw = app[k];
    if (raw == null || raw === '') continue;
    let v = String(raw);
    if (k === 'current_price_cents') v = money(raw as number);
    if (k === 'operations_status') v = statusLabel(raw as string);
    out.push([label, v]);
  }
  return out;
}
