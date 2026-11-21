/** 找工人 · 接活：网站页面用到的接口形状（照 lib/jobs 的返回） */
export type Side = 'find' | 'work' | 'none';

export type Group = { key: string; name: string; order: number; tradeKeys?: string[]; hasPros?: boolean };
export type Trade = { key: string; name: string; group: string; licType: 'A' | 'B' | 'C'; open: boolean; hasPros: boolean; noPost: boolean; noNotify: boolean; icon?: string | null; scope?: string | null };
export type HomeEntry = { label: string; icon?: string | null; target: { type: 'trade' | 'group'; key: string }; pinned?: boolean; hasPros?: boolean };
export type ProRole = 'company' | 'licensed' | 'pro_service' | 'worker';
export type PosterRole = 'owner' | 'landlord' | 'property' | 'developer' | 'crew';
export type Timing = 'asap' | 'week' | 'month' | 'flexible';
export type ProStatus = 'draft' | 'pending' | 'verified' | 'returned' | 'removed';
export type PostStatus = 'open' | 'found' | 'closed' | 'removed';
export type MePro = { id: string; role: ProRole; status: ProStatus; listed: boolean; needPay: boolean; freeLeft?: number | null; freeLeftText?: string | null } | null;
export type FeeMode = 'all_free' | 'free_quota' | 'members_only';
export type Opt<K extends string = string> = { key: K; label: string };

export type Meta = {
  switches: { find: boolean; work: boolean; requirePaid: boolean; feeMode?: FeeMode; freeContacts?: number; freePosts?: number | null };
  /** D26：开放工种数、「全部 N 项 ›」 */
  openTradeCount?: number;
  allTradesText?: string;
  staffPreview: boolean;
  staffPreviewText: string | null;
  groups: Group[];
  trades: Trade[];
  homeEntries: HomeEntry[];
  /** D11 冷启动：有没有任何开放工种已经有核验通过的人；没有时首页换成招募说明 */
  anyPros?: boolean;
  recruitingText?: string;
  tradeRecruitingText?: string;
  recruitingLabel?: string;
  me: { pro: MePro };
  latest: PostCard[];
  /** 城市表（后台管理；发活儿、登记接活儿、筛选都用它，提交 key） */
  cities: { region: string; items: { key: string; name: string }[] }[];
  options: {
    proRoles: Opt<ProRole>[];
    posterRoles: Opt<PosterRole>[];
    timings: Opt<Timing>[];
    propertyTypes: Opt[];
    languages: string[];
    cityGroups: { region: string; cities: string[] }[];
    turnoverTrades: string[];
    siteVisitTrades: string[];
  };
  rules: string[];
  disclaimer: string;
};

export type Badge = { kind: string; text: string };
export type ProCard = {
  id: string; name: string; avatar: string | null; role: ProRole; roleLabel: string; trades: string[]; tradeKeys: string[]; cities: string[]; cityKeys: string[];
  years: number | null; languages: string[]; availableNow: boolean; intro: string | null; photos: string[]; teamSize: number | null; badges: Badge[]; licenseNo?: string;
};

export type PostCard = {
  id: string; title: string; summary: string; city: string; cityKey: string | null; trade: string; tradeName: string; posterRole: PosterRole; posterLabel: string;
  timing: Timing; timingLabel: string; budget?: string; crew?: { headcount: number | null; duration: string | null; pay?: string };
  status: PostStatus; statusLabel: string; createdAt: string; expiresAt: string;
};

export type PostFull = PostCard & {
  description: string; photos: string[]; voiceUrl: string | null; propertyType: string | null; propertyTypeLabel: string | null;
  callName: string | null; wantSiteVisit: boolean; turnover: boolean; mine: boolean;
};
export type PostDetailRes = { post: PostFull; canContact: boolean; reason: string | null; reasonCode: string | null; needPay: boolean; freeLeft?: number | null };

export type MyPost = PostCard & {
  description: string; photos: string[]; batchId: string; closeReason: string | null; expired: boolean; notifiedCount: number;
  contacts: { proId: string | null; name: string; roleLabel: string | null; at: string; times: number }[];
};

export type ProSelf = ProCard & {
  /** 本人编辑用：cities 是 key，cityNames 是名字 */
  cityNames: string[];
  trades: string[]; tradeNames: string[]; verifiedTrades: string[]; licenseNo: string | null; insuranceUrl: string | null; businessRegUrl: string | null;
  licenseDocUrl: string | null; wechat: string | null; status: ProStatus; statusLabel: string; returnReason: string | null; removedReason: string | null;
  needsReview: boolean; verifiedAt: string | null; nextReviewAt: string | null; listed: boolean; needPay: boolean; designNoCaStamp: boolean;
  feeMode?: FeeMode; freeLeft?: number | null; freeLeftText?: string | null;
};
export type Prefill = { name: string; personName: string; avatar: string | null; phone: string | null; wechat: string | null; intro: string | null; role: ProRole | null; trades: string[]; cities: string[]; isMember: boolean };
export type MeProRes = { pro: ProSelf | null; prefill: Prefill; rules: string[] };

export type CityOpt = { key: string; name: string };
