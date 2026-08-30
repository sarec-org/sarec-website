import type { Metadata } from 'next';
import Link from 'next/link';
import { SaImage } from '@/components/shared/SaImage';
import { RevealOnView } from '@/components/shared/RevealOnView';
import { createPageMetadata } from '@/lib/seo';
import { ViewportLockScript } from '@/components/sections/research/ViewportLockScript';
import { listMemberProfiles, listMemberUnits } from '@/lib/cms/content';
import {
  EXPERTISE_LABEL,
  MEMBERSHIP_TIER_LABEL,
  RELATIONSHIP_TAG_LABEL
} from '@/lib/cms/labels';
import type { Expertise, MemberProfile, MemberUnit } from '@/lib/cms/types';
import styles from './members.module.css';
import { MembersHero } from './MembersHero';

/**
 * 会员风采总入口 —— /zh/members。
 * ------------------------------------------------------------------
 * 五个板块顺序固定:① 副会长单位荣誉墙 ② 战略伙伴与常务理事
 * ③ 会员单位名录(按专业领域分组)④ 人物风采 ⑤ 加入商会入口。
 * 第一屏(hero 之后的第一个内容板块)必须是荣誉墙,不放任何时间流内容。
 * 任何板块无数据时整块隐藏,不显示空占位。
 *
 * 【发布双闸】数据一律经 lib/cms/content 的 accessor 取得,
 * 该层只返回 published 与 publicationApproved 均为 true 的条目。
 *
 * 版式全部照抄站内既有组件(events hero / projects 卡片与 50-50 / research 索引卡),
 * 唯一经批准的偏离是 Logo 图位的 contain(见 members.module.css 文末)。
 */

export const metadata: Metadata = createPageMetadata({
  title: 'SAREC 会员风采｜中美房地产商会',
  description:
    'SAREC 中美房地产商会的会员单位与会员人物公开资料,涵盖副会长单位、战略合作伙伴、常务理事、理事与会员单位名录,按开发与投资、建筑与建材、贷款与金融、法律与税务、房地产经纪、科技与专业服务分类。',
  path: '/zh/members'
});

/** 单位 Logo 图位 —— Logo 一律 contain,任何情况下不裁切(唯一经批准的偏离)。 */
function UnitLogo({ unit, wide = false }: { unit: MemberUnit; wide?: boolean }) {
  if (!unit.logo) return null;
  return (
    <SaImage
      src={unit.logo}
      alt={`${unit.name} Logo`}
      fill
      sizes={wide ? '(max-width: 1024px) 100vw, 50vw' : '(max-width: 1024px) 100vw, 33vw'}
      filterIntensity="none"
      className={wide ? styles.logoImageWide : styles.logoImage}
    />
  );
}

/** 荣誉墙卡片 —— 规格 = projects P02 项目类型卡(.typeCard 家族),图位换成 Logo。 */
function UnitCard({ unit }: { unit: MemberUnit }) {
  return (
    <article className={styles.typeCard}>
      {unit.logo ? (
        <div className={styles.typeImageBox}>
          <UnitLogo unit={unit} />
        </div>
      ) : null}
      <div className={styles.typeText}>
        <span className={styles.typeNum}>
          {MEMBERSHIP_TIER_LABEL[unit.membershipTier]}
          {unit.relationshipTags.map((t) => ` · ${RELATIONSHIP_TAG_LABEL[t]}`).join('')}
        </span>
        <h3 className={styles.typeH3}>{unit.name}</h3>
        {unit.representative ? (
          <p className={styles.typeBody}>代表人:{unit.representative}</p>
        ) : null}
        {unit.coreBusiness ? <p className={styles.typeBody}>{unit.coreBusiness}</p> : null}
        {unit.joinedAt ? (
          <p className={styles.typeRole}>加入时间:{unit.joinedAt.replace(/-/g, '.')}</p>
        ) : null}
        <Link href={`/zh/members/units/${unit.slug}`} className={styles.featuredCta}>
          查看单位详情 →
        </Link>
      </div>
    </article>
  );
}

/**
 * 单条时的 50/50 布局 —— 结构与 className 照抄 projects 的 P03 信息卡 + 大图,
 * 与 /zh/projects 的单/多条切换同一逻辑。
 */
