'use client';
/**
 * 增长（1.2；1.4.0 由“增长与设置”改名，东哥已点头）：点击统计、推荐排行（只给工作人员看）、专委会意向；
 * 商会微信二维码（报名成功页 / 首页 / 会议室“联系预约”用，换图不用发版本）、视频号 ID、专委会状态、内容显示范围。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';

type Stat = { name: string; target: string | null; client: string; n: number; people: number };
type Ref = { id: string; member_no: number; name: string; visits: number; registered: number; arrived: number; first_referred: number; joined: number; inquiries: number };
type Committee = { key: string; name: string; status: 'active' | 'preparing' };
type Vis = { slug: string; title: string; defaultMp: string; mp: string; site: string };
type Data = { track: { byName: Stat[] }; referrals: Ref[]; committees: { committee: string; n: number; names: string[] }[]; settings: Record<string, unknown>; wecom?: { configured: boolean; callback: boolean; working: boolean; byPlacement: { placement: string | null; label: string; adds: number; matched: number }[] } };

const NAME: Record<string, string> = {
  home_entry: '首页入口', share: '分享', share_timeline: '分享到朋友圈', poster: '生成海报', poster_save: '保存海报', card_open: '名片打开', card_share: '名片分享',
  visit: '带来源访问', status_action: '状态卡主按钮', wechat_qr: '查看商会微信', channels: '视频号', album_open: '打开相册', agent_open: '打开 AI 助手'
};
const MP_LABEL: Record<string, string> = { full: '全文', brief: '只给简介', hide: '不显示' };

function Growth() {
  const [days, setDays] = useState(30);
  const [d, setD] = useState<Data | null>(null);
  const [vis, setVis] = useState<Vis[]>([]);
  const [raw, setRaw] = useState<Record<string, { mp?: string; site?: string }>>({});
  const [channels, setChannels] = useState('');
  // 1.3
  const [topic, setTopic] = useState('');
  const [oa, setOa] = useState('');
  const [compMax, setCompMax] = useState('2');
  const [prompts, setPrompts] = useState<Record<string, boolean>>({ enabled: true, afterRegister: true, afterPhoto: true, nextEvent: true });
  const [comms, setComms] = useState<Committee[]>([]);
  const [wecomUsers, setWecomUsers] = useState('');
  const [recapDays, setRecapDays] = useState('7');
  const [inviteText, setInviteText] = useState<Record<string, string>>({ title: '', intro: '' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const r = await api<Data>(`/api/v1/staff/growth?days=${days}`);
    if (r.ok) {
      setD(r.data);
      setChannels(String(r.data.settings.channels_finder_id ?? ''));
      setTopic(String(r.data.settings.photo_topic ?? ''));
      setOa(String(r.data.settings.oa_username ?? ''));
      setCompMax(String(r.data.settings.companions_max ?? 2));
      if (r.data.settings.invite_prompts) setPrompts(r.data.settings.invite_prompts as Record<string, boolean>);
      setComms((r.data.settings.committees as Committee[]) ?? []);
      setWecomUsers(String(r.data.settings.wecom_userids ?? ''));
      setRecapDays(String(r.data.settings.home_recap_days ?? 7));
      setInviteText({ title: '', intro: '', ...((r.data.settings.invite_card_text as Record<string, string>) ?? {}) });
    } else setMsg({ ok: false, text: r.message });
    const v = await api<{ items: Vis[]; raw: Record<string, { mp?: string; site?: string }> }>('/api/v1/staff/content-visibility');
    if (v.ok) { setVis(v.data.items); setRaw(v.data.raw ?? {}); }
  }, [days]);
  useEffect(() => { load(); }, [load]);

  async function save(key: string, value: unknown) {
    const r = await api('/api/v1/staff/growth', { body: { key, value } });
    setMsg(r.ok ? { ok: true, text: '已保存' } : { ok: false, text: r.message });
    load();
  }
  function setScope(slug: string, scope: 'mp' | 'site', value: string) {
    const next = { ...raw, [slug]: { ...(raw[slug] ?? {}), [scope]: value } };
    setRaw(next);
    save('content_visibility', next);
  }

  return (
    <>
      {msg && <p className={msg.ok ? styles.success : styles.error} role="status">{msg.text}</p>}
      <div className={styles.chips}>
        {[7, 30, 90].map((n) => <button key={n} className={`${styles.chip} ${days === n ? styles.chipOn : ''}`} onClick={() => setDays(n)}>最近 {n} 天</button>)}
      </div>

      {/* 1.4.0：「换商会微信二维码」已挪进「设置」页（东哥已点头），这里只留一句指路 */}
      <p className={styles.notice}>换商会微信二维码：在<a href="/zh/staff/settings#wechat-qr" style={{ color: 'var(--gold)' }}>「设置」页</a>（管理员）。</p>

      <h2 className={styles.h2}>点击统计</h2>
      {d && (d.track.byName.length === 0 ? <p className={styles.muted}>这段时间还没有打点数据。</p> : (
        <table className={styles.table}>
          <thead><tr><th>事件</th><th>入口 / 目标</th><th>端</th><th>次数</th><th>人数</th></tr></thead>
          <tbody>
            {d.track.byName.map((s, i) => (
              <tr key={i}><td>{NAME[s.name] ?? s.name}</td><td className={styles.small}>{s.target ?? '—'}</td><td>{s.client === 'mp' ? '小程序' : s.client === 'web' ? '网站' : s.client}</td><td>{s.n}</td><td>{s.people}</td></tr>
            ))}
          </tbody>
        </table>
      ))}

      <h2 className={styles.h2}>推荐排行（只在后台显示）</h2>
      <p className={styles.small}>记的是真实结果：带来源的访问 → 报名 → 到场 → 入会；生成海报、点分享不算。自己推荐自己、重复报名已去重。小程序里不出现任何奖励规则。</p>
      {d && (d.referrals.length === 0 ? <p className={styles.muted}>还没有推荐记录。</p> : (
        <table className={styles.table}>
          <thead><tr><th>推荐人</th><th>访问</th><th>报名</th><th>到场</th><th>首次推荐</th><th>入会</th><th>咨询</th></tr></thead>
          <tbody>
            {d.referrals.map((r) => (
              <tr key={r.id}><td><a href={`/zh/staff/contacts/${r.id}`} style={{ color: 'var(--gold)' }}>{r.name}</a> <span className={styles.small}>#{r.member_no}</span></td><td>{r.visits}</td><td>{r.registered}</td><td>{r.arrived}</td><td>{r.first_referred}</td><td>{r.joined}</td><td>{r.inquiries}</td></tr>
            ))}
          </tbody>
        </table>
      ))}

      <h2 className={styles.h2}>企业微信“联系我”码</h2>
      <div className={styles.card}>
        <p className={styles.small}>
          配好后，小程序和网站里所有“加商会微信”的码自动换成企业微信码：报名成功页、签到成功页、相册、会议室、联系商会、首页各用一个，登录的人每人一个，加好友后自动关联到会员档案。
          企业微信不可用（认证没过、权限不够、调用失败）或下面关掉时，自动显示上面上传的个人微信二维码。
        </p>
        <p className={styles.small}>
          状态：{d?.wecom?.configured ? (d.wecom.working ? '✓ 企业微信接口可用' : '已填密钥，但接口暂时调不通（显示个人微信二维码）') : '还没配置企业微信密钥（显示个人微信二维码）'}
          {d?.wecom?.configured ? (d.wecom.callback ? ' · 加好友回调已配置' : ' · 加好友回调还没配置（加了好友也关联不到会员档案）') : ''}
        </p>
        <label className={styles.label}>接待的企业微信成员账号（userid，多个用逗号分开）</label>
        <div className={styles.inputRow}>
          <input className={styles.input} value={wecomUsers} onChange={(e) => setWecomUsers(e.target.value)} placeholder="例如 DongGe" aria-label="企业微信成员账号" />
          <button className={styles.btn} onClick={() => save('wecom_userids', wecomUsers.trim())}>保存</button>
          <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => save('wecom_enabled', d?.settings.wecom_enabled === false)}>{d?.settings.wecom_enabled === false ? '打开企业微信码' : '先关掉，用个人微信码'}</button>
        </div>
        {!!d?.wecom?.byPlacement.length && (
          <table className={styles.table}>
            <thead><tr><th>入口</th><th>加好友</th><th>已关联会员档案</th></tr></thead>
            <tbody>{d.wecom.byPlacement.map((r) => <tr key={String(r.placement)}><td>{r.label}</td><td>{r.adds}</td><td>{r.matched}</td></tr>)}</tbody>
          </table>
        )}
      </div>

      <h2 className={styles.h2}>首页与邀请</h2>
      <div className={styles.card}>
        <label className={styles.label}>活动结束后，首页显示“上一场回顾”多少天（之后显示品牌大图）</label>
        <div className={styles.inputRow}>
          <input className={styles.input} type="number" min={0} max={60} value={recapDays} onChange={(e) => setRecapDays(e.target.value)} style={{ maxWidth: 100 }} aria-label="回顾天数" />
          <button className={styles.btn} onClick={() => save('home_recap_days', Math.round(Number(recapDays) || 0))}>保存</button>
        </div>
        <label className={styles.label}>“认识商会”邀请卡文案（小程序里显示，不能写金额）</label>
        <input className={styles.input} value={inviteText.title} onChange={(e) => setInviteText({ ...inviteText, title: e.target.value })} placeholder="标题，默认：邀请你认识中美房地产商会" aria-label="邀请卡标题" />
        <textarea className={styles.input} style={{ minHeight: 80, marginTop: 6 }} value={inviteText.intro} onChange={(e) => setInviteText({ ...inviteText, intro: e.target.value })} placeholder="一段介绍，默认用商会简介" aria-label="邀请卡介绍" />
        <button className={styles.btn} style={{ marginTop: 6 }} onClick={() => save('invite_card_text', inviteText)}>保存</button>
      </div>

      <h2 className={styles.h2}>电子名片模板库</h2>
      <div className={styles.card}>
        <p className={styles.label}>
          现在开放：{d?.settings.card_tpl_batches === 2 ? '全部 105 款' : '第一批 39 款（商务精选 + 商务经典，67–105）'}。会员在“我的名片”里只能选已开放的模板。
        </p>
        <button className={`${styles.btn} ${d?.settings.card_tpl_batches === 2 ? styles.btnQuiet : ''}`} onClick={() => save('card_tpl_batches', d?.settings.card_tpl_batches === 2 ? 1 : 2)}>
          {d?.settings.card_tpl_batches === 2 ? '收回第二批，只开放第一批' : '开放第二批（1–66），共 105 款'}
        </button>
      </div>

      <h2 className={styles.h2}>视频号</h2>
      <div className={styles.card}>
        <div className={styles.inputRow}>
          <input className={styles.input} value={channels} onChange={(e) => setChannels(e.target.value)} placeholder="视频号 ID，sph 开头；留空 = 小程序不显示视频号入口" aria-label="视频号 ID" />
          <button className={styles.btn} onClick={() => save('channels_finder_id', channels.trim())}>保存</button>
        </div>
        <p className={styles.small}>视频号要和小程序同一主体，或已在视频号助手里关联本小程序，才能从小程序跳转；还没关联时请留空（留空时小程序不显示入口，避免审核员点了打不开）。</p>
      </div>

      <h2 className={styles.h2}>邀请提醒（1.3）</h2>
      <div className={styles.card}>
        <p className={styles.small}>只在这三处提醒，每场活动最多一次，关掉后不再追；签到、填资料、出错时绝不弹。改完小程序立即生效。</p>
        {([['enabled', '总开关'], ['afterRegister', '报名成功页一行“带位朋友一起来？”'], ['afterPhoto', '第一次保存合影 / 看照片时轻提示“把这张发给朋友”'], ['nextEvent', '看下一场相关活动时提示“邀请朋友同行”']] as [string, string][]).map(([k, label]) => (
          <label key={k} className={styles.row} style={{ cursor: 'pointer' }}>
            <span className={styles.rowValue}>{label}</span>
            <input type="checkbox" checked={prompts[k] !== false} onChange={(e) => setPrompts({ ...prompts, [k]: e.target.checked })} />
          </label>
        ))}
        <button className={styles.btn} onClick={() => save('invite_prompts', prompts)}>保存</button>
      </div>

      <h2 className={styles.h2}>带一位朋友（1.3）</h2>
      <div className={styles.card}>
        <div className={styles.inputRow}>
          <input className={styles.input} type="number" min={0} max={5} value={compMax} onChange={(e) => setCompMax(e.target.value)} aria-label="每人最多带几位朋友" />
          <button className={styles.btn} onClick={() => save('companions_max', Number(compMax))}>保存</button>
        </div>
        <p className={styles.small}>每份报名最多替几位朋友报名（0 = 关闭这个功能）。</p>
      </div>

      <h2 className={styles.h2}>贴图话题、服务号（1.3）</h2>
      <div className={styles.card}>
        <div className={styles.inputRow}>
          <input className={styles.input} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="贴图话题名，例如 SAREC活动现场；留空 = 不显示入口" aria-label="贴图话题" />
          <button className={styles.btn} onClick={() => save('photo_topic', topic.trim())}>保存</button>
        </div>
        <p className={styles.small}>照片分享页“发到微信贴图话题”用这个话题。不承诺微信推荐，话题里的照片也不会自动回到商会相册。</p>
        <div className={styles.inputRow}>
          <input className={styles.input} value={oa} onChange={(e) => setOa(e.target.value)} placeholder="服务号原始 ID，gh_ 开头；留空 = 不显示" aria-label="服务号原始 ID" />
          <button className={styles.btn} onClick={() => save('oa_username', oa.trim())}>保存</button>
        </div>
        <p className={styles.small}>签到成功页、相册页的“关注服务号”组件在部分进入方式（群卡片、朋友圈、搜索）不显示时，改显示去服务号主页的入口。</p>
      </div>

      <h2 className={styles.h2}>专委会与俱乐部</h2>
      <div className={styles.card}>
        {comms.map((c, i) => {
          const st = d?.committees.find((x) => x.committee === c.key);
          return (
            <div key={c.key} className={styles.row}>
              <span>{c.name} <span className={styles.small}>（意向 {st?.n ?? 0} 人{st?.names?.length ? `：${st.names.slice(0, 8).join('、')}` : ''}）</span></span>
              <select className={styles.select} style={{ width: 120 }} aria-label={`${c.name}状态`} value={c.status} onChange={(e) => {
                const next = comms.map((x, j) => (j === i ? { ...x, status: e.target.value as Committee['status'] } : x));
                setComms(next);
                save('committees', next);
              }}>
                <option value="preparing">筹备中</option><option value="active">已成立</option>
              </select>
            </div>
          );
        })}
      </div>

      <h2 className={styles.h2}>内容显示范围</h2>
      <p className={styles.small}>每篇文章分别设置网站版和小程序版。小程序“全文”仍会自动去掉含收益数字、金额的段落；为小程序隐藏不影响网站。网站“不在列表显示”只影响列表和搜索收录，文章链接仍可打开。</p>
      <table className={styles.table}>
        <thead><tr><th>文章</th><th>小程序</th><th>网站</th></tr></thead>
        <tbody>
          {vis.map((v) => (
            <tr key={v.slug}>
              <td className={styles.small}>{v.title}</td>
              <td>
                <select className={styles.select} aria-label={`${v.title} 小程序显示`} value={raw[v.slug]?.mp ?? ''} onChange={(e) => setScope(v.slug, 'mp', e.target.value)}>
                  <option value="">默认（{MP_LABEL[v.defaultMp]}）</option>
                  <option value="full">全文</option><option value="brief">只给简介</option><option value="hide">不显示</option>
                </select>
              </td>
              <td>
                <select className={styles.select} aria-label={`${v.title} 网站显示`} value={raw[v.slug]?.site ?? ''} onChange={(e) => setScope(v.slug, 'site', e.target.value)}>
                  <option value="">显示</option><option value="hide">不在列表显示</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default function Page() {
  return (
    <StaffGate role="ops" title="增长" wide>
      {() => <Growth />}
    </StaffGate>
  );
}
