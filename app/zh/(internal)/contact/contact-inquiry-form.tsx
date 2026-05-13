'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';

const identityOptions = [
  '中国企业家 / 投资人',
  '美国华人投资人',
  '房地产开发商 / 项目方',
  '房地产经纪 / 从业者',
  '新移民家庭 / 高净值客户',
  '专业服务机构',
  '其他'
];

const requestOptions = ['项目初筛', '深度尽调', '合作结构咨询', '会员服务', '活动与考察', '项目方寻求资源协同', '其他'];

const stageOptions = ['还在了解阶段', '已有项目资料', '已有土地或项目', '项目在审批中', '项目准备融资', '项目已进入施工或运营', '不确定'];

type InquiryFormState = {
  name: string;
  identity: string;
  contact: string;
  email: string;
  requestType: string;
  projectStage: string;
  message: string;
  compliance: boolean;
};

const initialState: InquiryFormState = {
  name: '',
  identity: '',
  contact: '',
  email: '',
  requestType: '',
  projectStage: '',
  message: '',
  compliance: false
};

const fieldClass =
  'w-full border-0 border-b border-line bg-transparent px-0 py-3.5 text-base text-ink outline-none transition placeholder:text-zinc-400 focus:border-ink';

export function ContactInquiryForm() {
  const [form, setForm] = useState<InquiryFormState>(initialState);
  const [generatedBody, setGeneratedBody] = useState('');

  const emailBody = useMemo(
    () =>
      [
        'SAREC 项目或合作需求',
        '',
        `姓名：${form.name}`,
        `身份类型：${form.identity}`,
        `联系方式：${form.contact}`,
        `邮箱：${form.email}`,
        `需求类型：${form.requestType}`,
        `项目阶段：${form.projectStage}`,
        '',
        '需求说明：',
        form.message,
        '',
        '合规确认：我理解本表单仅用于初步沟通，不构成投资建议、法律意见、税务意见、移民建议或任何收益承诺。'
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
    <div className="rounded-md border border-line bg-white p-5 shadow-soft md:p-8">
      <form className="grid gap-6" onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <TextInput
            label="姓名"
            name="name"
            onChange={(value) => updateField('name', value)}
            placeholder="请输入您的姓名"
            required
            value={form.name}
          />
          <SelectInput
            label="身份类型"
            name="identity"
            onChange={(value) => updateField('identity', value)}
            options={identityOptions}
            required
            value={form.identity}
          />
          <TextInput
            label="联系方式"
            name="contact"
            onChange={(value) => updateField('contact', value)}
            placeholder="手机号 / 微信 / WhatsApp / 邮箱均可"
            required
            value={form.contact}
          />
          <TextInput
            label="邮箱"
            name="email"
            onChange={(value) => updateField('email', value)}
            placeholder="请输入邮箱，便于发送资料"
            required
            type="email"
            value={form.email}
          />
          <SelectInput
            label="需求类型"
            name="requestType"
            onChange={(value) => updateField('requestType', value)}
            options={requestOptions}
            required
            value={form.requestType}
          />
          <SelectInput
            label="项目阶段"
            name="projectStage"
            onChange={(value) => updateField('projectStage', value)}
            options={stageOptions}
            required
            value={form.projectStage}
          />
        </div>

        <label className="block font-sans text-sm font-medium text-muted" htmlFor="field-message">
          <span className="block">需求说明 *</span>
          <textarea
            className={`${fieldClass} min-h-32 resize-y`}
            id="field-message"
            name="message"
            onChange={(event) => updateField('message', event.target.value)}
            placeholder="请简单说明你的项目、需求或希望 SAREC 协助判断的问题。"
            required
            value={form.message}
          />
        </label>

        <label className="flex gap-3 rounded-[2px] border border-line bg-zinc-50 p-4 text-sm leading-7 text-muted">
          <input
            checked={form.compliance}
            className="mt-1 h-4 w-4 accent-ink"
            name="compliance"
            onChange={(event) => updateField('compliance', event.target.checked)}
            required
            type="checkbox"
          />
          <span>我理解本表单仅用于初步沟通，不构成投资建议、法律意见、税务意见、移民建议或任何收益承诺。</span>
        </label>

        <div>
          <Button type="submit">生成邮件并发送需求</Button>
          <p className="mt-4 text-sm leading-7 text-muted">
            当前表单将通过你的本机邮箱发送给 SAREC。如邮箱客户端未自动打开，请复制表单内容发送至 info@sinoamericanrec.org。
          </p>
        </div>
      </form>

      {generatedBody ? (
        <div className="mt-8 rounded-[2px] border border-line bg-zinc-50 p-5">
          <h3 className="font-sans text-lg font-semibold text-ink">已生成邮件内容</h3>
          <p className="mt-2 text-sm leading-7 text-muted">如果邮箱客户端没有自动打开，可以复制以下内容后手动发送。</p>
          <textarea className="mt-4 min-h-64 w-full resize-y border border-line bg-white p-4 text-sm leading-7 text-ink outline-none" readOnly value={generatedBody} />
        </div>
      ) : null}
    </div>
  );
}

function TextInput({
  label,
  name,
  onChange,
  placeholder,
  required,
  type = 'text',
  value
}: {
  label: string;
  name: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  type?: 'text' | 'email';
  value: string;
}) {
  return (
    <label className="block font-sans text-sm font-medium text-muted" htmlFor={`field-${name}`}>
      <span className="block">
        {label}
        {required ? ' *' : ''}
      </span>
      <input className={fieldClass} id={`field-${name}`} name={name} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} type={type} value={value} />
    </label>
  );
}

function SelectInput({
  label,
  name,
  onChange,
  options,
  required,
  value
}: {
  label: string;
  name: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
  value: string;
}) {
  return (
    <label className="block font-sans text-sm font-medium text-muted" htmlFor={`field-${name}`}>
      <span className="block">
        {label}
        {required ? ' *' : ''}
      </span>
      <select className={fieldClass} id={`field-${name}`} name={name} onChange={(event) => onChange(event.target.value)} required={required} value={value}>
        <option disabled value="">
          请选择
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
