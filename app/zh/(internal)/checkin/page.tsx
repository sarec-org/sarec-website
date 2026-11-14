/**
 * 1.4.0（改动单 D11）：/zh/checkin 不带活动名时原来是 404。
 * 改成：告诉人“请扫门口的签到码”，下面列出近期活动（点进去是报名页）。普通人打开也看得懂，不出现后台字样。
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '@/components/crm/crm.module.css';
import { listEvents } from '@/lib/crm/flow';

export const metadata: Metadata = { title: '活动签到｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

function when(iso: unknown, tz: string) {
  try {
    return new Date(String(iso)).toLocaleString('zh-CN', { timeZone: tz, month: 'numeric', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default async function CheckinIndex() {
  const events = await listEvents(false).catch(() => [] as Awaited<ReturnType<typeof listEvents>>);
  return (
    <div className={styles.page}>
      <h1 className={styles.h1}>活动签到</h1>
      <div className={styles.notice}>
        <p style={{ margin: 0, fontSize: '1.15rem' }}>
          <strong>请用微信「扫一扫」扫活动门口的签到码。</strong>
        </p>
        <p className={styles.small} style={{ margin: '0.4rem 0 0' }}>已报名的扫完自动签到；没报名的填姓名、手机两项就能签到。找不到签到码，请问现场工作人员。</p>
      </div>
      <h2 className={styles.h2}>近期活动</h2>
      {events.length === 0 && <p className={styles.muted}>最近没有安排活动。</p>}
      {events.slice(0, 8).map((e) => (
        <Link key={e.slug} href={`/zh/e/${e.slug}`} className={`${styles.card} ${styles.cardGold}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <p className={styles.cardTitle}>{e.title} ›</p>
          <p className={styles.small} style={{ margin: 0 }}>
            {when(e.startsAt, e.timezone)}（{e.tzLabel}）{e.locationName ? ` · ${e.locationName}` : ''}
          </p>
        </Link>
      ))}
      <p className={styles.small}>
        <Link href="/zh/events" style={{ color: 'var(--gold)' }}>看全部活动 ›</Link>
      </p>
    </div>
  );
}