function FeaturedUnit({ unit }: { unit: MemberUnit }) {
  return (
    <div className={styles.featuredGrid}>
      <div className={styles.featuredCard}>
        <p className={styles.featuredAddress}>{unit.name}</p>
        <p className={styles.featuredLocation}>
          {MEMBERSHIP_TIER_LABEL[unit.membershipTier]}
          {unit.relationshipTags.map((t) => ` · ${RELATIONSHIP_TAG_LABEL[t]}`).join('')}
        </p>
        {unit.joinedAt ? (
          <div className={styles.featuredStats}>
            <div className={styles.featuredStat}>
              <span className={styles.featuredStatStatus}>
                加入 {unit.joinedAt.replace(/-/g, '.')}
              </span>
            </div>
          </div>
        ) : null}
        <div className={styles.featuredMeta}>
          {unit.representative ? (
            <p className={styles.featuredMetaRow}>
              <span className={styles.featuredMetaLabel}>代表人:</span> {unit.representative}
            </p>
          ) : null}
          {unit.coreBusiness ? (
            <p className={styles.featuredMetaRow}>
              <span className={styles.featuredMetaLabel}>核心业务:</span> {unit.coreBusiness}
            </p>
          ) : null}
        </div>
        <Link href={`/zh/members/units/${unit.slug}`} className={styles.featuredCta}>
          查看单位详情 →
        </Link>
      </div>
      {unit.logo ? (
        <div className={styles.featuredMedia}>
          <div className={styles.featuredImageBox}>
            <UnitLogo unit={unit} wide />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** 单/多条切换 —— 与 /zh/projects 同一逻辑:1 条走 50/50,≥2 条走 3 列栅格。 */
function UnitBlock({ units }: { units: MemberUnit[] }) {
  if (units.length === 1) return <FeaturedUnit unit={units[0]} />;
  return (
    <div className={styles.typesGrid}>
      {units.map((u) => (
        <UnitCard key={u.slug} unit={u} />
      ))}
    </div>
  );
}

/** 人物摘要卡 —— 规格 = projects P02 项目类型卡,图位是人物照片(照片走既有 cover)。 */
function ProfileCard({
  profile,
  unitName
}: {
  profile: MemberProfile;
  unitName: string | null;
}) {
  return (
    <article className={styles.typeCard}>
      {profile.coverImage ? (
        <div className={styles.typeImageBox}>
          <SaImage
            src={profile.coverImage}
            alt={profile.name}
            fill
            sizes="(max-width: 1024px) 100vw, 33vw"
            filterIntensity="editorial-light"
            className={styles.typeImage}
          />
        </div>
      ) : null}
      <div className={styles.typeText}>
        {profile.title ? <span className={styles.typeNum}>{profile.title}</span> : null}
        <h3 className={styles.typeH3}>{profile.name}</h3>
        {unitName ? <p className={styles.typeBody}>{unitName}</p> : null}
        <Link href={`/zh/members/profiles/${profile.slug}`} className={styles.featuredCta}>
          阅读专访 →
        </Link>
      </div>
    </article>
  );
}

export default function MembersPage() {
  const allUnits = listMemberUnits();
  const viceChairs = listMemberUnits({ tier: 'vice-chair' });
  // 战略合作伙伴按 relationshipTags 取数,可与任意级别叠加;
  // 与常务理事合并为「战略伙伴与常务理事」板块,去重后按级别 + 权重排序。
  const partners = listMemberUnits({ relationshipTag: 'strategic-partner' });
  const execDirectors = listMemberUnits({ tier: 'executive-director' });
  const tier2 = [...partners, ...execDirectors].filter(
    (u, i, arr) =>
      u.membershipTier !== 'vice-chair' && arr.findIndex((x) => x.slug === u.slug) === i
  );

  // ③ 名录:全部单位按专业领域分组(一个单位可出现在多个领域)。
  const directory = (Object.keys(EXPERTISE_LABEL) as Expertise[])
    .map((e) => ({ key: e, units: allUnits.filter((u) => u.expertise.includes(e)) }))
    .filter((g) => g.units.length > 0);

  const profiles = listMemberProfiles();
  const unitNameBySlug = new Map(allUnits.map((u) => [u.slug, u.name]));

  const hasViceChairs = viceChairs.length > 0;
  const hasTier2 = tier2.length > 0;
  const hasDirectory = directory.length > 0;
  const hasProfiles = profiles.length > 0;

  // 背景按【实际渲染顺序】交替 deep / deepest —— 板块被整块隐藏时不留同色连排。
  // hero 是 deepest,故第一个内容板块取 deep,之后逐块交替;CTA 固定 deepest。
  const rendered = [hasViceChairs, hasTier2, hasDirectory, hasProfiles];
  const bgAt = (block: number) => {
    const order = rendered.slice(0, block).filter(Boolean).length;
    return order % 2 === 0 ? styles.bgDeep : styles.bgDeepest;
  };

  // 只列出本页确实存在的锚点:板块被整块隐藏时,锚点也不出现。
  const anchors = [
    ...(hasViceChairs ? [{ href: '#vice-chairs', label: '副会长单位' }] : []),
    ...(hasTier2 ? [{ href: '#partners', label: '战略伙伴与常务理事' }] : []),
    ...(hasDirectory ? [{ href: '#directory', label: '会员单位名录' }] : []),
    ...(hasProfiles ? [{ href: '#profiles', label: '人物风采' }] : []),
    { href: '#join', label: '加入商会' }
  ];

  return (
    <main>
      <ViewportLockScript />

      <MembersHero />

      {/* 页内锚点条(无强制 Tab) */}
      <nav className={styles.anchorBar} aria-label="页内导航">
        <div className={styles.anchorBarInner}>
          {anchors.map((a) => (
            <a key={a.href} href={a.href} className={styles.anchorLink}>
              {a.label}
            </a>
          ))}
        </div>
      </nav>

      {/* ① 副会长单位荣誉墙 —— hero 之后的第一个内容板块 */}
      {hasViceChairs ? (
        <section
          className={`${styles.typesSection} ${bgAt(0)} ${styles.anchorTarget}`}
          id="vice-chairs"
        >
          <div className={styles.typesInner}>
            <span className={styles.eyebrow}>VICE CHAIRS · 副会长单位</span>
            <RevealOnView as="h2" className={styles.sectionH2}>
              副会长单位
            </RevealOnView>
            <UnitBlock units={viceChairs} />
          </div>
        </section>
      ) : null}

      {/* ② 战略合作伙伴与常务理事单位(层级低于 ①) */}
      {hasTier2 ? (
        <section
          className={`${styles.featuredSection} ${bgAt(1)} ${styles.anchorTarget}`}
          id="partners"
        >
          <div className={styles.featuredInner}>
            <span className={styles.eyebrow}>PARTNERS · 战略伙伴与常务理事</span>
            <RevealOnView as="h2" className={styles.sectionH2}>
              战略合作伙伴与常务理事单位
            </RevealOnView>
            <UnitBlock units={tier2} />
          </div>
        </section>
      ) : null}

      {/* ③ 会员单位名录(按专业领域分组) */}
      {hasDirectory ? (
        <section
          className={`${styles.indexSection} ${bgAt(2)} ${styles.anchorTarget}`}
          id="directory"
        >
          <div className={styles.indexInner}>
            <span className={styles.eyebrow}>DIRECTORY · 会员单位名录</span>
            <RevealOnView as="h2" className={styles.sectionH2}>
              会员单位名录
            </RevealOnView>
            <p className={styles.sectionLead}>按专业领域分组。同一单位可归属多个领域。</p>
            <div className={styles.indexCategories}>
              {directory.map((group) => (
                <div key={group.key} className={styles.indexCategory}>
                  <div className={styles.indexCategoryHeader}>
                    <span className={styles.indexCategoryEyebrow}>
                      {EXPERTISE_LABEL[group.key]}
                    </span>
                    <h3 className={styles.indexCategoryTitle}>
                      {EXPERTISE_LABEL[group.key]}
                    </h3>
                  </div>
                  <div className={styles.indexCardGrid}>
                    {group.units.map((u) => (
                      <Link
                        key={u.slug}
                        href={`/zh/members/units/${u.slug}`}
                        className={styles.indexCard}
                      >
                        <span className={styles.indexCardNum}>
                          {MEMBERSHIP_TIER_LABEL[u.membershipTier]}
                        </span>
                        <h4 className={styles.indexCardTitle}>{u.name}</h4>
                        {u.coreBusiness ? (
                          <p className={styles.indexCardDesc}>{u.coreBusiness}</p>
                        ) : null}
                        <span className={styles.indexCardCta}>查看单位详情 →</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ④ 人物风采(摘要卡片;全文在专访页) */}
      {hasProfiles ? (
        <section
          className={`${styles.typesSection} ${bgAt(3)} ${styles.anchorTarget}`}
          id="profiles"
        >
          <div className={styles.typesInner}>
            <span className={styles.eyebrow}>PROFILES · 人物风采</span>
            <RevealOnView as="h2" className={styles.sectionH2}>
              人物风采
            </RevealOnView>
            <div className={styles.typesGrid}>
              {profiles.map((p) => (
                <ProfileCard
                  key={p.slug}
                  profile={p}
                  unitName={p.unit ? unitNameBySlug.get(p.unit) ?? null : null}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ⑤ 加入商会入口(复用 /zh/join) */}
      <section className={`${styles.ctaSection} ${styles.anchorTarget}`} id="join">
        <div className={styles.ctaInner}>
          <RevealOnView as="h2" className={styles.ctaH2}>
            成为 SAREC 会员
          </RevealOnView>
          <p className={styles.ctaSubtitle}>
            会员单位与会员人物资料,经商会核实并取得书面同意后在此展示。
          </p>
          <div className={styles.ctaRow}>
            <Link href="/zh/join" className={styles.ctaPrimary}>
              加入商会
            </Link>
            <Link href="/zh/membership" className={styles.ctaSecondary}>
              查看会员权益
            </Link>
            <Link href="/zh/contact" className={styles.ctaSecondary}>
              联系 SAREC
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
