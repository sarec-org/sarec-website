/**
 * 名片卡面要填的字段（模板里用 {{字段名}}）。资料填了才有值，没填就是空，模板里的 {{#字段}} 段落整段不出现、不占位置。
 * 不放“行业”；非会员没有任何等级字样（tier 为空）。
 */
export type CardInput = {
  name: string;
  nameEn?: string | null;
  title?: string | null;
  titleEn?: string | null;
  company?: string | null;
  companyEn?: string | null;
  phone?: string | null;
  wechatId?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  tierName?: string | null; // 会员等级（非会员传空）
  avatarUrl?: string | null;
  logoUrl?: string | null;
};

export type ContactRow = { k: string; v: string; c: string; key: string };

export type CardView = {
  name: string; nameSp: string; nameEn: string; nameEnUp: string; surname: string; initial: string;
  title: string; titleEn: string; company: string; companyEn: string; titleLine: string; e2: string; titleBoth: string;
  tier: string; tierName: string; mark: string; markI: string; logoImg: string; avatarImg: string; avatar: string; logo: string;
  phone: string; wechat: string; email: string; website: string; address: string;
  ct: ContactRow[]; ic: ContactRow[]; hasCt: boolean; hasIc: boolean; qrImg: string; qr: string;
};

const cjk = (s: string) => /[㐀-鿿]/.test(s);
const attr = (s: string) => s.replace(/"/g, '%22').replace(/'/g, '%27');
const t = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

export function cardView(c: CardInput, qrSrc: string | null): CardView {
  const rawName = t(c.name) || 'SAREC 用户';
  const nameEn = t(c.nameEn);
  // 只填了英文名：姓名处就用英文名，英文名行不再重复
  const name = rawName;
  const enLine = cjk(name) ? nameEn : '';
  const nameSp = cjk(name) && name.length === 2 ? name.split('').join(' ') : name;
  const enWords = (enLine || (!cjk(name) ? name : '')).split(' ').filter(Boolean);
  const initial = (enWords.length ? enWords[enWords.length - 1][0] : name[0] || 'S').toUpperCase();
  const title = t(c.title);
  const titleEn = t(c.titleEn);
  const company = t(c.company);
  const companyEn = t(c.companyEn);
  const mark = ((companyEn || company)[0] || initial).toUpperCase();
  const logo = t(c.logoUrl);
  const avatar = t(c.avatarUrl);
  const phone = t(c.phone);
  const wechat = t(c.wechatId);
  const email = t(c.email);
  const website = t(c.website).replace(/^https?:\/\//i, '').replace(/\/$/, '');
  const address = t(c.address);
  const tierName = t(c.tierName);
  const pairs: [string, string, string, string][] = [
    ['phone', phone, 'TEL', '手'],
    ['wechat', wechat, '微信', '微'],
    ['email', email, 'MAIL', '邮'],
    ['website', website, 'WEB', '网'],
    ['address', address, 'ADDR', '址']
  ];
  const have = pairs.filter((p) => p[1]);
  const ct = have.slice(0, 4).map(([key, v, k]) => ({ key, v, k, c: '' }));
  const ic = have.map(([key, v, , k]) => ({ key, v, k, c: key === 'address' ? 'w' : '' }));
  return {
    name, nameSp, nameEn: enLine, nameEnUp: enLine.toUpperCase(), surname: name[0] || '', initial,
    title, titleEn, company, companyEn,
    titleLine: [title, company].filter(Boolean).join(' · '),
    e2: [enLine, titleEn].filter(Boolean).join('　'),
    titleBoth: [title, titleEn].filter(Boolean).join(' · '),
    tier: tierName ? `SAREC ${tierName}` : '',
    tierName,
    mark,
    markI: logo ? `<i class="lgimg" style="background:#fff url('${attr(logo)}') center/78% no-repeat"></i>` : `<i>${mark}</i>`,
    logoImg: logo ? `<img class="logo-img" src="${attr(logo)}" alt="">` : '',
    avatarImg: avatar ? `<img class="avatar-img" src="${attr(avatar)}" alt="">` : '',
    avatar, logo,
    phone, wechat, email, website, address,
    ct, ic, hasCt: ct.length > 0, hasIc: ic.length > 0,
    qr: qrSrc || '',
    qrImg: qrSrc ? `<img src="${qrSrc}" alt="" style="display:block;width:100%;height:100%;object-fit:contain">` : ''
  };
}

/** 自检用的三套资料：短 / 中（设计稿资料）/ 长 */
export const SAMPLES: Record<'short' | 'mid' | 'long', CardInput> = {
  short: { name: '王东', phone: '949 787 8888' },
  mid: {
    name: '王东', nameEn: 'Andy Wang', title: '创始人', titleEn: 'Founder', company: '中美房地产商会', companyEn: 'Sino-American Real Estate Chamber',
    phone: '949 787 8888', wechatId: '逍遥', email: 'info@sinoamericanrec.org', website: 'sinoamericanrec.org', address: '美国加州洛杉矶 Los Angeles, CA', tierName: '副会长'
  },
  long: {
    name: '欧阳明远', nameEn: 'Alexander Christopher Ouyang-Montgomery', title: '首席执行官兼董事总经理', titleEn: 'Chief Executive Officer & Managing Director',
    company: '太平洋西岸国际房地产开发投资集团有限公司', companyEn: 'Pacific West Coast International Real Estate Development Group',
    phone: '+1 (949) 787-8888 ext. 1024', wechatId: 'ouyang_mingyuan_2026', email: 'alexander.ouyang@pacificwestcoast-realestate.com',
    website: 'www.pacificwestcoast-realestate-group.com', address: '美国加利福尼亚州尔湾市商业中心大道 18000 号 1200 室 Irvine, CA 92612', tierName: '常务副会长'
  }
};
