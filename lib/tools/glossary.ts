/**
 * 1.4 网站工具 · 中英地产术语速查（首批 100 个常用词）。
 * 每条：英文、中文、分类、中文一句话解释、英文一句话解释。只做名词解释，不做投资建议。
 */

export const GLOSSARY_CATS = {
  deal: { zh: '交易', en: 'Transactions' },
  loan: { zh: '贷款', en: 'Financing' },
  metric: { zh: '投资指标', en: 'Investment metrics' },
  legal: { zh: '产权与法律', en: 'Title & legal' },
  dev: { zh: '开发建设', en: 'Development' },
  tax: { zh: '税务', en: 'Tax' },
  ops: { zh: '物业运营', en: 'Operations' }
} as const;
export type GlossaryCat = keyof typeof GLOSSARY_CATS;

export type Term = { en: string; zh: string; cat: GlossaryCat; dz: string; de: string };

const T = (en: string, zh: string, cat: GlossaryCat, dz: string, de: string): Term => ({ en, zh, cat, dz, de });

export const GLOSSARY: Term[] = [
  // —— 交易 ——
  T('Listing', '挂牌 / 房源', 'deal', '卖方委托经纪人公开出售的房产信息。', 'A property offered for sale through a broker.'),
  T('MLS (Multiple Listing Service)', '多重挂牌系统', 'deal', '经纪人共享房源信息的数据库。', 'A database where brokers share listings.'),
  T('Offer', '出价', 'deal', '买方向卖方提出的书面购买条件。', 'A written proposal from a buyer to purchase a property.'),
  T('Counteroffer', '还价', 'deal', '卖方或买方对出价条件的修改回复。', 'A response that changes the terms of an offer.'),
  T('Purchase Agreement', '购房合同', 'deal', '买卖双方约定价格、条件和时间表的合同。', 'The contract setting price, terms and timeline.'),
  T('Earnest Money Deposit (EMD)', '诚意金 / 定金', 'deal', '签约后买方存入托管账户的保证金，通常为房价的 1%–3%。', 'A good-faith deposit held in escrow after signing.'),
  T('Escrow', '托管 / 过户托管', 'deal', '由中立第三方保管资金和文件、按合同条件完成过户。', 'A neutral third party holds funds and documents until closing.'),
  T('Contingency', '附加条件', 'deal', '合同中允许买方在条件不满足时退出的条款，如验房、贷款、估价。', 'A condition that lets a party exit the contract if unmet.'),
  T('Due Diligence', '尽职调查', 'deal', '签约后对房产、产权、财务、法规的全面核查。', 'Investigation of a property’s physical, legal and financial condition.'),
  T('Home Inspection', '验房', 'deal', '持证验房师检查房屋结构和系统状况。', 'A professional review of a home’s condition.'),
  T('Appraisal', '估价', 'deal', '持证估价师对房产市场价值的评估，贷款机构据此放款。', 'A licensed estimate of market value, used by lenders.'),
  T('Closing', '过户 / 成交', 'deal', '资金付清、产权转移、文件登记完成的时刻。', 'When funds are paid and title transfers.'),
  T('Closing Costs', '过户费用', 'deal', '过户时支付的各项费用：托管、产权保险、贷款费、转让税等。', 'Fees paid at closing: escrow, title, lender fees, transfer taxes.'),
  T('Comparable Sales (Comps)', '可比成交', 'deal', '附近类似房产近期的成交价，用来判断价格。', 'Recent sales of similar nearby properties.'),
  T('Off-Market', '非公开房源', 'deal', '没有在 MLS 公开挂牌的交易机会。', 'A property sold without public listing.'),
  T('Buyer’s Agent', '买方经纪', 'deal', '代表买方利益的持牌经纪人。', 'A licensed agent representing the buyer.'),
  T('Listing Agent', '卖方经纪', 'deal', '代表卖方挂牌出售的持牌经纪人。', 'A licensed agent representing the seller.'),
  T('Letter of Intent (LOI)', '意向书', 'deal', '商业地产中正式合同前列明主要条款的文件，通常不具约束力。', 'A non-binding outline of key terms before a contract.'),
  T('Seller Disclosure', '卖方披露', 'deal', '卖方须告知的已知房屋问题和情况。', 'Known defects and facts the seller must disclose.'),
  T('As-Is', '按现状出售', 'deal', '卖方不做维修、按当前状况出售。', 'Sold in current condition without repairs.'),

  // —— 贷款 ——
  T('Mortgage', '房屋贷款 / 按揭', 'loan', '以房产作抵押的贷款。', 'A loan secured by real property.'),
  T('Down Payment', '首付', 'loan', '买方自付、不靠贷款的那部分房价。', 'The portion of the price paid in cash.'),
  T('Principal', '本金', 'loan', '借款的原始金额（不含利息）。', 'The amount borrowed, excluding interest.'),
  T('Interest Rate', '利率', 'loan', '借款的年化成本。', 'The annual cost of borrowing.'),
  T('APR (Annual Percentage Rate)', '年化综合费率', 'loan', '把利率和贷款费用合在一起算出的年化成本。', 'Annual cost including interest and fees.'),
  T('Fixed-Rate Mortgage', '固定利率贷款', 'loan', '整个贷款期利率不变。', 'A loan whose rate never changes.'),
  T('Adjustable-Rate Mortgage (ARM)', '浮动利率贷款', 'loan', '初始固定若干年后按市场指数调整利率，如 5/1 ARM。', 'A loan whose rate adjusts after an initial fixed period.'),
  T('Amortization', '摊还', 'loan', '按期还款逐步还清本金和利息的过程。', 'Paying off a loan through scheduled payments.'),
  T('PITI', '本金、利息、税、保险', 'loan', '月供四项：Principal、Interest、Taxes、Insurance。', 'Principal, interest, taxes and insurance.'),
  T('Pre-Approval', '贷款预批', 'loan', '贷款机构审核收入和信用后给出的可贷额度。', 'A lender’s conditional commitment based on review.'),
  T('Loan-to-Value (LTV)', '贷款价值比', 'loan', '贷款金额 ÷ 房产价值。', 'Loan amount divided by property value.'),
  T('Debt-to-Income (DTI)', '负债收入比', 'loan', '每月债务支出 ÷ 月收入，决定能贷多少。', 'Monthly debt payments divided by monthly income.'),
  T('PMI (Private Mortgage Insurance)', '私人贷款保险', 'loan', '首付不足 20% 时通常要求购买、保护贷款方的保险。', 'Insurance required when the down payment is under 20%.'),
  T('Conventional Loan', '常规贷款', 'loan', '不由政府担保、符合 Fannie Mae / Freddie Mac 标准的贷款。', 'A loan not backed by a government agency.'),
  T('Jumbo Loan', '大额贷款', 'loan', '超过常规贷款上限的贷款，审核更严。', 'A loan above conforming limits.'),
  T('DSCR Loan', 'DSCR 贷款（以租金审核）', 'loan', '按房产租金收入覆盖月供的能力审批，不看个人收入。', 'A loan underwritten on rental income coverage.'),
  T('Foreign National Loan', '外籍人士贷款', 'loan', '面向无美国身份借款人的贷款，通常首付更高。', 'A mortgage for borrowers without US residency.'),
  T('Refinance', '重新贷款 / 转贷', 'loan', '用新贷款还清旧贷款，以换利率或取出现金。', 'Replacing an existing loan with a new one.'),
  T('Cash-Out Refinance', '套现转贷', 'loan', '新贷款金额大于旧贷款余额，差额取现。', 'A refinance that takes out equity as cash.'),
  T('HELOC', '房屋净值信用额度', 'loan', '以房屋净值为抵押、可循环使用的信用额度。', 'A revolving line of credit secured by home equity.'),
  T('Hard Money Loan', '硬钱贷款 / 过桥贷款', 'loan', '以房产为主要依据、期限短、利率高的私人贷款。', 'A short-term, asset-based private loan.'),
  T('Construction Loan', '建设贷款', 'loan', '按工程进度分批放款的开发贷款。', 'A loan disbursed in stages during construction.'),
  T('Points', '点数', 'loan', '为降低利率预付的费用，1 点 = 贷款额的 1%。', 'Prepaid interest; one point is 1% of the loan.'),
  T('Prepayment Penalty', '提前还款罚金', 'loan', '提前还清贷款时需支付的费用。', 'A fee for paying off a loan early.'),
  T('Balloon Payment', '气球还款', 'loan', '贷款到期时一次性偿还的大额余额。', 'A large lump sum due at the end of a loan.'),

  // —— 投资指标 ——
  T('NOI (Net Operating Income)', '净营运收入', 'metric', '租金等收入减去营运费用，不含贷款还款和所得税。', 'Income minus operating expenses, before debt service.'),
  T('Cap Rate', '资本化率', 'metric', 'NOI ÷ 房价，衡量不考虑贷款时的收益水平。', 'NOI divided by property value.'),
  T('Cash-on-Cash Return', '现金回报率', 'metric', '年税前现金流 ÷ 投入的现金。', 'Annual pre-tax cash flow divided by cash invested.'),
  T('IRR (Internal Rate of Return)', '内部收益率', 'metric', '让全部现金流净现值为零的折现率，考虑了时间价值。', 'The discount rate that sets NPV of all cash flows to zero.'),
  T('ROI (Return on Investment)', '投资回报率', 'metric', '总收益 ÷ 总投入，不考虑时间。', 'Total gain divided by total investment.'),
  T('Equity Multiple', '权益倍数', 'metric', '全部分配现金 ÷ 投入资本。', 'Total distributions divided by equity invested.'),
  T('DSCR (Debt Service Coverage Ratio)', '偿债覆盖率', 'metric', 'NOI ÷ 年还款，贷款机构通常要求 1.2 以上。', 'NOI divided by annual debt service.'),
  T('Cash Flow', '现金流', 'metric', '收入扣除全部支出和还款后剩下的钱。', 'Money left after all expenses and debt payments.'),
  T('Gross Rent Multiplier (GRM)', '总租金乘数', 'metric', '房价 ÷ 年总租金，粗略比较价格。', 'Price divided by annual gross rent.'),
  T('Appreciation', '增值', 'metric', '房产价值随时间上涨的部分。', 'Increase in property value over time.'),
  T('Equity', '净值 / 权益', 'metric', '房产价值减去贷款余额。', 'Property value minus loan balance.'),
  T('Leverage', '杠杆', 'metric', '用借款放大投资规模，收益和风险同时放大。', 'Using debt to increase investment size and risk.'),
  T('Vacancy Rate', '空置率', 'metric', '未出租的时间或面积占比。', 'Share of time or space not leased.'),
  T('Pro Forma', '预测财务表', 'metric', '基于假设的未来收入和费用预测。', 'Projected financials based on assumptions.'),
  T('NPV (Net Present Value)', '净现值', 'metric', '未来现金流折现到今天后减去初始投入。', 'Present value of cash flows minus initial investment.'),

  // —— 产权与法律 ——
  T('Title', '产权', 'legal', '对房产的合法所有权。', 'Legal ownership of property.'),
  T('Title Insurance', '产权保险', 'legal', '保障产权瑕疵造成损失的保险，过户时购买。', 'Insurance against defects in title.'),
  T('Deed', '地契 / 产权契据', 'legal', '转让房产所有权的书面文件。', 'The document that transfers ownership.'),
  T('Grant Deed', '让与契据', 'legal', '加州常用的产权转让契据，卖方保证未曾转让给他人。', 'A deed with limited seller warranties, common in California.'),
  T('Quitclaim Deed', '放弃契据', 'legal', '转让人放弃其可能拥有的权益，不做任何保证。', 'A deed transferring whatever interest the grantor has, without warranty.'),
  T('Lien', '留置权', 'legal', '债权人对房产的担保权利，如贷款、欠税。', 'A legal claim against property for a debt.'),
  T('Easement', '地役权', 'legal', '他人使用你土地特定部分的权利，如管线通道。', 'A right for others to use part of a property.'),
  T('Zoning', '分区规划', 'legal', '政府对土地用途、密度和高度的规定。', 'Local rules on land use, density and height.'),
  T('HOA (Homeowners Association)', '业主协会', 'legal', '管理小区公共区域并收取月费的组织。', 'An association that manages common areas and charges dues.'),
  T('CC&Rs', '社区规约', 'legal', 'HOA 社区的约束条款和限制。', 'Covenants, conditions and restrictions of an HOA.'),
  T('LLC (Limited Liability Company)', '有限责任公司', 'legal', '常用于持有房产、隔离个人责任的公司形式。', 'An entity often used to hold property and limit liability.'),
  T('Living Trust', '生前信托', 'legal', '用于规划房产传承、避免遗嘱认证的信托。', 'A trust used for estate planning and probate avoidance.'),
  T('Probate', '遗嘱认证', 'legal', '法院处理遗产分配的程序，耗时且公开。', 'Court process for distributing an estate.'),
  T('Foreclosure', '法拍 / 止赎', 'legal', '借款人违约后贷款方依法收回并出售房产。', 'Lender’s legal process to take and sell property after default.'),
  T('Short Sale', '短售', 'legal', '经贷款方同意，以低于贷款余额的价格出售。', 'A sale for less than the loan balance, with lender approval.'),
  T('Power of Attorney (POA)', '授权委托书', 'legal', '授权他人代为签署文件，海外买家常用。', 'Authorization for someone to sign on your behalf.'),

  // —— 开发建设 ——
  T('Entitlement', '开发许可 / 规划审批', 'dev', '取得在土地上建设特定项目的政府批准。', 'Government approvals to build a specific project.'),
  T('Building Permit', '建筑许可', 'dev', '开工前向政府申请的施工许可。', 'Permission from the city to start construction.'),
  T('ADU (Accessory Dwelling Unit)', '附属住宅单元', 'dev', '在独立屋地块上加建的小型独立住宅，加州政策支持。', 'A secondary unit on a single-family lot.'),
  T('SB 9', '加州 SB 9 法案', 'dev', '允许独立屋地块分割或建两套住宅的加州法律。', 'California law allowing lot splits and duplexes.'),
  T('Setback', '退界', 'dev', '建筑物与地界之间必须留出的最小距离。', 'Required distance between a building and property lines.'),
  T('FAR (Floor Area Ratio)', '容积率', 'dev', '建筑总面积 ÷ 土地面积。', 'Total building area divided by lot area.'),
  T('General Contractor (GC)', '总承包商', 'dev', '负责整体施工、管理分包商的持牌承包商。', 'The licensed contractor managing a construction project.'),
  T('Certificate of Occupancy (CO)', '入住许可', 'dev', '竣工验收后政府发出的可入住证明。', 'City approval that a building is fit to occupy.'),
  T('Hard Costs', '硬成本', 'dev', '材料和人工等直接建设成本。', 'Direct construction costs: labor and materials.'),
  T('Soft Costs', '软成本', 'dev', '设计、许可、融资、法律等非施工成本。', 'Indirect costs: design, permits, financing, legal.'),
  T('Change Order', '变更单', 'dev', '施工中对原合同范围、价格或工期的书面修改。', 'A written change to construction scope, cost or schedule.'),

  // —— 税务 ——
  T('Property Tax', '房产税', 'tax', '按评估价值每年缴纳的地方税；加州约 1% 加地方附加。', 'Annual local tax based on assessed value.'),
  T('Prop 13', '加州 13 号提案', 'tax', '限制加州房产税基每年最多上调 2%，过户时重新评估。', 'California rule capping assessed value increases at 2% a year.'),
  T('Capital Gains Tax', '资本利得税', 'tax', '出售资产获利部分要缴的税，持有超过一年按长期税率。', 'Tax on profit from selling an asset.'),
  T('Depreciation', '折旧', 'tax', '出租房产的建筑部分可按年抵税，住宅 27.5 年、商业 39 年。', 'Annual tax deduction for wear on rental buildings.'),
  T('Depreciation Recapture', '折旧回收', 'tax', '出售时对已提折旧部分征税，联邦最高 25%。', 'Tax on prior depreciation when the property is sold.'),
  T('1031 Exchange', '1031 同类资产置换', 'tax', '出售投资房后在规定期限内买入同类房产，可递延资本利得税。', 'Deferring capital gains by reinvesting in like-kind property.'),
  T('Cost Basis', '成本基础', 'tax', '购入价加改良支出，计算利得的起点。', 'Purchase price plus improvements, used to compute gain.'),
  T('FIRPTA', '外国人房产税法', 'tax', '外国卖家出售美国房产时，买方通常需预扣售价的一定比例。', 'Withholding on US property sales by foreign sellers.'),

  // —— 物业运营 ——
  T('Lease', '租约', 'ops', '房东与租客约定租金、期限和规则的合同。', 'The rental contract between landlord and tenant.'),
  T('Security Deposit', '押金', 'ops', '租客入住前交付、退租时按规定退还的保证金。', 'A refundable deposit paid by the tenant.'),
  T('Property Management', '物业管理', 'ops', '代房东收租、维修、招租的服务，通常收租金的 6%–10%。', 'Third-party management of a rental property.'),
  T('Rent Control', '租金管制', 'ops', '地方法规限制租金涨幅和驱逐理由。', 'Local rules limiting rent increases and evictions.'),
  T('Triple Net Lease (NNN)', '三净租约', 'ops', '商业租约中租客承担房产税、保险和维修。', 'A commercial lease where the tenant pays taxes, insurance and maintenance.')
];

