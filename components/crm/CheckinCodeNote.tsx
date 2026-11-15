/** 个人签到码说明页（服务器组件）：给扫到个人签到码、但不是现场工作人员的人看。 */
import Link from 'next/link';
import type { CodeEvent } from '@/lib/crm/checkinCode';
import s from './crm.module.css';

function when(d: Date, tz: string) {
  return new Intl.DateTimeFormat('zh-CN', { timeZone: tz, month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(d));
}

export function CheckinCodeNote({ ev, reg }: { ev: CodeEvent | null; reg?: string }) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 16px 64px' }}>
      <h1 className={s.h1}>这是您的个人签到码</h1>
      <p style={{ fontSize: 18, lineHeight: 1.7 }}>
        到了活动现场，<b>请把这个码出示给门口的工作人员</b>，他们扫一下就帮您签到；
        <br />
        也可以用微信<b>扫门口贴的签到码</b>，自己签到。
      </p>
      {ev ? (
        <div className={s.card} style={{ marginTop: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{ev.title}</div>
          <div style={{ marginTop: 8 }}>时间：{when(ev.starts_at, ev.timezone || 'America/Los_Angeles')}</div>
          {(ev.location_name || ev.address) && (
            <div style={{ marginTop: 4 }}>
              地点：{ev.location_name}
              {ev.address ? <div>{ev.address}</div> : null}
            </div>
          )}
          {ev.status === 'cancelled' && <div style={{ marginTop: 8, color: '#B3261E' }}>这条报名已经取消了。</div>}
          <div style={{ marginTop: 16 }}>
            <Link href={`/zh/e/${ev.slug}`} className={s.btn}>看活动详情</Link>
          </div>
        </div>
      ) : null}
      {ev && reg ? (
        // 工作人员没登录时扫到客人的个人码：登录后自动回到签到台的这条报名
        <p style={{ marginTop: 32, fontSize: 14, color: '#5B6B7F' }}>
          <a href={`/zh/staff/checkin?reg=${reg}&staff=1`} style={{ color: '#5B6B7F', textDecoration: 'underline' }}>我是工作人员 → 登录后台</a>
        </p>
      ) : !ev ? (
        <p style={{ marginTop: 24 }}>没有找到这条报名，可能链接不完整。可以在小程序「我的 → 我的报名」里重新打开签到码。</p>
      ) : null}
    </div>
  );
}
