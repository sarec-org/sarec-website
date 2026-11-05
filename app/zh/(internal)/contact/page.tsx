import type { Metadata } from 'next';
import { ContactInquiryForm } from './contact-inquiry-form';
import { createPageMetadata } from '@/lib/seo';
import { contactCopy, partnerNetwork } from '@/lib/sitePagesCopy';
import styles from './contact.module.css';

export const metadata: Metadata = createPageMetadata({
  title: '联系 SAREC｜中美房地产商会',
  description:
    '不论你是想了解 SAREC、看具体项目、加入会员，还是参加活动——都可以从这里开始。SAREC 在 1 个工作日内回复。',
  path: '/zh/contact'
});

const intents = contactCopy.intents;
const processSteps = contactCopy.steps;
const partners = partnerNetwork;

const faqs = [
  {
    code: 'Q1',
    question: '提交表单后多久会收到回复？',
    answer: (
      <>
        <p>SAREC 团队会在 1 个工作日内回复（美国西部时间）。</p>
        <p>如果你提交时间为节假日或周末，回复时间可能略有延迟，但不超过 2 个工作日。</p>
        <p>
          如果超过 2 个工作日仍未收到回复，可发送邮件至 info@sinoamericanrec.org 确认。
        </p>
      </>
    )
  },
  {
    code: 'Q2',
    question: '我的信息会被如何使用？',
    answer: (
      <>
        <p>你提交的信息仅用于 SAREC 内部联系和服务匹配，包括：</p>
        <ul>
          <li>SAREC 团队回复</li>
          <li>安排 30 分钟沟通</li>
          <li>匹配你的需求与 SAREC 服务</li>
        </ul>
        <p>不会用于以下用途：</p>
        <ul>
          <li>出售或转让给第三方</li>
          <li>用于无关营销</li>
          <li>公开或分享给其他客户</li>
        </ul>
        <p>详见 Footer 法律声明。</p>
      </>
    )
  },
  {
    code: 'Q3',
    question: '通话有费用吗？',
    answer: (
      <>
        <p>30 分钟初次沟通通话没有任何前置费用。</p>
        <p>通话后是否进一步合作，双方各自判断。</p>
        <p>
          如进入会员服务、项目咨询或项目协作，相应的会员费、咨询费、合作条款，按 SAREC
          三类服务入口和单独协议约定。
        </p>
      </>
    )
  }
];

