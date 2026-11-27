'use client';
/**
 * 指令 95「内容 › 看板」（运营）：小程序首页搜索框下面那一行滚动消息 + 「全部」看板页。
 * - 发通知：一句话（≤ 60 字）＋可选链接（选活动 / 选页面 / 填网址），可置顶、可设显示到哪天；手机上三步发完（写 → 选去哪（可跳过）→ 发出去）。
 * - 通知列表：置顶 / 取消置顶、改显示到哪天、立即撤下。
 * - 现在首页滚的是哪几条（和小程序拿到的同一份数据，不走缓存）。
 * - 每种自动消息一个开关（crm_settings.board_auto）。全部记操作记录。
 */
import { useHashScroll } from '@/components/crm/staff/useHashScroll';
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';
import { Toast } from '@/components/crm/staff/ugcShared';

type Link = string | { web: string } | null;
type Item = { id: string; kind: string; color: string; text: string; link: Link; time: string; until: string };
type Notice = {
  id: string; text: string; linkLabel: string; pinned: boolean; endsOn: string | null; until: string; untilDefault: boolean; createdBy: string; createdAt: string;
  status: 'live' | 'scheduled' | 'expired' | 'removed'; statusLabel: string;
};
type Switch = { kind: string; label: string; desc: string; color: string; on: boolean; count: number };
type Data = {
  today: string; textMax: number; notices: Notice[]; switches: Switch[];
  preview: { ticker: Item[]; pinned: (Item & { sub: string })[]; items: Item[]; dayCount: number; itemCount: number };
  events: { id: string; title: string; date: string }[]; pages: { path: string; label: string }[];
};
type LinkType = 'none' | 'event' | 'page' | 'web';
const LINK_TYPES: { k: LinkType; label: string }[] = [
  { k: 'none', label: '不跳转' }, { k: 'event', label: '选活动' }, { k: 'page', label: '选页面' }, { k: 'web', label: '填网址' }
];
const linkText = (l: Link) => (!l ? '不跳转' : typeof l === 'string' ? l : `网址 ${l.web}`);
const when = (s: string) => new Date(s).toLocaleString('zh-CN', { timeZone: 'America/Los_Angeles', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
const dot = (c: string) => <span aria-hidden style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 6, background: c, marginRight: 8, flex: '0 0 auto' }} />;

