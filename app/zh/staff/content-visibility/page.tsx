'use client';
/**
 * 文章显示范围（后台综合优化 11/21：原来在「增长」页最下面，按第二部分挪到「内容」下面单独一页；读写还是原来的接口和设置）。
 * 每篇文章分别设置网站版和小程序版。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';

type Vis = { slug: string; title: string; defaultMp: string; mp: string; site: string };
const MP_LABEL: Record<string, string> = { full: '全文', brief: '只给简介', hide: '不显示' };

function Visibility() {
  const [vis, setVis] = useState<Vis[]>([]);
  const [raw, setRaw] = useState<Record<string, { mp?: string; site?: string }>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    const v = await api<{ items: Vis[]; raw: Record<string, { mp?: string; site?: string }> }>('/api/v1/staff/content-visibility');
    if (v.ok) {
      setVis(v.data.items);
      setRaw(v.data.raw ?? {});
    } else setMsg({ ok: false, text: v.message });
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function setScope(v: Vis, scope: 'mp' | 'site', value: string) {
    const next = { ...raw, [v.slug]: { ...(raw[v.slug] ?? {}), [scope]: value } };
    setRaw(next);
    const r = await api('/api/v1/staff/growth', { body: { key: 'content_visibility', value: next } });
    setMsg(r.ok ? { ok: true, text: `已保存：「${v.title}」${scope === 'mp' ? '小程序' : '网站'}改为${scope === 'mp' ? (value ? MP_LABEL[value] : `默认（${MP_LABEL[v.defaultMp]}）`) : value === 'hide' ? '不在列表显示' : '显示'}` } : { ok: false, text: r.message });
    load();
  }
  return (
    <>
      <p className={styles.small}>每篇文章分别设置网站版和小程序版。小程序“全文”仍会自动去掉含收益数字、金额的段落；为小程序隐藏不影响网站。网站“不在列表显示”只影响列表和搜索收录，文章链接仍可打开。</p>
      <Msg m={msg} />
      {vis.map((v) => (
        <div key={v.slug} className={styles.card}>
          <p style={{ margin: '0 0 0.5rem' }}>{v.title}</p>
          <div className={styles.inputRow}>
            <label className={styles.small} style={{ flex: '1 1 140px' }}>
              小程序
              <select className={styles.select} aria-label={`${v.title} 小程序显示`} value={raw[v.slug]?.mp ?? ''} onChange={(e) => setScope(v, 'mp', e.target.value)}>
                <option value="">默认（{MP_LABEL[v.defaultMp]}）</option>
                <option value="full">全文</option>
                <option value="brief">只给简介</option>
                <option value="hide">不显示</option>
              </select>
            </label>
            <label className={styles.small} style={{ flex: '1 1 140px' }}>
              网站
              <select className={styles.select} aria-label={`${v.title} 网站显示`} value={raw[v.slug]?.site ?? ''} onChange={(e) => setScope(v, 'site', e.target.value)}>
                <option value="">显示</option>
                <option value="hide">不在列表显示</option>
              </select>
            </label>
          </div>
        </div>
      ))}
    </>
  );
}

export default function Page() {
  return (
    <StaffGate role="ops" title="文章显示范围">
      {() => <Visibility />}
    </StaffGate>
  );
}
