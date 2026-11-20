'use client';
/** /zh/jobs/post/done：发布成功——说清接下来会发生什么 */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import s from '@/components/crm/crm.module.css';
import j from './jobs.module.css';
import { BottomBar, JobsShell } from './shared';

export function PostDone() {
  const sp = useSearchParams();
  const ids = (sp.get('ids') ?? '').split(',').filter(Boolean);
  return (
    <JobsShell
      side="find"
      need="find"
      back={null}
      eyebrow="找工人／施工队"
      title={ids.length > 1 ? `发好了，拆成了 ${ids.length} 条活儿` : '发好了'}
      footer={() => (
        <BottomBar>
          <Link href="/zh/jobs/my-posts" className={`${s.btn} ${j.btnFind}`}>看我发的活儿</Link>
        </BottomBar>
      )}
    >
      {() => (
        <>
          <div className={s.success}>你的活儿已经发出去了。{ids.length > 1 ? `每个工种一条，共 ${ids.length} 条，分别通知对口的人。` : ''}</div>
          <p className={s.cardTitle}>接下来会这样：</p>
          <ol className={j.steps}>
            <li>现在：做这一行、在你城市服务、核验通过的人会收到通知（施工队招工人的，通知登记了的工人）。</li>
            <li>有人看了你的电话，会直接打给你或加你微信；谁看过你的电话，在「我发的活儿」里都能看到。</li>
            <li>24 小时还没人联系，系统会再通知下一批人，商会工作人员也会帮你看一眼。</li>
            <li>价钱、合同、付款都由你和对方自己谈，商会不参与。</li>
            <li>找到人了，请在「我发的活儿」里点“已找到”；活儿 14 天后自动下架，到期前会提醒你一键续期。</li>
            <li>第 7 天，我们会问你一次：联系上了吗、成了吗、满意吗（点一下就行，只给工作人员看）。</li>
          </ol>
          <p className={s.small}>完整地址不会公开；只有有资格的人点了“联系发布人”才看得到你的电话。</p>
          {ids.length > 0 && (
            <div className={s.btnRow} style={{ marginTop: '1rem' }}>
              {ids.map((id, i) => (
                <Link key={id} href={`/zh/jobs/posts/${id}`} className={`${s.btn} ${s.btnQuiet}`}>看第 {i + 1} 条</Link>
              ))}
            </div>
          )}
          <p style={{ marginTop: '1rem' }}><Link href="/zh/jobs" style={{ color: 'var(--ivory)' }}>‹ 回找工人 · 接活</Link></p>
        </>
      )}
    </JobsShell>
  );
}
