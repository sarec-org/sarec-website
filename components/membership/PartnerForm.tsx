'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import styles from './membership.module.css';

export type PartnerFormProps = {
  industries: string[];
  fullPriceLabel: string;
  firstPaymentLabel: string;
  secondPaymentLabel: string;
  supportsSemiAnnual: boolean;
};

type PaymentPlan = 'annual' | 'semiAnnual';

type FormState = {
  paymentPlan: PaymentPlan;
  companyName: string;
  contactName: string;
  contactTitle: string;
  email: string;
  phone: string;
  companyAddress: string;
  websiteUrl: string;
  industryCategory: string;
  serviceArea: string;
  companyDescription: string;
  notes: string;
  agree: boolean;
};

export function PartnerForm({
  industries,
  fullPriceLabel,
  firstPaymentLabel,
  secondPaymentLabel,
  supportsSemiAnnual
}: PartnerFormProps) {
  const [form, setForm] = useState<FormState>({
    paymentPlan: 'annual',
    companyName: '',
    contactName: '',
    contactTitle: '',
    email: '',
    phone: '',
    companyAddress: '',
    websiteUrl: '',
    industryCategory: '',
    serviceArea: '',
    companyDescription: '',
    notes: '',
    agree: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((curr) => ({ ...curr, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    if (!form.agree) {
      setError('请先阅读并同意相关协议。');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/membership/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationType: 'strategic_partner',
          tierSlug: 'strategic_partner',
          paymentPlan: form.paymentPlan,
          companyName: form.companyName,
          contactName: form.contactName,
          contactTitle: form.contactTitle,
          email: form.email,
          phone: form.phone,
          companyAddress: form.companyAddress,
          websiteUrl: form.websiteUrl,
          industryCategory: form.industryCategory,
          serviceArea: form.serviceArea,
          companyDescription: form.companyDescription,
          notes: form.notes,
          agree: form.agree
        })
      });
      const data = (await res.json()) as {
        ok?: boolean;
        orderNo?: string;
        needLogin?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !data.orderNo) {
        setError(data.error?.message || '提交失败，请稍后再试。您填写的内容还在。');
        setSubmitting(false);
        return;
      }
      // 进入统一付款页（Zelle 或银行卡）；已有档案的需先用邮箱验证码登录
      const payUrl = `/zh/pay/${data.orderNo}`;
      window.location.href = data.needLogin
        ? `/zh/signin?next=${encodeURIComponent(payUrl)}&email=${encodeURIComponent(form.email)}`
        : payUrl;
    } catch {
      setError('网络不稳定，没有提交成功。您填的内容还在，请稍后再点一次。');
      setSubmitting(false);
    }
  }

  return (
    <form id="apply" className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <span>
          付款方式<span className={styles.fieldRequired}>*</span>
        </span>
        <div className={styles.planOptions}>
          <label
            className={`${styles.planOption} ${
              form.paymentPlan === 'annual' ? styles.planOptionActive : ''
            }`}
          >
            <input
              type="radio"
              name="paymentPlan"
              value="annual"
              checked={form.paymentPlan === 'annual'}
              onChange={() => update('paymentPlan', 'annual')}
            />
            <span>
              <strong>一次性付清 {fullPriceLabel}</strong>
              <span>Pay in full</span>
            </span>
          </label>

          {supportsSemiAnnual && (
            <label
              className={`${styles.planOption} ${
                form.paymentPlan === 'semiAnnual' ? styles.planOptionActive : ''
              }`}
            >
              <input
                type="radio"
                name="paymentPlan"
                value="semiAnnual"
                checked={form.paymentPlan === 'semiAnnual'}
                onChange={() => update('paymentPlan', 'semiAnnual')}
              />
              <span>
                <strong>半年两期 {firstPaymentLabel} + {secondPaymentLabel}</strong>
                <span>本次先付第一期 {firstPaymentLabel}；第二期约 6 个月后，日期以 SAREC 确认为准</span>
              </span>
            </label>
          )}
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="companyName">
          公司名称<span className={styles.fieldRequired}>*</span>
        </label>
        <input
          id="companyName"
          type="text"
          required
          value={form.companyName}
          onChange={(e) => update('companyName', e.target.value)}
          placeholder="公司名称"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="industryCategory">行业分类</label>
        <select
          id="industryCategory"
          value={form.industryCategory}
          onChange={(e) => update('industryCategory', e.target.value)}
        >
          <option value="">请选择（选填）</option>
          {industries.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
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
        <label htmlFor="serviceArea">服务地区</label>
        <input
          id="serviceArea"
          type="text"
          value={form.serviceArea}
          onChange={(e) => update('serviceArea', e.target.value)}
          placeholder="服务地区（选填）"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="companyDescription">公司简介</label>
        <textarea
          id="companyDescription"
          rows={3}
          maxLength={800}
          value={form.companyDescription}
          onChange={(e) => update('companyDescription', e.target.value)}
          placeholder="简要介绍贵司业务（选填）"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="notes">备注</label>
        <textarea
          id="notes"
          rows={2}
          maxLength={500}
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="其他说明（选填）"
        />
      </div>

      <div className={styles.agreeBox}>
        <h3 className={styles.agreeBoxTitle}>战略合作协议确认</h3>
        <p className={styles.agreeBoxBody}>
          请在付款前阅读并确认
          <Link href="/legal/strategic-partnership-agreement">《SAREC 战略合作伙伴协议》</Link>和
          <Link href="/legal/privacy">《隐私政策》</Link>。勾选后表示您已阅读、理解并同意相关条款。
        </p>
        <div className={styles.agreeCheck}>
          <input
            type="checkbox"
            id="agree"
            checked={form.agree}
            onChange={(e) => update('agree', e.target.checked)}
          />
          <label htmlFor="agree">
            我已阅读并同意
            <Link href="/legal/strategic-partnership-agreement">《SAREC 战略合作伙伴协议》</Link>和
            <Link href="/legal/privacy">《隐私政策》</Link>。
          </label>
        </div>
      </div>

      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}

      <div>
        <button type="submit" className={styles.btnPrimary} disabled={submitting}>
          {submitting ? '处理中…' : '下一步：选择付款方式'}
        </button>
        <p className={styles.formHint}>
          下一步在线付款：银行卡支付即时生效（如付款页提供 Zelle 转账，则核对到账后生效）。无需审批；半年两期本次仅收第一期。
        </p>
      </div>
    </form>
  );
}