function Board() {
  const [d, setD] = useState<Data | null>(null);
  useHashScroll(!!d);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const closeMsg = useCallback(() => setMsg(null), []);
  const [busy, setBusy] = useState('');
  // 发通知
  const [text, setText] = useState('');
  const [lt, setLt] = useState<LinkType>('none');
  const [evId, setEvId] = useState('');
  const [page, setPage] = useState('');
  const [url, setUrl] = useState('');
  const [pinned, setPinned] = useState(false);
  const [endsOn, setEndsOn] = useState('');
  // 改显示到哪天
  const [endEdit, setEndEdit] = useState<{ id: string; v: string } | null>(null);
  const [showOld, setShowOld] = useState(false);

  const load = useCallback(async () => {
    const r = await api<Data>('/api/v1/staff/board');
    if (r.ok) setD(r.data);
    else setMsg({ ok: false, text: r.message });
  }, []);
  useEffect(() => { load(); }, [load]);

  async function post(body: Record<string, unknown>, tag: string): Promise<boolean> {
    setBusy(tag);
    const r = await api<{ message: string }>('/api/v1/staff/board', { body });
    setBusy('');
    setMsg(r.ok ? { ok: true, text: r.data.message } : { ok: false, text: r.message });
    if (r.ok) load();
    return r.ok;
  }
  async function send() {
    const link = lt === 'event' ? { type: 'event', id: evId } : lt === 'page' ? { type: 'page', path: page } : lt === 'web' ? { type: 'web', url } : null;
    if (await post({ action: 'create', text, link, pinned, endsOn: endsOn || null }, 'send')) {
      setText(''); setLt('none'); setEvId(''); setPage(''); setUrl(''); setPinned(false); setEndsOn('');
    }
  }

  if (!d) return <><Toast m={msg} onClose={closeMsg} /><p className={styles.muted}>正在加载…</p></>;
  const n = Array.from(text.trim()).length;
  const linkReady = lt === 'none' || (lt === 'event' && !!evId) || (lt === 'page' && !!page) || (lt === 'web' && url.trim().startsWith('https://'));
  const live = d.notices.filter((x) => x.status === 'live' || x.status === 'scheduled');
  const old = d.notices.filter((x) => x.status === 'expired' || x.status === 'removed');

  return (
    <>
      <p className={styles.lead}>小程序首页搜索框下面那一行「看板」，每 3 秒滚一条；点「全部」是看板页（置顶的在最上面，下面按天列）。每条都有自己的「显示到哪天」，过了自动撤，不用人管。大部分消息是自动来的（下面可以分别关），这里也能手动发一句话通知。改动 1 分钟内小程序能看到。</p>
      <Toast m={msg} onClose={closeMsg} />
      <div className={styles.btnRow} style={{ marginBottom: '0.8rem' }}>
        <a href="#send" className={styles.btn}>＋ 发通知</a>
        <a href="#preview" className={`${styles.btn} ${styles.btnGhost}`}>现在首页滚的是哪几条</a>
        <a href="#auto" className={`${styles.btn} ${styles.btnGhost}`}>自动消息开关</a>
      </div>

      {/* ① 发通知：手机上三步——写一句话 → 选去哪（可不选）→ 发出去 */}
      <h2 className={styles.h} id="send" style={{ scrollMarginTop: 140 }}>发通知</h2>
      <div className={styles.card}>
        <label className={styles.small} htmlFor="bn-text" style={{ display: 'block', fontWeight: 600 }}>1. 写一句话（{n}/{d.textMax} 字）</label>
        <textarea id="bn-text" className={styles.textarea} rows={2} maxLength={d.textMax + 10} value={text} placeholder="例如：12 月会员大会改到 12/12（周五）晚 7 点，地点不变"
          onChange={(e) => setText(e.target.value)} style={{ width: '100%', margin: '4px 0 10px' }} />
        {n > d.textMax && <p className={styles.error} style={{ marginTop: -6 }}>超了 {n - d.textMax} 个字</p>}

        <p className={styles.small} style={{ margin: '0 0 4px', fontWeight: 600 }}>2. 点了去哪（可以不选）</p>
        <div className={styles.chips} role="radiogroup" aria-label="点了去哪" style={{ marginBottom: 8 }}>
          {LINK_TYPES.map((t) => (
            <button key={t.k} type="button" role="radio" aria-checked={lt === t.k} className={`${styles.chip} ${lt === t.k ? styles.chipOn : ''}`} onClick={() => setLt(t.k)}>{t.label}</button>
          ))}
        </div>
        {lt === 'event' && (
          <select aria-label="选活动" className={styles.select} value={evId} onChange={(e) => setEvId(e.target.value)} style={{ maxWidth: 480 }}>
            <option value="">请选一场活动</option>
            {d.events.map((e) => <option key={e.id} value={e.id}>{e.date} {e.title}</option>)}
          </select>
        )}
        {lt === 'page' && (
          <select aria-label="选页面" className={styles.select} value={page} onChange={(e) => setPage(e.target.value)} style={{ maxWidth: 480 }}>
            <option value="">请选一个小程序页面</option>
            {d.pages.map((p) => <option key={p.path} value={p.path}>{p.label}</option>)}
          </select>
        )}
        {lt === 'web' && (
          <input aria-label="网址" className={styles.input} inputMode="url" value={url} placeholder="https://…" onChange={(e) => setUrl(e.target.value)} style={{ maxWidth: 480 }} />
        )}

        <details style={{ margin: '6px 0 10px' }}>
          <summary className={styles.small} style={{ cursor: 'pointer' }}>置顶 / 显示到哪天（可不设：不设就发出 7 天后自动撤）</summary>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 6 }}>
            <label className={styles.small} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> 置顶（永远排最前，看板页最上面醒目显示）
            </label>
            <label className={styles.small} htmlFor="bn-end">显示到哪天（含这天）
              <input id="bn-end" type="date" className={styles.input} min={d.today} value={endsOn} onChange={(e) => setEndsOn(e.target.value)} style={{ maxWidth: 200, margin: '0 0 0 6px' }} />
            </label>
          </div>
        </details>

        <button className={`${styles.btn} ${styles.btnBlock}`} disabled={!!busy || n === 0 || n > d.textMax || !linkReady} onClick={send}>
          {busy === 'send' ? '正在发…' : '3. 发出去'}
        </button>
        <p className={styles.small} style={{ margin: '6px 0 0' }}>发之前会过一遍禁用词和微信内容检测；不能写收款、赌博相关的字。</p>
      </div>

      {/* ② 现在首页滚的是哪几条 */}
      <h2 className={styles.h} id="preview" style={{ scrollMarginTop: 140 }}>现在首页滚的是哪几条（{d.preview.ticker.length} 条）</h2>
      <div className={styles.card}>
        {d.preview.ticker.length === 0 ? (
          <p className={styles.small} style={{ margin: 0 }}>现在一条都没有——小程序首页不显示看板这一行。</p>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
            {d.preview.ticker.map((it, i) => (
              <li key={it.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderTop: i ? '1px solid rgba(127,127,127,.3)' : 0, overflowWrap: 'anywhere' }}>
                <span className={styles.small} style={{ width: 22, flex: '0 0 auto' }}>{i + 1}</span>
                {dot(it.color)}
                <span style={{ flex: 1 }}>
                  {d.preview.pinned.some((p) => p.id === it.id) && <span className={styles.badge} style={{ marginRight: 6 }}>置顶</span>}
                  {it.text}
                  <span className={styles.small} style={{ display: 'block' }}>{d.switches.find((s) => s.kind === it.kind)?.label ?? '工作人员通知'} · 点了去 {linkText(it.link)} · 显示到 {it.until}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
        <p className={styles.small} style={{ margin: '8px 0 0' }}>看板页（「全部」）现在有 {d.preview.itemCount} 条、分 {d.preview.dayCount} 天{d.preview.pinned.length ? `，另有置顶 ${d.preview.pinned.length} 条` : ''}。</p>
        {d.preview.items.length > 0 && (
          <details style={{ marginTop: 6 }} id="all">
            <summary className={styles.small} style={{ cursor: 'pointer' }}>看板页全部 {d.preview.items.length} 条，每条什么时候自动撤</summary>
            <ul style={{ margin: '6px 0 0', paddingLeft: 0, listStyle: 'none' }}>
              {d.preview.items.map((it) => (
                <li key={it.id} className={styles.small} style={{ display: 'flex', alignItems: 'center', padding: '3px 0', overflowWrap: 'anywhere' }}>
                  {dot(it.color)}<span style={{ flex: 1 }}>{it.text}</span><span style={{ flex: '0 0 auto', marginLeft: 8 }}>显示到 {it.until}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* ③ 通知 */}
      <h2 className={styles.h} id="notices" style={{ scrollMarginTop: 140 }}>手动发的通知（显示中 {live.length} 条）</h2>
      {live.length === 0 && <p className={styles.small}>现在没有手动发的通知。</p>}
      {[...live, ...(showOld ? old : [])].map((x) => (
        <div key={x.id} className={styles.card} style={{ opacity: x.status === 'live' || x.status === 'scheduled' ? 1 : 0.6 }}>
          <p className={styles.cardTitle} style={{ overflowWrap: 'anywhere' }}>
            {x.pinned && <span className={styles.badge} style={{ marginRight: 6 }}>置顶</span>}
            {x.text}
            <span className={`${styles.badge} ${x.status === 'live' ? styles.badgeGreen : styles.badgeMuted}`}>{x.statusLabel}</span>
          </p>
          <p className={styles.small} style={{ margin: '0 0 6px', overflowWrap: 'anywhere' }}>
            {x.linkLabel} · {x.createdBy} {when(x.createdAt)} 发 · {`自动撤：显示到 ${x.until}（含这天）${x.untilDefault ? '，没设日子，默认发出 7 天' : ''}`}
          </p>
          {(x.status === 'live' || x.status === 'scheduled') && (
            endEdit?.id === x.id ? (
              <div className={styles.btnRow}>
                <input type="date" aria-label="显示到哪天" className={styles.input} min={d.today} value={endEdit.v} onChange={(e) => setEndEdit({ id: x.id, v: e.target.value })} style={{ maxWidth: 200, margin: 0 }} />
                <button className={`${styles.btn} ${styles.btnSmall}`} disabled={!!busy} onClick={async () => { if (await post({ action: 'set_end', id: x.id, endsOn: endEdit.v || null }, 'end' + x.id)) setEndEdit(null); }}>保存</button>
                <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} onClick={() => setEndEdit(null)}>取消</button>
              </div>
            ) : (
              <div className={styles.btnRow}>
                <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} disabled={!!busy} onClick={() => post({ action: 'pin', id: x.id, pinned: !x.pinned }, 'pin' + x.id)}>{x.pinned ? '取消置顶' : '置顶'}</button>
                <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} disabled={!!busy} onClick={() => setEndEdit({ id: x.id, v: x.endsOn ?? '' })}>设显示到哪天</button>
                <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} disabled={!!busy} onClick={() => { if (window.confirm(`立即撤下「${x.text}」？`)) post({ action: 'remove', id: x.id }, 'rm' + x.id); }}>立即撤下</button>
              </div>
            )
          )}
        </div>
      ))}
      {old.length > 0 && (
        <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} onClick={() => setShowOld(!showOld)}>{showOld ? '收起' : `看已撤下 / 已到期的（${old.length}）`}</button>
      )}

      {/* ④ 自动消息开关 */}
      <h2 className={styles.h} id="auto" style={{ scrollMarginTop: 140 }}>自动消息开关</h2>
      <p className={styles.small}>都从已公开 / 已过检测的东西里自动生成，不开放用户发帖。同一天同一种满 3 条合成一条。关掉后 1 分钟内首页不再出这一种。</p>
      {d.switches.map((s) => (
        <div key={s.kind} className={styles.card} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {dot(s.color)}
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <p className={styles.cardTitle} style={{ margin: 0 }}>{s.label} {s.on ? <span className={`${styles.badge} ${styles.badgeGreen}`}>开着</span> : <span className={`${styles.badge} ${styles.badgeMuted}`}>关着</span>}</p>
            <p className={styles.small} style={{ margin: 0, overflowWrap: 'anywhere' }}>{s.desc}{s.on ? ` · 现在看板上 ${s.count} 条` : ''}</p>
          </div>
          <button className={`${styles.btn} ${s.on ? styles.btnGhost : ''} ${styles.btnSmall}`} disabled={!!busy} aria-label={`${s.on ? '关掉' : '打开'}${s.label}`}
            onClick={() => { if (!s.on || window.confirm(`关掉「${s.label}」？关掉后首页看板不再出这一种。`)) post({ action: 'switch', kind: s.kind, on: !s.on }, 'sw' + s.kind); }}>
            {s.on ? '关掉' : '打开'}
          </button>
        </div>
      ))}
    </>
  );
}

export default function Page() {
  return (
    <StaffGate title="看板" role="ops" wide>
      {() => <Board />}
    </StaffGate>
  );
}
