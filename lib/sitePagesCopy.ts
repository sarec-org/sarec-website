/**
 * 网站“关于 / 服务 / 联系”页面文案（网站页面与小程序内容接口共用，只维护这一份）
 * ------------------------------------------------------------------
 * 网站：app/zh/(internal)/about、components/sections/services/S01–S06、app/zh/(internal)/contact 直接引用这里。
 * 小程序：lib/mpContent.ts 读同一份，再去掉付款、入会付款、投融资推介等内容。
 */

export const aboutCopy = {
  hero: {
    title: '从投资人视角做中美房地产项目判断',
    lines: ['从投资人视角做', '中美房地产项目判断'],
    lead: 'SAREC 由实操背景出身的跨境地产团队推动,围绕真实项目、长期合作和投资人视角,连接中美房地产资本与项目资源。'
  },
  whoTitle: 'SAREC 是中美房地产项目判断与服务平台',
  whoLayers: [
    { code: '01', title: '长期学习与交流入口', body: '通过会员服务建立长期连接中美房地产相关客户的网络。' },
    { code: '02', title: '项目咨询与结构设计层', body: '提供项目尽调、财务建模、结构设计、风险评估,用投资人视角帮助客户判断项目。' },
    { code: '03', title: '合作结构设计层', body: '在符合 SAREC 服务标准的项目协作场景下,围绕合作结构与风险共担机制,推动合作稳健成立。' }
  ],
  proofTitle: '客户为什么需要我们',
  /** 标题拆成 前 / 强调 / 后 三段，网站把强调词标金色 */
  proofPoints: [
    { code: '01', title: ['信息多但', '判断', '少'], body: '培训供给充足,但具体项目的判断、风险识别、结构评估稀缺。' },
    { code: '02', title: ['中介多但', '结构把控', '少'], body: '一次性服务多,但持续的尽调、风控、合作落地很少。' },
    { code: '03', title: ['项目多但', '风险识别', '少'], body: '大量项目方等钱,但能从投资人视角识别真伪、风险的人少。' },
    { code: '04', title: ['专业服务多但', '整合', '缺失'], body: '法律 / 税务 / 移民 / 保险各自为战,缺少地产为核心的整合协调。' }
  ] as { code: string; title: [string, string, string]; body: string }[],
  diffTitle: '4 件让 SAREC 不一样的事',
  differentiators: [
    { code: '01', title: '先判断项目,再谈合作', body: '培训与展会都围绕真实项目展开。' },
    { code: '02', title: '项目判断只是第一步', body: '真正的价值在于尽调、结构设计、风险评估、过程监督。' },
    { code: '03', title: '项目协作支持,不作为施工开发主体', body: 'SAREC 不作为施工主体,不设资金池,只设计法律结构和对齐投资人利益。' },
    { code: '04', title: '只服务能承担风险的客户', body: 'SAREC 不服务"想短期套利"的客户,寻找能看懂项目、能承担风险、想长期合作的投资人。' }
  ],
  manifesto: '跨境房地产合作的核心,不是信息差,而是判断力、结构能力和长期信任。',
  founder: {
    name: 'Andy Wang',
    role: 'SAREC 创始人 · 跨境地产投资人',
    body: 'SAREC 由长期房地产投资、项目操盘与跨境合作实践者推动。'
  },
  cta: { title: '想进一步了解 SAREC?', lead: '预约 30 分钟沟通,我们一起判断 SAREC 是不是合适的合作方。' }
};

export const servicesCopy = {
  hero: {
    title: '中美房地产项目判断与增长服务',
    sub: '面向投资人、项目方与专业服务机构,SAREC 以项目判断、内容资产与 AI 搜索可见度,帮助跨境房地产合作更清晰、更稳健地推进。'
  },
  entriesTitle: '你属于哪一类客户?',
  entriesLead: 'SAREC 面向三类客户提供服务。选择最贴近你的入口,看清下一步。',
  /** V2.0 三入口(权重 1>2≫3);文案为 Andy 定版,CTA 链向真实解决方案页。 */
  entries: [
    {
      eyebrow: 'FOR INVESTORS & DEVELOPERS · 入口 01',
      title: '投资人 & 开发者',
      description: '围绕美国房地产项目,帮助投资人和开发者先判断风险、结构、可行性与下一步路径。',
      points: ['项目风险初诊', '可行性评估', '开发全程顾问', '跨境架构设计'],
      linkLabel: '查看投资人与开发者服务',
      linkHref: '/zh/services/investors',
      weight: 'primary',
      image: { src: '/images/projects/1340-glendale-triangle.webp', alt: '美国房地产开发项目' }
    },
    {
      eyebrow: 'FOR PROJECT TEAMS · 入口 02',
      title: '项目方',
      description: '帮助美国房地产项目建立面向华人市场的表达体系、内容资产、投资人教育材料与 AI 搜索可见度。',
      points: ['市场定位', '内容资产', '投资人教育', 'AI 搜索可见度', '品牌信任建设'],
      linkLabel: '查看项目方增长服务',
      linkHref: '/zh/services/project-owners',
      weight: 'secondary'
    },
    {
      eyebrow: 'FOR PROFESSIONAL FIRMS · 入口 03',
      title: '专业服务机构',
      description: '为律师、CPA、贷款、保险、移民等专业服务机构,提供官网内容底座与 AI 搜索可见度诊断。',
      points: ['官网内容底座', 'AI 搜索可见度', '服务表达优化'],
      linkLabel: '查看专业机构服务',
      linkHref: '/zh/services/professional-firms',
      weight: 'muted'
    }
  ] as {
    eyebrow: string;
    title: string;
    description: string;
    points: string[];
    linkLabel: string;
    linkHref: string;
    weight: 'primary' | 'secondary' | 'muted';
    image?: { src: string; alt: string };
  }[],
  chamber: {
    title: '平台信任与服务深度',
    tagline: '围绕真实项目的高含金量内容。',
    items: [
      {
        code: '01',
        title: '研究内容',
        body: [
          'SAREC 定期发布美国房地产研究内容，',
          '关注政策动向、市场结构、项目机会和风险清单。',
          '会员可优先访问。'
        ]
      },
      {
        code: '02',
        title: '主题培训',
        body: [
          '不做泛泛而谈的基础培训。',
          '围绕真实项目、市场判断、风险识别和资源协同 ——',
          '包括项目结构、财务建模实操、风险识别清单。'
        ]
      },
      {
        code: '03',
        title: '项目研讨与闭门分享',
        body: [
          '针对常务理事和副会长单位的小范围分享。',
          '通常涉及具体项目或敏感话题。'
        ]
      },
      {
        code: '04',
        title: '行业展会与论坛',
        body: [
          '跨境地产投资相关的行业活动。',
          'SAREC 主办或联办，会员可优先参加。'
        ]
      },
      {
        code: '05',
        title: '美国实地考察',
        body: [
          'SAREC 将根据项目进度和会员需求，',
          '组织美国实地考察、项目走访和专题交流。',
          '会员可优先参加考察活动。'
        ]
      }
    ]
  }
};

