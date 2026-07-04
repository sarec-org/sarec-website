'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import styles from './membership.module.css';

// 展示用价格由 props 传入（服务端渲染）；真实金额由 API 依 tiers.ts 重新解析。
export type JoinTierOption = {
  slug: string;
  nameZh: string;
  currentPriceLabel: string;
};

type FormState = {
  tierSlug: string;
  companyName: string;
  contactName: string;
  contactTitle: string;
  email: string;
  phone: string;
  companyAddress: string;
  websiteUrl: string;
  industryCategory: string;
  notes: string;
  agree: boolean;
};

const initialState: FormState = {
  tierSlug: '',
  companyName: '',
  contactName: '',
  contactTitle: '',
  email: '',
  phone: '',
  companyAddress: '',
  websiteUrl: '',
  industryCategory: '',
  notes: '',
  agree: false
};

export function JoinForm({ tiers }: { tiers: JoinTierOption[] }) {
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((curr) => ({ ...curr, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationType: 'membership',
          tierSlug: form.tierSlug,
          companyName: form.companyName,
          contactName: form.contactName,
          contactTitle: form.contactTitle,
          email: form.email,
          phone: form.phone,
          companyAddress: form.companyAddress,
          websiteUrl: form.websiteUrl,
          industryCategory: form.industryCategory,
          notes: form.notes,
          agree: form.agree
        })
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || '提交失败，请稍后再试。');
        setSubmitting(false);
        return;
      }
      // 跳转到 Stripe Checkout（test mode）。
      window.location.href = data.url;
    } catch {
      setError('网络异常，请稍后再试。');
      setSubmitting(false);
    }
  }

  return (
    <form id="apply" className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="tierSlug">
          选择档位<span className={styles.fieldRequired}>*</span>
        </label>
        <select
          id="tierSlug"
          required
          value={form.tierSlug}
          onChange={(e) => update('tierSlug', e.target.value)}
        >
          <option value="" disabled>
            请选择
          </option>
          {tiers.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.nameZh} — {t.currentPriceLabel}/年
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="companyName">
          公司 / 机构 / 会员名称<span className={styles.fieldRequired}>*</span>
        </label>
        <input
          id="companyName"
          type="text"
          required
          value={form.companyName}
          onChange={(e) => update('companyName', e.target.value)}
          placeholder="公司 / 机构 / 会员名称"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="contactName">
          联系人姓名<span className={styles.fieldRequired}>*</span>
        </label>
        <input
          id="contactName"
          type="text"
          required
          value={form.contactName}
          onChange={(e) => update('contactName', e.target.value)}
          placeholder="联系人姓名"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="contactTitle">职务</label>
        <input
          id="contactTitle"
          type="text"
          value={form.contactTitle}
          onChange={(e) => update('contactTitle', e.target.value)}
          placeholder="职务（选填）"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="email">
          邮箱<span className={styles.fieldRequired}>*</span>
        </label>
        <input
          id="email"
          type="email"
          required
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="phone">电话</label>
        <input
          id="phone"
          type="tel"
          value={form.phone}
          onChange={(e) => update('phone', e.target.value)}
          placeholder="电话（选填）"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="companyAddress">公司地址</label>
        <input
          id="companyAddress"
          type="text"
          value={form.companyAddress}
          onChange={(e) => update('companyAddress', e.target.value)}
          placeholder="公司地址（选填）"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="websiteUrl">网站</label>
        <input
          id="websiteUrl"
          type="text"
          value={form.websiteUrl}
          onChange={(e) => update('websiteUrl', e.target.value)}
          placeholder="https://（选填）"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="industryCategory">所属行业</label>
        <input
          id="industryCategory"
          type="text"
          value={form.industryCategory}
          onChange={(e) => update('industryCategory', e.target.value)}
          placeholder="所属行业（选填）"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="notes">备注</label>
        <textarea
          id="notes"
          rows={3}
          maxLength={800}
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="其他说明（选填）"
        />
      </div>

      <div className={styles.agreeRow}>
        <input
          type="checkbox"
          id="agree"
          checked={form.agree}
          onChange={(e) => update('agree', e.target.checked)}
        />
        <div>
          <p>
            I have read and agree to the{' '}
            <Link href="/legal/membership-agreement">SAREC Membership Agreement</Link> and{' '}
            <Link href="/legal/privacy">Privacy Policy</Link>.
          </p>
          <p>
            我已阅读并同意 <Link href="/legal/membership-agreement">SAREC 入会协议</Link>及
            <Link href="/legal/privacy">隐私政策</Link>。
          </p>
        </div>
      </div>

      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}

      <div>
        <button type="submit" className={styles.btnPrimary} disabled={!form.agree || submitting}>
          {submitting ? '正在跳转付款…' : '继续安全付款 / Continue to secure checkout'}
        </button>
        <p className={styles.formHint}>
          付款由 Stripe 安全处理；提交后将跳转至 Stripe 付款页。付款完成后我们将确认记录。
        </p>
      </div>
    </form>
  );
}
