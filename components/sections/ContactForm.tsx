'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { site } from '@/lib/content';

type Field = {
  label: string;
  name: string;
  required?: boolean;
  type?: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  options?: string[];
  placeholder?: string;
};

type Tab = {
  id: string;
  label: string;
  anchor?: string;
  submit: string;
  fields: Field[];
};

const tabs: Tab[] = [
  {
    id: 'general_intake',
    label: '提交需求',
    anchor: 'investment',
    submit: '提交需求',
    fields: [
      { label: '姓名', name: 'name', required: true },
      { label: 'Email', name: 'email', required: true, type: 'email' },
      { label: '电话或微信', name: 'contact', required: true },
      {
        label: '你的身份',
        name: 'identity',
        required: true,
        type: 'select',
        options: ['投资人', '项目方', '房地产同行', '新移民家庭', '企业主', '其他']
      },
      {
        label: '你想解决的问题',
        name: 'request_type',
        required: true,
        type: 'select',
        options: ['判断一个项目', '寻找美国地产项目', '项目融资或资本协同', '投资结构设计', '家庭资产配置', '考察 / 培训 / 社群', '其他']
      },
      {
        label: '预计资金规模或项目规模',
        name: 'size_range',
        type: 'select',
        options: ['50万美元以下', '50万–100万美元', '100万–300万美元', '300万美元以上', '暂不披露']
      },
      {
        label: '是否已有项目资料',
        name: 'project_materials',
        required: true,
        type: 'select',
        options: ['有，资料较完整', '有，但资料不完整', '暂时没有具体项目', '不确定']
      },
      {
        label: '留言',
        name: 'notes',
        type: 'textarea',
        placeholder: '请简单说明你的项目、需求、所在城市、希望解决的问题，或你希望 SAREC 如何协助。'
      }
    ]
  }
];

export function ContactForm() {
  const router = useRouter();
  const [activeId, setActiveId] = useState(tabs[0].id);
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeId) ?? tabs[0], [activeId]);
  const endpoint = process.env.NEXT_PUBLIC_FORM_ENDPOINT;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (endpoint) {
      const data = new FormData(event.currentTarget);
      await fetch(endpoint, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' }
      });
    }

    router.push('/zh/contact/thanks/');
  }

  return (
    <div className="rounded-md border border-line bg-white p-4 shadow-soft md:p-8">
      <div className="border-b border-line pb-4">
        <h3 className="font-sans text-xl font-semibold text-ink" id={activeTab.anchor}>
          {activeTab.label}
        </h3>
        <p className="mt-3 text-sm leading-7 text-muted md:text-base">
          请尽量填写关键信息，便于我们判断需求类型、资料完整度以及下一步是否适合继续沟通。
        </p>
      </div>

      {endpoint ? (
        <form className="mt-8 grid gap-6" onSubmit={handleSubmit}>
          <input name="form_type" type="hidden" value={activeTab.id} />
          <div className="grid gap-6 md:grid-cols-2">
            {activeTab.fields.map((field) => (
              <FormField key={`${activeTab.id}-${field.name}`} {...field} />
            ))}
          </div>
          <div className="pt-2">
            <Button className="w-full md:w-auto" type="submit">
              {activeTab.submit}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-8 grid gap-6">
          <CardNote
            title="当前建议的提交方式"
            body="当前页面未接入在线表单提交服务。请将页面上方建议准备的信息整理后，通过 Email、电话或微信与我们联系，我们会根据资料完整度和需求类型判断下一步是否适合沟通。"
          />
          <div className="grid gap-4 md:grid-cols-3">
            <ContactLink href={`mailto:${site.email}`} label="Email" value={site.email} />
            <ContactLink href={`tel:${site.phone.replace(/[^\d+]/g, '')}`} label="电话" value={site.phone} />
            <ContactLink href="/zh/contact/thanks/" label="下一步说明" value="查看联系后流程" />
          </div>
        </div>
      )}
    </div>
  );
}

function CardNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[2px] border border-line bg-zinc-50 p-5">
      <h4 className="font-sans text-base font-semibold text-ink">{title}</h4>
      <p className="mt-3 text-sm leading-7 text-muted md:text-base">{body}</p>
    </div>
  );
}

function ContactLink({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <a className="rounded-[2px] border border-line bg-zinc-50 p-5 transition hover:border-zinc-400" href={href}>
      <p className="font-sans text-sm font-semibold text-gold">{label}</p>
      <p className="mt-3 text-sm leading-7 text-ink md:text-base">{value}</p>
    </a>
  );
}
