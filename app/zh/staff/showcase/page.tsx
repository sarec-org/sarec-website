'use client';
/**
 * 1.5.0 商会风采（运营）：副会长单位、战略合作方，每家：名称、标志、简介、项目图文、联系人（会员号）、排序、下架。
 * 最上面一个开关：小程序首页显示不显示「商会风采」入口（东哥 11/14 点头：默认开，在“商会”组第二个；还没有一家可展示的单位时自动不显示）。
 * 图片先传到 /api/v1/staff/showcase/image 拿到地址，点「保存」才写进这家单位。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';
import { shrink } from '@/components/crm/staff/RoomsV12';
import { Lightbox, uploadForm, Toast } from '@/components/crm/staff/ugcShared';

type Proj = { title: string; text: string; images: string[] };
type Org = {
  id: string; kind: 'vice_president' | 'partner'; kindLabel: string; name: string; logoUrl: string | null; intro: string | null; projects: Proj[];
  contact: { name: string; token: string | null; title: string | null } | null; sortOrder: number; hidden: boolean;
};
type Form = { id: string | null; kind: 'vice_president' | 'partner'; name: string; logoUrl: string; intro: string; projects: Proj[]; contactMemberNo: string; dropContact: boolean; sortOrder: string; hidden: boolean; oldContact: string | null };

const KINDS: { key: 'vice_president' | 'partner'; label: string }[] = [
  { key: 'vice_president', label: '副会长单位' },
  { key: 'partner', label: '战略合作方' }
];
const blank = (kind: Form['kind']): Form => ({ id: null, kind, name: '', logoUrl: '', intro: '', projects: [], contactMemberNo: '', dropContact: false, sortOrder: '0', hidden: false, oldContact: null });

async function upload(file: File, kind: 'logo' | 'project'): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const fd = new FormData();
  fd.append('file', await shrink(file, 2000), file.name.replace(/\.\w+$/, '.jpg'));
  fd.append('kind', kind);
  const r = await uploadForm<{ url: string }>('/api/v1/staff/showcase/image', fd);
  return r.ok ? { ok: true, url: r.data.url } : r;
}

function Showcase() {
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [homeEntry, setHomeEntry] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const closeMsg = useCallback(() => setMsg(null), []);
  const [f, setF] = useState<Form | null>(null);
  const [busy, setBusy] = useState('');
  const [big, setBig] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ orgs: Org[]; homeEntry: boolean }>('/api/v1/staff/showcase');
    if (r.ok) { setOrgs(r.data.orgs); setHomeEntry(r.data.homeEntry); } else setMsg({ ok: false, text: r.message });
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggleHome() {
    setBusy('home');
    const r = await api<{ message: string }>('/api/v1/staff/showcase', { body: { homeEntry: !homeEntry } });
    setBusy('');
    setMsg(r.ok ? { ok: true, text: r.data.message } : { ok: false, text: r.message });
    if (r.ok) load();
  }
  function edit(o: Org) {
    setMsg(null);
    setF({
      id: o.id, kind: o.kind, name: o.name, logoUrl: o.logoUrl ?? '', intro: o.intro ?? '', projects: (o.projects ?? []).map((p) => ({ ...p, images: [...(p.images ?? [])] })),
      contactMemberNo: '', dropContact: false, sortOrder: String(o.sortOrder ?? 0), hidden: o.hidden, oldContact: o.contact?.name ?? null
    });
    setTimeout(() => document.getElementById('org-form')?.scrollIntoView({ behavior: 'smooth' }), 50);
  }
  async function save(override?: Partial<Form>, org?: Org) {
    const x = { ...f!, ...override };
    if (!x.name.trim()) return setMsg({ ok: false, text: '请填单位名称' });
    // 服务器暂时不回传原联系人的会员号：不填会员号保存会把联系人去掉，所以要明确选
    if (x.oldContact && !x.contactMemberNo && !x.dropContact) return setMsg({ ok: false, text: `现在的联系人是「${x.oldContact}」。请再填一次他的会员号（保留），或勾选「去掉联系人」` });
    const bad = x.projects.findIndex((p) => !p.title.trim() && (p.text.trim() || p.images.length));
    if (bad >= 0) return setMsg({ ok: false, text: `第 ${bad + 1} 个项目没写标题（没标题的项目不会保存）` });
    setBusy('save');
    const r = await api<{ message: string }>('/api/v1/staff/showcase', {
      body: { id: x.id ?? undefined, kind: x.kind, name: x.name, logoUrl: x.logoUrl, intro: x.intro, projects: x.projects, contactMemberNo: x.contactMemberNo || undefined, sortOrder: Number(x.sortOrder) || 0, hidden: x.hidden }
    });
    setBusy('');
    if (r.ok) {
      setMsg({ ok: true, text: org ? `${r.data.message}，${x.hidden ? '已下架，小程序里看不到了' : '已重新上架'}` : `${r.data.message}${x.hidden ? '（现在是下架状态，小程序里看不到）' : '，小程序「商会风采」里能看到'}` });
      if (!org) setF(null);
      load();
    } else setMsg({ ok: false, text: r.message });
  }
  // 列表上直接上架 / 下架：需要联系人会员号的单位（有联系人）要进编辑页做，避免把联系人清掉
  function toggleHidden(o: Org) {
    if (o.contact) { edit({ ...o, hidden: !o.hidden }); setMsg({ ok: true, text: `已打开「${o.name}」的编辑，${o.hidden ? '「下架」已取消勾选' : '「下架」已勾上'}；请填联系人会员号后点「保存」` }); return; }
    const x: Form = { ...blank(o.kind), id: o.id, name: o.name, logoUrl: o.logoUrl ?? '', intro: o.intro ?? '', projects: o.projects ?? [], sortOrder: String(o.sortOrder), hidden: !o.hidden };
    save(x, o);
  }
  async function setLogo(file: File) {
    setBusy('logo');
    const r = await upload(file, 'logo');
    setBusy('');
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setF((p) => p && { ...p, logoUrl: r.url });
    setMsg({ ok: true, text: '标志已传好，点下面「保存」后生效' });
  }
  async function addImages(i: number, files: FileList) {
    let ok = 0;
    const fails: string[] = [];
    const list = Array.from(files);
    for (let k = 0; k < list.length; k++) {
      setBusy(`正在传第 ${k + 1} / ${list.length} 张…`);
      const r = await upload(list[k], 'project');
      if (r.ok) { ok++; setF((p) => p && { ...p, projects: p.projects.map((pp, j) => (j === i ? { ...pp, images: [...pp.images, r.url].slice(0, 6) } : pp)) }); } else fails.push(r.message);
    }
    setBusy('');
    setMsg({ ok: fails.length === 0, text: `传好 ${ok} 张，点下面「保存」后生效${fails.length ? `；失败 ${fails.length} 张：${fails[0]}` : ''}（每个项目最多 6 张）` });
  }
  const setProj = (i: number, p: Partial<Proj>) => setF((x) => x && { ...x, projects: x.projects.map((pp, j) => (j === i ? { ...pp, ...p } : pp)) });

  return (
    <>
      <div className={`${styles.card} ${styles.cardGold}`}>
        <p className={styles.cardTitle}>小程序首页显示「商会风采」入口</p>
        <p style={{ margin: '0.2rem 0 0.6rem' }}>现在：<strong>{homeEntry ? '已显示' : '不显示'}</strong></p>
        <button className={`${styles.btn} ${homeEntry ? styles.btnGhost : ''}`} role="switch" aria-checked={homeEntry} disabled={busy === 'home'} onClick={toggleHome}>
          {homeEntry ? '关掉：首页不显示入口' : '打开：首页显示入口'}
        </button>
        <p className={styles.small} style={{ marginBottom: 0 }}>默认开（东哥 11/14 点头），在小程序首页“商会”组第二个、「商会介绍」后面。还没有一家可展示的单位时自动不显示；关掉开关就不显示。</p>
      </div>
      <Toast m={msg} onClose={closeMsg} />
      {busy && busy.startsWith('正在') && <p className={styles.notice} role="status">{busy}</p>}

      {!orgs && <p className={styles.muted}>正在加载…</p>}
      {orgs && KINDS.map((k) => {
        const list = orgs.filter((o) => o.kind === k.key);
        return (
          <section key={k.key}>
            <h2 className={styles.h}>{k.label}（{list.length}）</h2>
            {list.length === 0 && <p className={styles.small}>还没有{k.label}。</p>}
            {list.map((o) => (
              <div key={o.id} className={styles.card} style={{ opacity: o.hidden ? 0.7 : 1 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {o.logoUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={o.logoUrl} alt={`${o.name} 标志`} style={{ width: 64, height: 64, objectFit: 'contain', background: '#fff', borderRadius: 6, flexShrink: 0 }} />
                    : <div style={{ width: 64, height: 64, border: '1px dashed var(--line-3)', borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }} className={styles.small}>没标志</div>}
                  <div style={{ minWidth: 0 }}>
                    <p className={styles.cardTitle}>{o.name}{o.hidden && <span className={`${styles.badge} ${styles.badgeMuted}`}>已下架</span>}</p>
                    <p className={styles.small} style={{ margin: 0 }}>排序 {o.sortOrder} · 项目 {o.projects?.length ?? 0} 个 · 联系人：{o.contact ? `${o.contact.name}${o.contact.title ? `（${o.contact.title}）` : ''}` : '没设'}</p>
                    {o.intro && <p style={{ margin: '0.3rem 0 0' }}>{o.intro.length > 80 ? o.intro.slice(0, 80) + '…' : o.intro}</p>}
                  </div>
                </div>
                <div className={styles.btnRow} style={{ marginTop: '0.6rem' }}>
                  <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => edit(o)}>编辑</button>
                  <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} disabled={!!busy} onClick={() => toggleHidden(o)}>{o.hidden ? '重新上架' : '下架'}</button>
                </div>
              </div>
            ))}
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => { setMsg(null); setF(blank(k.key)); setTimeout(() => document.getElementById('org-form')?.scrollIntoView({ behavior: 'smooth' }), 50); }}>＋ 新加一家{k.label}</button>
          </section>
        );
      })}

      {f && (
        <div id="org-form" className={`${styles.card} ${styles.cardGold}`} style={{ marginTop: '1.5rem' }}>
          <p className={styles.cardTitle}>{f.id ? `编辑「${f.name}」` : '新加一家'}</p>
          <div className={styles.field}>
            <span className={styles.label}>类别</span>
            <div className={styles.chips}>
              {KINDS.map((k) => <button key={k.key} className={`${styles.chip} ${f.kind === k.key ? styles.chipOn : ''}`} aria-pressed={f.kind === k.key} onClick={() => setF({ ...f, kind: k.key })}>{k.label}</button>)}
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="sc-name">单位名称<span className={styles.required}>*</span></label>
            <input id="sc-name" className={styles.input} maxLength={40} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>标志</span>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              {f.logoUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={f.logoUrl} alt="标志" style={{ width: 80, height: 80, objectFit: 'contain', background: '#fff', borderRadius: 6 }} />
                : <span className={styles.small}>还没传</span>}
              <label className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}>
                {busy === 'logo' ? '正在传…' : f.logoUrl ? '换一张' : '选图片上传'}
                <input type="file" accept="image/*" hidden onChange={(e) => { const x = e.target.files?.[0]; if (x) setLogo(x); e.target.value = ''; }} />
              </label>
              {f.logoUrl && <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} onClick={() => setF({ ...f, logoUrl: '' })}>去掉标志</button>}
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="sc-intro">简介（600 字以内）</label>
            <textarea id="sc-intro" className={styles.textarea} maxLength={600} value={f.intro} onChange={(e) => setF({ ...f, intro: e.target.value })} />
          </div>

          <div className={styles.field}>
            <span className={styles.label}>项目图文（最多 8 个，每个最多 6 张图）</span>
            {f.projects.map((p, i) => (
              <div key={i} style={{ border: '1px solid var(--line-3)', borderRadius: 6, padding: 12, marginBottom: 10 }}>
                <p className={styles.small} style={{ margin: '0 0 6px' }}>项目 {i + 1}</p>
                <input className={styles.input} placeholder="项目标题" aria-label={`项目 ${i + 1} 标题`} maxLength={40} value={p.title} onChange={(e) => setProj(i, { title: e.target.value })} style={{ marginBottom: 8 }} />
                <textarea className={styles.textarea} placeholder="项目介绍文字" aria-label={`项目 ${i + 1} 文字`} maxLength={500} value={p.text} onChange={(e) => setProj(i, { text: e.target.value })} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8, margin: '8px 0' }}>
                  {p.images.map((u, j) => (
                    <div key={u + j} style={{ position: 'relative' }}>
                      <button onClick={() => setBig(u)} aria-label="看大图" style={{ padding: 0, border: '1px solid var(--line-3)', background: 'none', width: '100%', cursor: 'zoom-in' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u} alt={`项目 ${i + 1} 图片 ${j + 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                      </button>
                      <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} style={{ width: '100%', marginTop: 4 }} onClick={() => setProj(i, { images: p.images.filter((_, k) => k !== j) })}>去掉</button>
                    </div>
                  ))}
                </div>
                <div className={styles.btnRow}>
                  {p.images.length < 6 && (
                    <label className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}>
                      加图片
                      <input type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files?.length) addImages(i, e.target.files); e.target.value = ''; }} />
                    </label>
                  )}
                  <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} onClick={() => setF({ ...f, projects: f.projects.filter((_, k) => k !== i) })}>删掉这个项目</button>
                </div>
              </div>
            ))}
            {f.projects.length < 8 && <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => setF({ ...f, projects: [...f.projects, { title: '', text: '', images: [] }] })}>＋ 加一个项目</button>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="sc-contact">联系人会员号（小程序里显示他的名片，可「交换名片」）</label>
            {f.oldContact && <p className={styles.small} style={{ margin: 0 }}>现在的联系人：{f.oldContact}。保留的话请再填一次他的会员号。</p>}
            <input id="sc-contact" className={styles.input} inputMode="numeric" placeholder="例如 1024，可不填" value={f.contactMemberNo} onChange={(e) => setF({ ...f, contactMemberNo: e.target.value.replace(/\D/g, ''), dropContact: false })} />
            {f.oldContact && (
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 44 }}>
                <input type="checkbox" checked={f.dropContact} onChange={(e) => setF({ ...f, dropContact: e.target.checked, contactMemberNo: e.target.checked ? '' : f.contactMemberNo })} style={{ width: 22, height: 22 }} />
                去掉联系人
              </label>
            )}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="sc-sort">排序（数字小的排前面）</label>
            <input id="sc-sort" className={styles.input} inputMode="numeric" value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: e.target.value.replace(/[^\d-]/g, '') })} />
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 44, marginBottom: '1rem' }}>
            <input type="checkbox" checked={f.hidden} onChange={(e) => setF({ ...f, hidden: e.target.checked })} style={{ width: 22, height: 22 }} />
            下架（小程序里看不到，后台还留着）
          </label>
          <div className={styles.btnRow}>
            <button className={styles.btn} disabled={!!busy} onClick={() => save()}>{busy === 'save' ? '保存中…' : '保存'}</button>
            <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => { setF(null); setMsg(null); }}>不改了</button>
          </div>
        </div>
      )}
      <Lightbox url={big} onClose={() => setBig(null)} />
    </>
  );
}

export default function Page() {
  return (
    <StaffGate role="ops" title="商会风采" wide>
      {() => <Showcase />}
    </StaffGate>
  );
}