export const partnerCopy = { title: '主叙事之外', lead: 'SAREC 主叙事聚焦地产。其他业务由专业服务伙伴分工提供。' };

/** 专业服务伙伴网络（服务页 S06、联系页共用） */
export const partnerNetwork = [
  { code: '01', title: '移民服务', body: 'EB-5 / L1 / E2 / 投资移民相关法律服务' },
  { code: '02', title: '法律服务', body: '公司法 / 合同法 / 跨境合规 / 税务结构' },
  { code: '03', title: '财富管理', body: '家族办公室 / 信托 / 资产配置' },
  { code: '04', title: '税务服务', body: '跨境税务 / 公司税 / 个人税' },
  { code: '05', title: '保险服务', body: '人寿 / 商业保险 / 跨境保险' }
];

export const contactCopy = {
  title: '联系 SAREC',
  lead: '我们 1 个工作日内回复。',
  email: 'info@sinoamericanrec.org',
  intents: [
    {
      code: '01',
      title: '预约 30 分钟沟通',
      intentKey: 'consult',
      fit: [
        '第一次接触 SAREC，想先聊一聊',
        '不确定自己属于哪一类客户',
        '想了解 SAREC 服务是否匹配你的需求'
      ],
      detail: [
        '你的背景、当前阶段和目标',
        'SAREC 三类服务入口如何与你匹配',
        '下一步的具体安排（如果匹配）'
      ],
      detailLabel: '通话内容',
      cta: '预约 30 分钟沟通'
    },
    {
      code: '02',
      title: '项目评估',
      intentKey: 'evaluate',
      fit: [
        '已经有具体项目想让 SAREC 看一下',
        '已经在做美国房地产投资，想找专业把控',
        '需要项目尽调、财务建模、结构设计支持'
      ],
      detail: [
        '项目基本情况了解',
        'SAREC 项目判断 7 维度的初步评估',
        '是否进入深度合作的判断'
      ],
      detailLabel: '通话内容',
      cta: '项目评估 · 30 分钟'
    },
    {
      code: '03',
      title: '申请加入会员',
      intentKey: 'membership',
      fit: [
        '希望系统接触美国房地产投资和跨境合作',
        '想长期跟进 SAREC 的研究、活动、考察',
        '想接触专业服务伙伴网络'
      ],
      detail: [
        '选择档位 → 确认协议 → 在线付款 → 到账生效',
        '全程在线自助，无需审批；刷卡即时生效，Zelle 核对到账后生效'
      ],
      detailLabel: '申请流程',
      cta: '申请加入会员'
    },
    {
      code: '04',
      title: '报名活动 / 参加考察团',
      intentKey: 'events',
      fit: [
        '想参加 SAREC 的培训、研讨、闭门分享',
        '想报名美国实地考察团',
        '想参加行业展会'
      ],
      detail: [
        '提交报名 → 资格审核（1 个工作日）→ 活动详情和参与方式'
      ],
      detailLabel: '报名流程',
      cta: '报名活动 / 参加考察团'
    }
  ],
  steps: [
    {
      code: '01',
      title: '1 个工作日内回复',
      body: '提交表单后，SAREC 团队会在 1 个工作日内通过邮箱回复，确认收到并安排下一步。'
    },
    {
      code: '02',
      title: '安排 30 分钟沟通',
      body: '匹配的客户将安排 30 分钟视频或电话沟通，通话时间根据双方时区协调。'
    },
    {
      code: '03',
      title: '30 分钟通话',
      body: '通话内容视需求类型而定：你的背景、SAREC 服务匹配度、关心问题的看法、下一步安排。通话无前置费用。'
    },
    {
      code: '04',
      title: '下一步合作',
      body: '会员申请 → 提供会员费支付方式；项目咨询 → 签署咨询协议；项目协作 → 提供项目资料和合作文件。不匹配也直接告诉你。'
    }
  ],
  org: { en: 'Sino-American Real Estate Chamber (SAREC)', zh: '中美房地产商会', hq: '总部所在:洛杉矶 · 中美双语' }
};
