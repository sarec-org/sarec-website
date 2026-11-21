'use client';
/**
 * 后台综合优化：联系按钮（客户档案页、意向名单……和「待跟进」一致，和子任务 B 共用这一个组件）。
 * 打电话、发短信（带草稿）、发邮件（带草稿，只打开邮件程序，系统不自动发）、复制手机号去微信加好友；有微信号的显示微信号。
 * 传了 onResult：点过联系按钮回来，一键选“联系上了 / 没接 / 已约时间”。
 * 另：MemberBadge —— 会员身份一眼可见（所有列表共用）。
 */
import { useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { copyText } from '@/components/crm/client';

export type ContactResult = 'reached' | 'no_answer' | 'scheduled';
export const RESULT_LABEL: Record<ContactResult, string> = { reached: '联系上了', no_answer: '没接', scheduled: '已约时间' };

export function ContactButtons({
  phone,
  email,
  wechat,
  name,
  smsDraft,
  emailSubject,
  emailDraft,
  onResult
}: {
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  name?: string | null;
  smsDraft?: string | null;
  emailSubject?: string | null;
  emailDraft?: string | null;
  onResult?: (r: ContactResult) => void | Promise<void>;
}) {
  const [touched, setTouched] = useState(false);
  const [tip, setTip] = useState('');
  if (!phone && !email && !wechat) return <p className={styles.small} style={{ margin: '0.4rem 0 0' }}>没有留联系方式</p>;
  const big = { minHeight: 44 };
  const touch = () => setTouched(true);
  const sms = phone ? `sms:${phone}${smsDraft ? `${/iPhone|iPad|Mac/i.test(typeof navigator === 'undefined' ? '' : navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(smsDraft)}` : ''}` : '';
  const mail = email ? `mailto:${email}?subject=${encodeURIComponent(emailSubject || 'SAREC 中美房地产商会')}${emailDraft ? `&body=${encodeURIComponent(emailDraft)}` : ''}` : '';
  return (
    <div>
      <div className={styles.btnRow} style={{ flexWrap: 'wrap' }}>
        {phone && <a className={styles.btn} style={big} href={`tel:${phone}`} onClick={touch}>打电话</a>}
        {phone && <a className={`${styles.btn} ${styles.btnQuiet}`} style={big} href={sms} onClick={touch}>发短信{smsDraft ? '（带草稿）' : ''}</a>}
        {email && <a className={`${styles.btn} ${styles.btnQuiet}`} style={big} href={mail} onClick={touch}>发邮件{emailDraft ? '（带草稿）' : ''}</a>}
        {phone && (
          <button
            className={`${styles.btn} ${styles.btnQuiet}`}
            style={big}
            onClick={async () => {
              const ok = await copyText(phone);
              setTip(ok ? `已复制手机号 ${phone}，到微信「添加朋友」里粘贴搜索${name ? `「${name}」` : ''}` : '复制没成功，请手动记下号码');
              touch();
            }}
          >
            复制手机号去微信加好友
          </button>
        )}
      </div>
      {wechat && <p className={styles.small} style={{ margin: '0.3rem 0 0' }}>微信号：<b>{wechat}</b></p>}
      {tip && <p className={styles.small} style={{ margin: '0.3rem 0 0' }}>{tip}</p>}
      {onResult && touched && (
        <div className={styles.btnRow} style={{ flexWrap: 'wrap' }}>
          <span className={styles.small} style={{ alignSelf: 'center' }}>联系得怎么样？</span>
          {(Object.keys(RESULT_LABEL) as ContactResult[]).map((k) => (
            <button key={k} className={`${styles.btn} ${styles.btnSmall}`} style={big} onClick={() => onResult(k)}>{RESULT_LABEL[k]}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/** 会员身份一眼可见 */
export function MemberBadge({ isMember, tier, kind }: { isMember?: boolean | null; tier?: string | null; kind?: string | null }) {
  if (kind === 'internal') return <span className={`${styles.badge} ${styles.badgeMuted}`}>内部账号</span>;
  if (kind === 'review_demo') return <span className={`${styles.badge} ${styles.badgeMuted}`}>审核演示</span>;
  if (kind === 'test') return <span className={`${styles.badge} ${styles.badgeMuted}`}>测试</span>;
  if (!isMember && !tier) return null;
  return <span className={`${styles.badge} ${styles.badgeGreen}`}>会员{tier ? `·${tier}` : ''}</span>;
}
