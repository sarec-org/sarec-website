'use client';
/**
 * 题目输入：主要角色选择（常用按钮 + 搜索 + 两级分类）与通用题目（点选 / 多选 / 文字 / 月日）。
 * 题目与选项全部来自服务端（lib/crm/questionBank.ts），页面不写死任何题。
 */
import { useMemo, useState } from 'react';
import s from './crm.module.css';

export type QuestionDTO = {
  code: string;
  prompt: string;
  input: 'text' | 'contact' | 'single' | 'multi' | 'role' | 'month_day' | 'free_text';
  options: string[];
  maxChoices: number | null;
  badge: { label: string; points: number } | null;
};

export type Meta = {
  roleCategories: { key: string; label: string; subs: { key: string; label: string }[] }[];
  quickRoles: { key: string; label: string }[];
};

export function RolePicker({ meta, value, onChange, other, setOther }: { meta: Meta | null; value: string; onChange: (k: string) => void; other: string; setOther: (v: string) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const all = useMemo(() => meta?.roleCategories.flatMap((c) => c.subs.map((x) => ({ ...x, cat: c.label }))) ?? [], [meta]);
  const hits = q.trim() ? all.filter((x) => x.label.includes(q.trim()) || x.cat.includes(q.trim())).slice(0, 12) : [];
  const picked = all.find((x) => x.key === value);
  if (!meta) return <p className={s.small}>加载中…</p>;
  return (
    <div>
      <div className={s.chips}>
        {meta.quickRoles.map((r) => (
          <button type="button" key={r.key} className={`${s.chip} ${value === r.key ? s.chipOn : ''}`} onClick={() => onChange(r.key)}>
            {r.label}
          </button>
        ))}
      </div>
      {picked && !meta.quickRoles.some((r) => r.key === value) && (
        <p style={{ marginTop: '0.6rem' }}>
          已选：<span className={s.badge}>{picked.label}</span>
        </p>
      )}
      <input className={s.input} style={{ marginTop: '0.75rem' }} placeholder="找不到？输入关键词搜索，如：贷款、律师、消防" value={q} onChange={(e) => setQ(e.target.value)} />
      {hits.length > 0 && (
        <div className={s.chips} style={{ marginTop: '0.6rem' }}>
          {hits.map((x) => (
            <button type="button" key={x.key} className={`${s.chip} ${value === x.key ? s.chipOn : ''}`} onClick={() => { onChange(x.key); setQ(''); }}>
              {x.label}
            </button>
          ))}
        </div>
      )}
      <button type="button" className={s.back} style={{ color: 'var(--gold)' }} onClick={() => setShowAll(!showAll)}>
        {showAll ? '收起全部行业 ▲' : '查看全部行业 ▼'}
      </button>
      {showAll && (
        <div>
          {meta.roleCategories.map((c) => (
            <div key={c.key} style={{ borderBottom: '1px solid var(--line-2)' }}>
              <button type="button" className={s.back} style={{ width: '100%', justifyContent: 'space-between', color: 'var(--ivory)' }} onClick={() => setOpen(open === c.key ? null : c.key)}>
                <span>{c.label}</span>
                <span>{open === c.key ? '▲' : '▼'}</span>
              </button>
              {open === c.key && (
                <div className={s.chips} style={{ paddingBottom: '0.75rem' }}>
                  {c.subs.map((x) => (
                    <button type="button" key={x.key} className={`${s.chip} ${value === x.key ? s.chipOn : ''}`} onClick={() => onChange(x.key)}>
                      {x.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {value === 'other' && <input className={s.input} style={{ marginTop: '0.6rem' }} placeholder="请简单写一下您的行业" value={other} onChange={(e) => setOther(e.target.value)} />}
    </div>
  );
}

export type AnswerDraft = { choice?: string; choices?: string[]; text?: string; month?: number; day?: number; detail?: string };

export function isAnswered(q: QuestionDTO, a: AnswerDraft | undefined): boolean {
  if (!a) return false;
  if (q.input === 'single') return !!a.choice;
  if (q.input === 'multi') return !!a.choices?.length;
  if (q.input === 'month_day') return a.choice === '不想填写' || (!!a.month && !!a.day);
  return !!a.text?.trim();
}

const NEGATIVE = ['暂不方便提供', '暂不确定', '不想填写', '目前没有', '没有其他角色', '目前没有具体需求', '不经常往返', '目前都不缺'];

export function QuestionInput({ q, value, onChange }: { q: QuestionDTO; value: AnswerDraft | undefined; onChange: (v: AnswerDraft) => void }) {
  const v = value ?? {};
  const needDetail = (v.choice ?? '').includes('可填写') || (v.choices ?? []).some((c) => c.includes('可填写')) || v.choice === '会去（选城市和大致月份）';
  if (q.input === 'single') {
    return (
      <div>
        <div className={s.chips}>
          {q.options.map((o) => (
            <button type="button" key={o} className={`${s.chip} ${v.choice === o ? s.chipOn : ''} ${NEGATIVE.includes(o) ? s.chipMuted : ''}`} onClick={() => onChange({ choice: o, detail: v.detail })}>
              {o}
            </button>
          ))}
        </div>
        {needDetail && <input className={s.input} style={{ marginTop: '0.6rem' }} placeholder="请补充（选填）" value={v.detail ?? ''} onChange={(e) => onChange({ ...v, detail: e.target.value })} />}
      </div>
    );
  }
  if (q.input === 'multi') {
    const cur = v.choices ?? [];
    const toggle = (o: string) => {
      let next = cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o];
      // 否定选项与其他选项互斥
      if (NEGATIVE.includes(o) && !cur.includes(o)) next = [o];
      else next = next.filter((x) => !NEGATIVE.includes(x) || x === o);
      if (q.maxChoices && next.length > q.maxChoices) return;
      onChange({ choices: next, detail: v.detail });
    };
    return (
      <div>
        {q.maxChoices && <p className={s.small}>最多选 {q.maxChoices} 个（已选 {cur.length}）</p>}
        <div className={s.chips}>
          {q.options.map((o) => (
            <button type="button" key={o} className={`${s.chip} ${cur.includes(o) ? s.chipOn : ''} ${NEGATIVE.includes(o) ? s.chipMuted : ''}`} onClick={() => toggle(o)}>
              {cur.includes(o) ? '✓ ' : ''}
              {o}
            </button>
          ))}
        </div>
        {needDetail && <input className={s.input} style={{ marginTop: '0.6rem' }} placeholder="请补充（选填）" value={v.detail ?? ''} onChange={(e) => onChange({ ...v, detail: e.target.value })} />}
      </div>
    );
  }
  if (q.input === 'month_day') {
    return (
      <div>
        <div className={s.inputRow}>
          <select className={s.select} value={v.month ?? ''} onChange={(e) => onChange({ month: Number(e.target.value), day: v.day })} aria-label="月">
            <option value="">月</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i + 1}>{i + 1} 月</option>
            ))}
          </select>
          <select className={s.select} value={v.day ?? ''} onChange={(e) => onChange({ month: v.month, day: Number(e.target.value) })} aria-label="日">
            <option value="">日</option>
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i} value={i + 1}>{i + 1} 日</option>
            ))}
          </select>
        </div>
        <div className={s.chips} style={{ marginTop: '0.6rem' }}>
          <button type="button" className={`${s.chip} ${s.chipMuted} ${v.choice === '不想填写' ? s.chipOn : ''}`} onClick={() => onChange({ choice: '不想填写' })}>
            不想填写
          </button>
        </div>
      </div>
    );
  }
  // 文字题（可带快捷选项）
  return (
    <div>
      {q.options.length > 0 && (
        <div className={s.chips} style={{ marginBottom: '0.6rem' }}>
          {q.options.map((o) => (
            <button type="button" key={o} className={`${s.chip} ${v.text === o ? s.chipOn : ''} ${s.chipMuted}`} onClick={() => onChange({ text: o })}>
              {o}
            </button>
          ))}
        </div>
      )}
      {q.input === 'free_text' ? (
        <textarea className={s.textarea} placeholder="例如：我在橙县做多户开发，在找出资人，也能提供施工资源。（可点键盘上的麦克风用语音输入）" value={v.text ?? ''} onChange={(e) => onChange({ text: e.target.value })} />
      ) : (
        <input className={s.input} placeholder={q.code === 'Q12' ? '公司名、职位' : '请填写'} value={v.text ?? ''} onChange={(e) => onChange({ text: e.target.value })} />
      )}
    </div>
  );
}

export function toValue(q: QuestionDTO, a: AnswerDraft): Record<string, unknown> {
  if (q.input === 'single') return a.detail ? { choice: a.choice, detail: a.detail } : { choice: a.choice };
  if (q.input === 'multi') return a.detail ? { choices: a.choices, detail: a.detail } : { choices: a.choices };
  if (q.input === 'month_day') return a.choice === '不想填写' ? { choice: '不想填写' } : { month: a.month, day: a.day };
  return { text: a.text };
}