/**
 * 1.3.3 小程序版术语速查：小程序里不出现金额、利率等具体数字。解释里带数字的这几条换成不带数字的说法（网站版不变）。
 * 以后加词：如果解释里有数字，在这里补一条小程序说法，否则接口会自动略过这一条（不让带数字的上小程序）。
 */
const MP_SAFE: Record<string, { dz?: string; de?: string }> = {
  'Earnest Money Deposit (EMD)': { dz: '签约后买方存入托管账户的保证金，金额按合同约定，过户时抵作房款。' },
  'Adjustable-Rate Mortgage (ARM)': { dz: '初始固定若干年后，按市场指数定期调整利率的贷款。' },
  'PMI (Private Mortgage Insurance)': { dz: '首付比例较低时，贷款方通常要求借款人购买、用来保护贷款方的保险。', de: 'Insurance usually required when the down payment is small.' },
  Points: { dz: '为降低利率在过户时预付的费用，按贷款额的一定比例计算。', de: 'Prepaid interest, priced as a share of the loan amount.' },
  'DSCR (Debt Service Coverage Ratio)': { dz: 'NOI ÷ 年还款；数值越高，说明租金越能覆盖还款，贷款机构有最低要求。' },
  'Property Tax': { dz: '按评估价值每年缴纳的地方税，各地税率不同。' },
  'Prop 13': { dz: '限制加州房产税基每年的上调幅度，房产过户时重新评估。', de: 'California rule limiting yearly increases in assessed value.' },
  Depreciation: { dz: '出租房产的建筑部分可按规定年限逐年抵税，住宅和商业的年限不同。' },
  'Depreciation Recapture': { dz: '出售房产时，对之前已提的折旧部分按规定征税。' },
  'Property Management': { dz: '代房东收租、维修、招租的服务，通常按租金的一定比例收费。' }
};
const HAS_NUM = /[0-9０-９%％$＄]|美元|万元|\d元/;
export const termId = (en: string) => en.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export function glossaryForMp() {
  const terms = GLOSSARY.map((t) => ({ ...t, ...(MP_SAFE[t.en] ?? {}) }))
    .filter((t) => !HAS_NUM.test(t.dz) && !HAS_NUM.test(t.de))
    .map((t) => ({ id: termId(t.en), en: t.en, zh: t.zh, cat: t.cat, catZh: GLOSSARY_CATS[t.cat].zh, dz: t.dz, de: t.de, letter: /^[A-Za-z]/.test(t.en) ? t.en[0].toUpperCase() : '#' }));
  return { terms, cats: (Object.keys(GLOSSARY_CATS) as GlossaryCat[]).map((k) => ({ key: k, zh: GLOSSARY_CATS[k].zh, n: terms.filter((t) => t.cat === k).length })) };
}
