'use client';
/**
 * 1.4 网站工具公共外壳：中英切换（?lang=en 或页面右上角按钮，记在本机）、页脚免责声明。
 * 网站其他页面暂时只有中文；工具页自带英文，切换只影响工具页本身。
 */
import Link from 'next/link';
import { createContext, useContext, useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n/types';
import s from '@/components/crm/crm.module.css';
import t from './tools.module.css';

const LangCtx = createContext<{ lang: Locale; setLang: (l: Locale) => void }>({ lang: 'zh', setLang: () => {} });
export const useLang = () => useContext(LangCtx);
/** 两种语言二选一 */
export const L = (lang: Locale, zh: string, en: string) => (lang === 'en' ? en : zh);

export const DISCLAIMER = {
  zh: '仅供参考，不构成投资或贷款建议。',
  en: 'For reference only. Not investment or lending advice.'
};

export function ToolShell({
  eyebrow,
  title,
  lead,
  notice,
  hideBack,
  children
}: {
  hideBack?: boolean;
  eyebrow: { zh: string; en: string };
  title: { zh: string; en: string };
  lead?: { zh: string; en: string };
  notice?: { zh: string; en: string };
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Locale>('zh');
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('lang');
    let saved: string | null = null;
    try { saved = localStorage.getItem('sarec:toolsLang'); } catch { /* 隐私模式 */ }
    const l = q === 'en' || q === 'zh' ? q : saved === 'en' ? 'en' : 'zh';
    setLangState(l);
  }, []);
  const setLang = (l: Locale) => {
    setLangState(l);
    try { localStorage.setItem('sarec:toolsLang', l); } catch { /* 隐私模式 */ }
    document.documentElement.lang = l === 'en' ? 'en' : 'zh-CN';
  };
  return (
    <LangCtx.Provider value={{ lang, setLang }}>
      <div className={`${s.page} ${s.pageWide} ${t.wrap}`}>
        <div className={t.topRow}>
          {hideBack ? <span /> : <Link href="/zh/tools" className={s.back}>← {L(lang, '全部工具', 'All tools')}</Link>}
          <div className={t.langSwitch} role="group" aria-label="Language">
            <button type="button" className={lang === 'zh' ? t.langOn : t.langBtn} onClick={() => setLang('zh')} aria-pressed={lang === 'zh'}>中文</button>
            <button type="button" className={lang === 'en' ? t.langOn : t.langBtn} onClick={() => setLang('en')} aria-pressed={lang === 'en'}>EN</button>
          </div>
        </div>
        <p className={s.eyebrow}>{L(lang, eyebrow.zh, eyebrow.en)}</p>
        <h1 className={s.h1}>{L(lang, title.zh, title.en)}</h1>
        {notice && <p className={t.notice}>{L(lang, notice.zh, notice.en)}</p>}
        {lead && <p className={s.lead}>{L(lang, lead.zh, lead.en)}</p>}
        {children}
        <p className={t.disclaimer}>{L(lang, DISCLAIMER.zh, DISCLAIMER.en)}</p>
      </div>
    </LangCtx.Provider>
  );
}

/** 数字输入：显示千分位，手机弹数字键盘，字号 ≥16px（防 iOS 放大） */
export function NumField({
  label,
  value,
  onChange,
  suffix,
  prefix,
  step,
  hint
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  prefix?: string;
  step?: number;
  hint?: string;
}) {
  const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 4 }) : '');
  const [text, setText] = useState(fmt(value));
  const [focus, setFocus] = useState(false);
  useEffect(() => { if (!focus) setText(fmt(value)); }, [value, focus]);
  return (
    <label className={s.field}>
      <span className={s.label}>{label}</span>
      <span className={t.numWrap}>
        {prefix && <span className={t.affix}>{prefix}</span>}
        <input
          className={`${s.input} ${t.num}`}
          inputMode="decimal"
          value={text}
          step={step}
          onFocus={() => setFocus(true)}
          onBlur={() => { setFocus(false); setText(fmt(value)); }}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d.,-]/g, '');
            setText(raw);
            const n = Number(raw.replace(/,/g, ''));
            if (raw.trim() === '') onChange(0);
            else if (Number.isFinite(n)) onChange(n);
          }}
        />
        {suffix && <span className={t.affix}>{suffix}</span>}
      </span>
      {hint && <span className={s.small}>{hint}</span>}
    </label>
  );
}
