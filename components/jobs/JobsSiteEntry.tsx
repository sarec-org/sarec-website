'use client';
/**
 * D12：网站首页 /zh 的「找工人·接活」入口（11/20 东哥同意）。只新增这一块，不动首页已有内容。
 * 跟开关走：两个都关不出；只开一个时只出那一边的按钮。
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import st from './siteEntry.module.css';

type Sw = { find: boolean; work: boolean };
export function JobsSiteEntry() {
  const [sw, setSw] = useState<Sw | null>(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/v1/jobs/entry')
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { show?: boolean; find?: boolean; work?: boolean } | null) => {
        if (alive && j?.show) setSw({ find: j.find !== false, work: j.work !== false });
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);
  if (!sw) return null;
  return (
    <section className={st.wrap} aria-labelledby="home-jobs">
      <div className={st.band}>
        <div>
          <h2 id="home-jobs" className={st.title}>找工人 · 接活</h2>
          <p className={st.desc}>
            {sw.find && '房子要修、要装、要打理，发布活儿等对口的人联系。'}
            {sw.work && '做这一行的，登记一次，有活儿通知你。'}
          </p>
        </div>
        <div className={st.btns}>
          {sw.find && <Link href="/zh/jobs" className={`${st.btn} ${st.find}`}>找工人／施工队</Link>}
          {sw.work && <Link href="/zh/jobs" className={`${st.btn} ${st.work}`}>我要接活</Link>}
        </div>
      </div>
    </section>
  );
}
