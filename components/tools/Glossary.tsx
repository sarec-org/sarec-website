'use client';
/** 1.4 · 中英地产术语速查（/zh/tools/glossary）：搜索中英文、按分类筛选 */
import { useMemo, useState } from 'react';
import { GLOSSARY, GLOSSARY_CATS, type GlossaryCat } from '@/lib/tools/glossary';
import { L, ToolShell, useLang } from './ToolShell';
import s from '@/components/crm/crm.module.css';
import t from './tools.module.css';

export function GlossaryPage() {
  return (
    <ToolShell
      eyebrow={{ zh: 'TOOLS · 术语速查', en: 'TOOLS · GLOSSARY' }}
      title={{ zh: '中英地产术语速查', en: 'Real Estate Glossary (EN–中文)' }}
      lead={{
        zh: `美国买房、贷款、投资、开发常用的 ${GLOSSARY.length} 个词，中英对照、一句话解释。输入中文或英文都能搜。`,
        en: `${GLOSSARY.length} common US real estate terms with Chinese equivalents and one-line definitions. Search in English or Chinese.`
      }}
    >
      <Body />
    </ToolShell>
  );
}

const norm = (x: string) => x.toLowerCase().replace(/[\s()（）'’\-/]/g, '');

function Body() {
  const { lang } = useLang();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<GlossaryCat | 'all'>('all');
  const list = useMemo(() => {
    const n = norm(q);
    return GLOSSARY.filter((x) => (cat === 'all' || x.cat === cat) && (!n || norm(`${x.en}${x.zh}${x.dz}${x.de}`).includes(n)));
  }, [q, cat]);

  return (
    <>
      <label className={s.field}>
        <span className={s.label}>{L(lang, '搜索', 'Search')}</span>
        <input className={s.input} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={L(lang, '例如：首付、Cap Rate、escrow', 'e.g. escrow, 首付, cap rate')} />
      </label>
      <div className={s.chips} style={{ marginBottom: '1rem' }}>
        <button type="button" className={`${s.chip} ${cat === 'all' ? s.chipOn : ''}`} onClick={() => setCat('all')}>{L(lang, '全部', 'All')}</button>
        {(Object.keys(GLOSSARY_CATS) as GlossaryCat[]).map((k) => (
          <button key={k} type="button" className={`${s.chip} ${cat === k ? s.chipOn : ''}`} onClick={() => setCat(k)}>{L(lang, GLOSSARY_CATS[k].zh, GLOSSARY_CATS[k].en)}</button>
        ))}
      </div>
      <p className={s.small} role="status">{L(lang, `共 ${list.length} 条`, `${list.length} terms`)}</p>
      {list.length === 0 ? (
        <p className={s.muted}>{L(lang, '没有找到，换个说法试试。', 'No match — try another word.')}</p>
      ) : (
        <dl className={t.terms}>
          {list.map((x) => (
            <div key={x.en} className={t.term}>
              <dt>
                <span className={t.termEn}>{x.en}</span>
                <span className={t.termZh}>{x.zh}</span>
              </dt>
              <dd>
                {lang === 'en' ? x.de : x.dz}
                <span className={s.small}> · {L(lang, GLOSSARY_CATS[x.cat].zh, GLOSSARY_CATS[x.cat].en)}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}
