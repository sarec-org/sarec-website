'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import styles from './contact.module.css';

const identityOptions = [
  '在美华人投资人',
  '出海企业家',
  '中国地产同行',
  '美国项目方',
  '其他(请简要说明)'
];

const requestOptions = [
  '预约 30 分钟沟通',
  '项目评估',
  '申请加入会员',
  '报名活动 / 考察团',
  '其他'
];

const locationOptions = [
  '美国洛杉矶及周边',
  '美国其他地区',
  '中国大陆',
  '海外(其他)'
];

const sourceOptions = [
  '朋友推荐',
  '微信公众号',
  '行业活动',
  '搜索引擎',
  'AI 推荐(ChatGPT / Claude 等)',
  '其他'
];

type InquiryFormState = {
  name: string;
  identity: string;
  requestType: string;
  location: string;
  email: string;
  contact: string;
  message: string;
  source: string;
  compliance: boolean;
};

const initialState: InquiryFormState = {
  name: '',
  identity: '',
  requestType: '',
  location: '',
  email: '',
  contact: '',
  message: '',
  source: '',
  compliance: false
};

const INTENT_MAP: Record<string, string> = {
  consult: '预约 30 分钟沟通',
  evaluate: '项目评估',
  membership: '申请加入会员',
  events: '报名活动 / 考察团'
};

export function ContactInquiryForm() {
  const [form, setForm] = useState<InquiryFormState>(initialState);
  const [generatedBody, setGeneratedBody] = useState('');

  // Prefill 需求类型 from URL ?intent= query (set by CT02 intent cards)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const intent = params.get('intent');
    if (intent && INTENT_MAP[intent]) {
      setForm((curr) => ({ ...curr, requestType: INTENT_MAP[intent] }));
    }
  }, []);

  const emailBody = useMemo(
    () =>
      [
        'SAREC 项目或合作需求',
        '',
        `姓名:${form.name}`,
        `身份:${form.identity}`,
        `需求类型:${form.requestType}`,
        `所在地:${form.location}`,
        `邮箱:${form.email}`,
        `微信 / WhatsApp / 电话:${form.contact}`,
        `如何找到 SAREC:${form.source || '(未填写)'}`,
        '',
        '你想聊什么:',
        form.message || '(未填写)',
        '',
        '合规确认:我理解本表单仅用于初步沟通,不构成投资建议、法律意见、税务意见、移民建议或任何收益承诺。'
      ].join('\n'),
    [form]
  );

  function updateField<K extends keyof InquiryFormState>(field: K, value: InquiryFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGeneratedBody(emailBody);

    const subject = encodeURIComponent('SAREC 项目或合作需求');
    const body = encodeURIComponent(emailBody);
    window.location.href = `mailto:info@sinoamericanrec.org?subject=${subject}&body=${body}`;
  }

  return (
    <div className={styles.formWrap}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGrid2}>
          <Field label="你的姓名" required>
            <input
              className={styles.input}
              type="text"
              placeholder="请输入您的姓名"
              required
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </Field>

          <Field label="你的身份" required>
            <select
              className={styles.select}
              required
              value={form.identity}
              onChange={(e) => updateField('identity', e.target.value)}
            >
              <option value="" disabled>
                请选择
              </option>
              {identityOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </Field>

          <Field label="你的需求类型" required>
            <select
              className={styles.select}
              required
              value={form.requestType}
              onChange={(e) => updateField('requestType', e.target.value)}
            >
              <option value="" disabled>
                请选择
              </option>
              {requestOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </Field>

          <Field label="你的所在地" required>
            <select
              className={styles.select}
              required
              value={form.location}
              onChange={(e) => updateField('location', e.target.value)}
            >
              <option value="" disabled>
                请选择
              </option>
              {locationOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </Field>

          <Field label="邮箱" required>
            <input
              className={styles.input}
              type="email"
              placeholder="便于发送资料"
              required
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
          </Field>

          <Field label="微信 / WhatsApp / 电话" required>
            <input
              className={styles.input}
              type="text"
              placeholder="任选其一即可"
              required
              value={form.contact}
              onChange={(e) => updateField('contact', e.target.value)}
            />
          </Field>
        </div>

        <Field label="你想聊什么">
          <textarea
            className={styles.textarea}
            maxLength={500}
            placeholder="可简要描述你的项目、背景或具体问题。便于我们准备更针对性的沟通。"
            value={form.message}
            onChange={(e) => updateField('message', e.target.value)}
          />
        </Field>

        <Field label="你是怎么找到 SAREC 的">
          <select
            className={styles.select}
            value={form.source}
            onChange={(e) => updateField('source', e.target.value)}
          >
            <option value="">请选择(选填)</option>
            {sourceOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </Field>

        <label className={styles.compliance}>
          <input
            type="checkbox"
            className={styles.complianceCheckbox}
            required
            checked={form.compliance}
            onChange={(e) => updateField('compliance', e.target.checked)}
          />
          <span>
            我理解本表单仅用于初步沟通,不构成投资建议、法律意见、税务意见、移民建议或任何收益承诺。
          </span>
        </label>

        <div>
          <button type="submit" className={styles.submit}>
            <span>提交并发送邮件</span>
            <span className={styles.submitArrow} aria-hidden="true">
              →
            </span>
          </button>
          <p className={styles.formNote}>
            提交后将通过本机邮箱发送给 SAREC。如邮箱客户端未自动打开,请复制下方生成的邮件内容,
            手动发送至 <strong>info@sinoamericanrec.org</strong>。我们 1 个工作日内回复。
          </p>
        </div>
      </form>

      {generatedBody ? (
        <div className={styles.formResult}>
          <h3>已生成邮件内容</h3>
          <p>如果邮箱客户端没有自动打开,可以复制以下内容后手动发送。</p>
          <textarea readOnly value={generatedBody} />
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  required,
  children
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>
        {label}
        {required ? <span className={styles.fieldRequired}>*</span> : null}
      </span>
      {children}
    </label>
  );
}