export default function ContactPage() {
  return (
    <main className={styles.page}>
      {/* CT01 / Hero */}
      <section className={styles.section}>
        <div className={styles.containerNarrow}>
          <span className={styles.eyebrow}>CONTACT · 联系</span>
          <h1 className={styles.h1}>联系 SAREC</h1>
          <p className={styles.lead}>
            不论你是想了解 SAREC、看具体项目、加入会员，还是参加活动 ——
            都可以从这里开始。
          </p>
          <p className={styles.lead}>我们 1 个工作日内回复。</p>
        </div>
      </section>

      {/* CT02 / 4 个意图分流 */}
      <section className={`${styles.section} ${styles.sectionDeep}`}>
        <div className={styles.container}>
          <span className={styles.eyebrow}>CHOOSE YOUR PATH · 选择你的入口</span>
          <h2 className={styles.h2}>4 种入口</h2>
          <p className={styles.lead}>
            不同需求走不同入口。选择最匹配你的方式，下方表单会自动预填需求类型。
          </p>

          <div className={styles.intentGrid}>
            {intents.map((it) => (
              <article
                key={it.code}
                id={it.intentKey === 'evaluate' ? 'project-evaluation' : undefined}
                className={styles.intentCard}
              >
                <p className={styles.intentCode}>{it.code} /</p>
                <h3 className={styles.intentTitle}>{it.title}</h3>

                <div className={styles.intentBlock}>
                  <p className={styles.label}>适合</p>
                  <ul className={styles.intentList}>
                    {it.fit.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>

                <div className={styles.intentBlock}>
                  <p className={styles.label}>{it.detailLabel}</p>
                  <ul className={styles.intentList}>
                    {it.detail.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>

                <a
                  href={it.intentKey === 'membership' ? '/zh/join' : `/zh/contact?intent=${it.intentKey}#inquiry-form`}
                  className={styles.intentCTA}
                >
                  <span>{it.cta}</span>
                  <span className={styles.intentCTAArrow} aria-hidden="true">
                    →
                  </span>
                </a>
              </article>
            ))}
          </div>

          <p className={styles.intentNote}>
            如果你属于上述四类的任意组合，或不确定自己属于哪一类 ——
            选择&quot;预约 30 分钟沟通&quot;，我们一起判断。
          </p>
        </div>
      </section>

      {/* CT03 / 提交表单 */}
      <section className={styles.section} id="inquiry-form">
        <div className={styles.container}>
          <div className={styles.formIntro}>
            <span className={styles.eyebrow}>SUBMIT INQUIRY · 提交联系表单</span>
            <h2 className={styles.h2}>提交联系表单</h2>
            <p className={styles.lead} style={{ margin: '0 auto' }}>
              简单填写以下信息，SAREC 会根据资料完整度、项目阶段和合作可能性，判断下一步是否适合继续沟通。
            </p>
          </div>
          <ContactInquiryForm />
        </div>
      </section>

      {/* CT04 / 4 步沟通预期 */}
      <section className={`${styles.section} ${styles.sectionDeep}`}>
        <div className={styles.container}>
          <span className={styles.eyebrow}>WHAT TO EXPECT · 提交后会发生什么</span>
          <h2 className={styles.h2}>4 步沟通流程</h2>
          <p className={styles.lead}>
            SAREC 的联系流程是双向判断 —— 你判断我们是不是合适的合作方，我们判断你是不是合适的客户。
            匹配则深入合作，不匹配也告诉你。
          </p>

          <div className={styles.stepsGrid}>
            {processSteps.map((s) => (
              <article key={s.code} className={styles.stepCard}>
                <p className={styles.stepNumber}>{s.code} /</p>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepBody}>{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CT05 / 5 类专业服务伙伴 */}
      <section className={styles.section}>
        <div className={styles.container}>
          <span className={styles.eyebrow}>OTHER NEEDS · 其他需求</span>
          <h2 className={styles.h2}>不是房地产需求？</h2>
          <p className={styles.lead}>
            SAREC 主叙事聚焦美国房地产项目判断、风险控制和资本合作。如果你的核心需求是其他领域 ——
            我们也可以推荐我们的专业服务伙伴网络。
          </p>

          <div className={styles.partnersGrid}>
            {partners.map((p) => (
              <article key={p.code} className={styles.partnerCard}>
                <p className={styles.partnerCode}>{p.code} /</p>
                <h3 className={styles.partnerTitle}>{p.title}</h3>
                <p className={styles.partnerBody}>{p.body}</p>
              </article>
            ))}
          </div>

          <p className={styles.intentNote}>
            <span className={styles.label} style={{ marginRight: 8 }}>[note]</span>
            具体合作方式以单独协议为准。如需推荐 ——
            请在表单的&quot;你想聊什么&quot;中简要说明你的需求，我们会引荐相应的专业服务伙伴。
          </p>
        </div>
      </section>

      {/* CT06 / FAQ 3 题 */}
      <section className={`${styles.section} ${styles.sectionDeep}`}>
        <div className={styles.container}>
          <span className={styles.eyebrow}>FAQ · 常见问题</span>
          <h2 className={styles.h2}>联系常见问题</h2>

          <div className={styles.faqList}>
            {faqs.map((q) => (
              <div key={q.code} className={styles.faqItem}>
                <h3 className={styles.faqQuestion}>
                  <span className={styles.faqQuestionCode}>{q.code} /</span>
                  <span>{q.question}</span>
                </h3>
                <div className={styles.faqAnswer}>{q.answer}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CT07 / 直接联系方式 */}
      <section className={styles.section}>
        <div className={styles.container}>
          <span className={styles.eyebrow}>DIRECT CONTACT · 直接联系</span>
          <h2 className={styles.h2}>直接联系 SAREC</h2>
          <p className={styles.lead}>如果你更愿意直接发送邮件 ——</p>

          <div className={styles.directGrid}>
            <div className={styles.directBlock}>
              <a
                href="mailto:info@sinoamericanrec.org"
                className={styles.directEmail}
              >
                info@sinoamericanrec.org
              </a>
              <p className={styles.directLine}>我们会在 1 个工作日内回复（美国西部时间）。</p>
            </div>

            <div className={styles.directBlock}>
              <p className={styles.label}>机构信息</p>
              <p className={styles.directLine}>
                Sino-American Real Estate Chamber (SAREC)
              </p>
              <p className={styles.directLine}>中美房地产商会</p>
              <p className={styles.directLineMute}>总部所在:洛杉矶 · 中美双语</p>
              <p className={styles.directLineMute}>
                官方网站:https://sinoamericanrec.org
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
