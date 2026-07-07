import type { Metadata } from 'next';
import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import styles from '@/components/legal/legal.module.css';

export const metadata: Metadata = createPageMetadata({
  title: '隐私政策｜Privacy Policy｜SAREC',
  description:
    'SAREC 中美房地产商会隐私政策：如何收集、使用与保护通过网站表单、咨询、会员与合作申请获得的信息。中英双语，如有歧义以英文版本为准。',
  path: '/legal/privacy'
});

// 站点唯一隐私政策。/zh/legal/privacy 已重定向至此。
export default function PrivacyPage() {
  return (
    <article className={styles.doc}>
      <p className={styles.eyebrow}>Legal / Privacy</p>
      <h1 className={styles.title}>隐私政策</h1>
      <p className={styles.titleEn}>Privacy Policy</p>

      <div className={styles.notice}>
        <p>
          In case of any discrepancy, the English version shall prevail. / 如有歧义，以英文版本为准。
        </p>
      </div>

      <section className={styles.section}>
        <p>
          SAREC 重视客户、会员、投资人、项目方与合作伙伴的信息保护。本政策说明我们可能收集哪些信息、
          如何使用，以及在什么情况下可能与必要的专业人士或合作方共享信息。
        </p>
        <p>
          SAREC values the protection of information from clients, members, investors, project sponsors,
          and partners. This policy explains what information we may collect, how we use it, and when we
          may share it with necessary professionals or partners.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>我们可能收集的信息</h2>
        <p className={styles.h2En}>Information we may collect</p>
        <ul>
          <li>姓名、邮箱、电话、微信或其他联系方式。 / Name, email, phone, WeChat, or other contact details.</li>
          <li>
            身份类型，例如投资人、项目方、房地产同行、企业主等。 / Role, e.g. investor, project sponsor,
            real-estate professional, or business owner.
          </li>
          <li>
            会员申请、合作申请、活动报名或咨询留言中提供的资料。 / Information provided in membership or
            partnership applications, event sign-ups, or inquiries.
          </li>
          <li>网站访问、页面浏览、表单提交等基础技术信息。 / Basic technical data such as visits, page views, and form submissions.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>我们如何使用信息</h2>
        <p className={styles.h2En}>How we use information</p>
        <ul>
          <li>回复咨询、处理会员与合作申请。 / Respond to inquiries and process membership and partnership applications.</li>
          <li>安排沟通、审核、排期、活动报名与会员服务。 / Arrange communication, review, scheduling, events, and member services.</li>
          <li>改进网站内容、服务与沟通流程。 / Improve website content, services, and communication.</li>
          <li>
            在必要或经授权时，与律师、会计师、贷款机构、保险顾问、项目方等专业资源协同。 / Where necessary
            or authorized, coordinate with professionals such as attorneys, accountants, lenders,
            insurance advisors, or project sponsors.
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>信息共享与保护</h2>
        <p className={styles.h2En}>Sharing and protection</p>
        <p>
          SAREC 不以出售个人信息为目的向第三方转让信息。仅在沟通、服务协同、法律合规或经授权时，才可能与
          必要方共享。我们采取合理措施保护信息，但互联网传输与电子存储无法保证绝对安全。
        </p>
        <p>
          SAREC does not sell or transfer personal information to third parties for profit. Information
          may be shared only for communication, service coordination, legal compliance, or where
          authorized. We take reasonable measures to protect information, but no internet transmission or
          electronic storage is completely secure.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>付款信息</h2>
        <p className={styles.h2En}>Payment information</p>
        <p>
          网站的在线付款由第三方支付服务商处理。SAREC 不存储完整的银行卡号等敏感支付凭证，
          相关处理适用支付服务商自身的隐私政策。
        </p>
        <p>
          Online payments on the website are processed by a third-party payment provider. SAREC does not
          store full card numbers or similar sensitive payment credentials; such processing is governed
          by the payment provider’s own privacy policy.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>你的选择与政策更新</h2>
        <p className={styles.h2En}>Your choices and updates</p>
        <p>
          你可以要求更新、删除或停止使用你提供的信息；因法律、合规或业务记录需要保留的信息，SAREC
          可在合理期限内保存。SAREC 可能根据业务、法律或功能变化更新本政策，更新后于网站发布即生效。
        </p>
        <p>
          You may request that we update, delete, or stop using the information you provide; information
          that must be retained for legal, compliance, or business-record reasons may be kept for a
          reasonable period. SAREC may update this policy as its business, the law, or site features
          change, effective upon publication on the website.
        </p>
      </section>

      <div className={styles.linkRow}>
        <Link href="/zh/contact">联系我们 / Contact</Link>
        <Link href="/legal/membership-agreement">入会协议 / Membership Agreement</Link>
      </div>
    </article>
  );
}
