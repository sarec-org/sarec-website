export const site = {
  name: 'SAREC',
  fullName: '中美房地产商会',
  phone: '+1（626）658-6066',
  email: 'info@sinoamericanrec.org',
  location: 'Los Angeles, California',
  positioning: '跨境地产项目协作与资源整合平台',
  positioningDetail:
    '连接中国资本、美国资本与美国项目方。围绕项目判断、结构设计、风险控制与落地协同，推动跨境地产合作更稳健地成立与推进。'
};

export const navItems = [
  { label: '核心服务', href: '/zh/services/' },
  { label: '项目与案例', href: '/zh/projects/' },
  { label: '研究与观点', href: '/zh/research/' },
  { label: '关于商会', href: '/zh/about/' },
  { label: '联系我们', href: '/zh/contact/' }
];

export const serviceItems = [
  {
    title: '出海战略咨询',
    description: '从市场研究到公司架构，帮中国开发商系统规划进入美国市场的路径',
    href: '/zh/services/strategy/'
  },
  {
    title: '洛杉矶项目开发',
    description: '精选洛杉矶、尔湾优质土地与开发机会，提供项目对接与开发支持',
    href: '/zh/services/development/'
  },
  {
    title: '风控尽调服务',
    description: '针对美国房产项目，提供系统性风险评估与尽职调查支持',
    href: '/zh/services/due-diligence/'
  },
  {
    title: '资本对接撮合',
    description: '连接中方资金、美国资金与美国项目方，推动合规结构下的跨境投资落地',
    href: '/zh/services/capital/'
  }
];

export const researchItems = [
  {
    title: 'EB-5投资移民：2026年还值不值得投？',
    description: '投资额提高、排期延长，现在入场还来得及吗？',
    href: '/zh/research/eb5/'
  },
  {
    title: '华人投资美国房产，这7类风险最容易被忽视',
    description: 'SAREC整理了最常见的风险，每一条都有真实案例背景',
    href: '/zh/research/investment-pitfalls/'
  },
  {
    title: '拿到一个美国房产项目，你应该问哪5个问题？',
    description: 'SAREC实战判断框架，5个维度，从公开信息就能初判',
    href: '/zh/research/framework/'
  },
  {
    title: 'SAREC投资风险清单',
    description: '第一阶段占位内容页，PDF 下载按钮待甲方提供文件后启用',
    href: '/zh/research/risk-checklist/'
  }
];

export const stats = [
  { value: '100+', label: '跨境合作伙伴' },
  { value: '2000+', label: '服务与接触客户' },
  { value: '124场', label: '活动与交流记录' }
];

export const homePage = {
  metadata: {
    title: '中美地产跨境最可信赖的专业合伙人 | SAREC',
    description: '立足洛杉矶，连接中美地产资源。'
  },
  hero: {
    eyebrow: '立足洛杉矶，连接中美地产资源',
    title: '跨境地产最缺的，通常不是机会，而是判断。',
    subtitle:
      '从项目筛选到结构设计，从风险识别到落地推进，SAREC 提供的不只是连接，而是让一项合作真正成立的专业支持。',
    primaryCTA: { text: '查看核心服务', href: '/zh/services/' },
    secondaryCTA: { text: '预约项目咨询', href: '/zh/contact/' }
  },
  audienceTitle: '您现在最需要解决的，是哪一类问题？',
  audienceCards: [
    {
      title: '我是中国开发商',
      description: '希望进入美国市场，但对审批周期、合作伙伴、资本结构与本地执行体系缺乏足够把握。',
      linkText: '了解出海战略咨询',
      href: '/zh/services/strategy/'
    },
    {
      title: '我是中国投资人',
      description: '希望参与美国地产项目，但更关心项目是否值得进入、风险在哪里、结构是否合理。',
      linkText: '了解项目判断与风险研究',
      href: '/zh/research/eb5/'
    },
    {
      title: '我是美国投资人',
      description: '希望寻找更懂中国资本逻辑、又能看懂本地项目执行风险的协作平台。',
      linkText: '了解风控与项目协作能力',
      href: '/zh/services/due-diligence/'
    },
    {
      title: '我是美国项目方',
      description: '有真实可推进的项目，希望引入匹配的中方或跨境资本，并建立更高质量的合作路径。',
      linkText: '了解资本对接服务',
      href: '/zh/services/capital/'
    },
    {
      title: '我想参加项目考察',
      description: '希望通过实地走访与面对面讨论，建立对洛杉矶项目、市场与合作路径的一手判断。',
      linkText: '了解考察与交流安排',
      href: '/zh/activity/'
    }
  ],
  serviceTitle: '我们提供的，不只是信息，而是跨境合作中的关键判断。',
  serviceItems: [
    {
      ...serviceItems[0],
      description: '不是先问能不能做，而是先判断值不值得进入、应该以什么方式进入。'
    },
    {
      ...serviceItems[1],
      description: '围绕真实开发项目，提供从项目判断、推进协调到落地配合的专业支持。'
    },
    {
      ...serviceItems[2],
      description: '在进入项目之前，先把开发商、结构、许可、退出路径和关键风险看明白。'
    },
    {
      ...serviceItems[3],
      title: '资本对接协作',
      description: '连接中国资本、美国资本与美国项目方，但不把一次性撮合作为核心价值。'
    }
  ],
  researchTitle: '研究，不是内容装饰，而是判断能力的外显。',
  researchCTA: { text: '查看全部', href: '/zh/research/' },
  researchItems: [
    {
      ...researchItems[1],
      description: '很多风险并不写在销售资料里，却真正决定一笔投资最后是赚到钱，还是陷入被动。'
    },
    {
      ...researchItems[0],
      title: 'EB-5 在 2026 年还值不值得做？',
      description: '如果把它当成一笔真实投资，而不是单纯移民工具，很多判断会完全不同。'
    },
    {
      ...researchItems[2],
      title: '如何在拿到项目后的 1 小时内做出第一轮判断？',
      description: '真正专业的筛选，不靠感觉，而靠维度、红旗信号和结构意识。'
    }
  ],
  activity: {
    eyebrow: '项目与考察',
    title: '很多跨境合作的问题，不在会议桌上，而在现场。',
    lines: [
      '对于开发项目、区域判断和合作路径，纸面材料只解决一部分问题。',
      '真正重要的，是把项目放到真实场景里看：地段、周边、节奏、审批、执行团队，以及不同参与方之间能否真正协同。'
    ],
    primaryCTA: { text: '预约项目交流', href: '/zh/contact/' },
    secondaryCTA: { text: '查看项目与案例', href: '/zh/projects/' }
  },
  news: {
    title: 'SAREC每日市场简报',
    subtitle: '围绕中美地产、开发、资本与政策变化，持续输出更接近实务判断的市场观察。',
    cta: { text: '查看全部简报', href: '/zh/news/' },
    placeholders: [
      '这个模块的意义，不是追热点，而是帮助客户形成持续、稳健、可落地的判断框架。',
      '围绕开发节奏、资本结构与政策变化，提供更接近执行面的观察。',
      '作为下一阶段内容模块，这里将持续承接简报与阶段性判断更新。'
    ]
  },
  trustTitle: '我们更看重长期可验证的合作能力，而不是短期话术。',
  partners:
    '数字本身不是价值。真正的价值，在于这些数字背后所积累的判断经验、合作关系与项目协同能力。',
  bottomCTA: {
    title: '如果您已经在看项目，现在最重要的，通常不是更快决定，而是先看清关键问题。',
    subtitleLines: [
      '无论您是开发商、投资人还是项目方，SAREC 都可以先基于您的阶段、目标与项目类型，提供一次初步判断与路径建议。'
    ],
    fields: [
      { label: '姓名', name: 'name', required: true },
      { label: '微信号', name: 'wechat' },
      { label: '电话', name: 'phone', required: true, type: 'tel' as const },
      { label: '邮箱', name: 'email', required: true, type: 'email' as const },
      { label: '您的需求（单行文本）', name: 'need', required: true }
    ],
    submitText: '提交咨询申请',
    action: '/zh/contact/thanks/'
  },
  finalCTA: {
    title: '如果您已经在看项目，现在最重要的，通常不是更快决定，而是先看清关键问题。',
    subtitle: '无论您是开发商、投资人还是项目方，SAREC 都可以先基于您的阶段、目标与项目类型，提供一次初步判断与路径建议。',
    primaryCTA: { text: '预约咨询', href: '/zh/contact/' },
    secondaryCTA: { text: '查看核心服务', href: '/zh/services/' }
  }
};

export type SkeletonPage = {
  title: string;
  description?: string;
  href: string;
  metaTitle: string;
  metaDescription?: string;
};

export const skeletonPages: Record<string, SkeletonPage> = {
  about: {
    title: '关于中美房地产商会（SAREC）',
    description: '中美房地产商会（Sino-American Real Estate Chamber，简称SAREC）总部位于洛杉矶。',
    href: '/zh/about/',
    metaTitle: '关于中美房地产商会 SAREC | 立足洛杉矶，连接中美地产',
    metaDescription: 'SAREC是立足洛杉矶的专业中美地产跨境服务平台，连接中国开发商、投资人与美国项目资源。'
  },
  services: {
    title: 'SAREC核心服务',
    description: '从出海规划到资本落地，SAREC提供全链条专业支持',
    href: '/zh/services/',
    metaTitle: 'SAREC核心服务 | 出海战略・项目开发・风控尽调・资本对接',
    metaDescription: 'SAREC为中国开发商和投资人提供四项核心服务：出海战略咨询、洛杉矶项目开发、风控尽调、资本对接撮合。'
  },
  strategy: {
    title: '中国开发商如何安全进入美国市场？',
    description: '出海不是一次项目决策，是一套系统工程。SAREC帮您在启动前想清楚每一步',
    href: '/zh/services/strategy/',
    metaTitle: '中国开发商如何安全进入美国市场？| 出海战略咨询 | SAREC',
    metaDescription: 'SAREC为中国开发商提供系统性美国市场进入方案，覆盖选址、架构、合规与资源对接，帮助企业降低出海风险。'
  },
  development: {
    title: '洛杉矶有哪些值得投的房产开发机会？',
    description: 'SAREC长期深耕洛杉矶市场。我们的价值不是告诉你哪里涨，而是帮你判断哪个项目值得进',
    href: '/zh/services/development/',
    metaTitle: '洛杉矶有哪些值得投的房产开发机会？| 项目开发 | SAREC',
    metaDescription: 'SAREC精选洛杉矶、尔湾优质土地与开发项目，提供项目对接、尽调支持与开发全流程协助。'
  },
  dueDiligence: {
    title: '投资美国房产之前，这些风险你查清楚了吗？',
    description: 'SAREC风控尽调服务。让每一笔投资都建立在真实信息上，而不是销售材料上',
    href: '/zh/services/due-diligence/',
    metaTitle: '美国房产项目有哪些致命风险？| 风控尽调 | SAREC',
    metaDescription: 'SAREC提供针对美国房产项目的系统性风险评估与尽职调查，覆盖开发商背景、法律合规、财务结构与退出机制。'
  },
  capital: {
    title: '中国资本如何合规、高效地对接美国开发机会？',
    description: 'SAREC 的核心价值不止于资源对接，而是围绕项目判断、结构设计、风险控制与落地协同，推动跨境合作更稳健地成立与推进。',
    href: '/zh/services/capital/',
    metaTitle: '中国资本如何合规对接美国房产开发商？| 资本对接 | SAREC',
    metaDescription: 'SAREC连接中方资金与美国优质项目方，推动合规结构下的跨境投资落地，覆盖EB-5、夹层融资、联合开发等结构。'
  },
  projects: {
    title: 'SAREC合作项目与案例',
    description: '不是广告，是真实记录。以下是SAREC参与协调的部分项目，展示我们如何在实际工作中帮助客户',
    href: '/zh/projects/',
    metaTitle: 'SAREC合作项目与投资案例 | 洛杉矶房产开发实例',
    metaDescription: 'SAREC历年合作的洛杉矶房产开发项目与投资案例，展示中美联合开发、EB-5项目及资本对接实例。'
  },
  eb5: {
    title: 'EB-5投资移民：2026年还值不值得投？',
    description: 'EB-5投资移民全面指南：政策现状、投资金额、排期、风险与SAREC专家判断。',
    href: '/zh/research/eb5/',
    metaTitle: 'EB-5是什么？2026年值不值得投？SAREC完整解析',
    metaDescription: 'EB-5投资移民全面指南：政策现状、投资金额、排期、风险与SAREC专家判断。适合正在评估EB-5的中国投资人。'
  },
  pitfalls: {
    title: '华人投资美国房产，这7类风险最容易被忽视',
    description: '不是吓你，是帮你提前想清楚。SAREC从多年陪同客户的实战中总结，每一条都有真实案例背景',
    href: '/zh/research/investment-pitfalls/',
    metaTitle: '华人投资美国房产的7个常见风险 | SAREC实战总结',
    metaDescription: 'SAREC整理华人投资美国房产最常见的7类风险，每条都有真实案例背景，帮助投资人在决策前建立风险意识。'
  },
  framework: {
    title: '拿到一个美国房产项目，你应该问哪5个问题？',
    description: 'SAREC整理的实战初判框架。用公开信息完成第一轮筛选，再决定是否值得深入尽调',
    href: '/zh/research/framework/',
    metaTitle: '如何判断一个美国房产项目值不值得投？| SAREC判断框架',
    metaDescription: 'SAREC实战项目评估框架，5个维度帮助投资人从公开信息对美国房产项目做出初步判断。'
  }
};

export type ServiceFormField = {
  label: string;
  name: string;
  required?: boolean;
  type?: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  options?: string[];
};

export type ServicePageContent = {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  title: string;
  subtitle: string;
  heroPrimaryHref?: string;
  heroSecondaryText?: string;
  heroSecondaryHref?: string;
  problemIntro: string;
  problems: string[];
  problemConclusion?: string;
  work: Array<{
    title: string;
    description?: string;
    items?: string[];
  }>;
  expertQuote: {
    sarecJudgment: string;
    andyObservation: string;
    investorInsight: string;
  };
  fit: string[];
  related: Array<{ label: string; href: string }>;
  form: {
    title: string;
    description?: string;
    submitText: string;
    fields: ServiceFormField[];
  };
};

export type ResearchArticleSection = {
  title: string;
  paragraphs?: string[];
  table?: Array<{ label: string; value: string }>;
  orderedItems?: string[];
  bullets?: string[];
  negativeBullets?: string[];
  detailItems?: Array<{
    title: string;
    question?: string;
    method?: string;
    redFlag?: string;
    body?: string;
  }>;
};

export type ResearchArticleContent = {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  title: string;
  subtitle?: string;
  sections: ResearchArticleSection[];
  expertQuote: {
    sarecJudgment: string;
    andyObservation: string;
    investorInsight: string;
  };
  relatedTitle: string;
  related: Array<{ label: string; href: string }>;
  cta: {
    title: string;
    href: string;
    text: string;
  };
};

export const servicePages: Record<string, ServicePageContent> = {
  strategy: {
    slug: 'strategy',
    metaTitle: '项目初筛与投资判断 | Strategy Service | SAREC',
    metaDescription:
      'SAREC 提供面向跨境地产投资的项目初筛与投资判断服务，帮助客户在投入资金、时间和关系之前，先判断一个项目是否值得继续看下去。',
    title: '项目初筛与投资判断',
    subtitle:
      '在跨境地产投资中，很多问题不是发生在项目失败之后，而是发生在进入项目之前。SAREC 帮助客户在投入资金、时间和关系之前，先判断一个项目是否值得继续看下去。',
    heroPrimaryHref: '/zh/contact/',
    heroSecondaryText: '预约项目讨论',
    heroSecondaryHref: '/zh/contact/',
    problemIntro:
      '您可能已经接触到一个美国地产项目，也可能正在被朋友、合作方或项目方推荐某个机会。项目材料看起来完整，收益测算看起来有吸引力，推荐人也可能很有信心。但真正重要的问题是：',
    problems: [
      '这个项目是否真的值得继续看？',
      '项目方是否具备推进和交付能力？',
      '土地、审批、融资、建设和退出路径是否站得住？',
      '结构是否对投资人公平？',
      '是否存在一眼看不出来、但会影响结果的关键风险？'
    ],
    problemConclusion:
      '项目初筛的价值，不是替客户做最终决定，而是在更早阶段帮客户排除明显问题，避免在错误项目上投入更多时间和资金。',
    work: [
      {
        title: '项目基础信息梳理',
        description: '整理项目位置、类型、阶段、规模、资金需求、合作结构与退出设想。'
      },
      {
        title: '项目进入价值初判',
        description: '从区位、产品、市场需求、审批状态和推进基础等维度，判断项目是否值得继续深入。'
      },
      {
        title: '关键风险识别',
        description: '识别项目方背景、审批状态、融资结构、建设风险、退出路径和信息披露中的潜在问题。'
      },
      {
        title: '合作结构初步判断',
        description: '判断客户是适合投资、合作、观望，还是需要先做更深度尽调。'
      },
      {
        title: '后续推进建议',
        description: '根据项目情况，建议客户是停止、继续观察、进入深度尽调，还是进入合作谈判。'
      },
      {
        title: '您会得到什么？',
        items: [
          '一个明确的初步判断：继续看 / 暂缓 / 不建议进入',
          '项目关键风险点梳理',
          '项目结构是否合理的初步判断',
          '是否需要进一步尽调的建议',
          '下一步沟通或合作路径建议'
        ]
      },
      {
        title: '该服务不适合：',
        items: [
          '只想听确定收益承诺的人',
          '不愿意提供基本项目资料的人',
          '已经决定投资，只想找人背书的人',
          '完全不接受风险提示的人'
        ]
      },
      {
        title: '服务费用',
        description:
          '项目判断服务根据项目复杂程度与参与深度分为不同层级。具体费用将在初步沟通后，根据项目复杂度、资料完整度和参与深度确定。',
        items: ['基础初筛：用于快速判断项目是否具备继续研究价值。', '深度评估：进一步分析项目结构、风险点、合作条件与推进路径。', '后续协作：如项目具备继续推进基础，可进一步进入尽调、结构设计、资本协作或项目参与阶段。']
      }
    ],
    expertQuote: {
      sarecJudgment:
        '项目判断最重要的价值，不是证明一个项目一定能做，而是尽早发现哪些项目不该继续做。',
      andyObservation:
        '很多跨境投资的损失，并不是因为市场完全不可预测，而是因为客户在进入之前，没有对项目方、结构、审批、融资和退出路径形成独立判断。',
      investorInsight:
        '这不是正式法律、税务或证券意见，也不是收益承诺。它是一项帮助客户在早期阶段提高判断质量的项目初筛服务。'
    },
    fit: [
      '已经接触美国地产项目，但不确定是否值得进入的投资人',
      '被朋友或项目方推荐项目，但缺少独立判断框架的客户',
      '想进入美国地产投资，但不熟悉本地规则和风险结构的客户',
      '希望先通过低门槛项目判断建立信任，再决定是否深入合作的客户',
      '正在考虑参与房地产开发、hard money、EB-5 或其他地产相关项目的客户'
    ],
    related: [
      { label: '华人投资美国房产常见风险', href: '/zh/research/investment-pitfalls/' },
      { label: '如何判断一个美国项目值不值得投', href: '/zh/research/framework/' },
      { label: '投资风险清单', href: '/zh/research/risk-checklist/' }
    ],
    form: {
      title: '在投入之前，先把项目看清。',
      description:
        '如果您已经接触到美国地产项目，或正在考虑是否参与某个投资机会，可以先提交基本情况。我们会根据项目阶段、资料完整度和您的目标，判断是否适合进入初步项目判断流程。',
      submitText: '提交项目信息',
      fields: [
        { label: '姓名', name: 'name', required: true },
        { label: '公司', name: 'company', required: true },
        { label: '联系邮箱', name: 'email', required: true, type: 'email' },
        { label: '微信号', name: 'wechat' },
        {
          label: '项目阶段',
          name: 'project_stage',
          required: true,
          type: 'select',
          options: ['早期规划', '已获地', '在建', '融资阶段', '其他']
        },
        {
          label: '希望的支持',
          name: 'support_needed',
          required: true,
          type: 'select',
          options: ['资本对接', '合作伙伴', '市场推广', '法律合规', '其他']
        },
        { label: '简要说明（选填）', name: 'notes', type: 'textarea' }
      ]
    }
  },
  development: {
    slug: 'development',
    metaTitle: '洛杉矶有哪些值得投的房产开发机会？| 项目开发 | SAREC',
    metaDescription: 'SAREC精选洛杉矶、尔湾优质土地与开发项目，提供项目对接、尽调支持与开发全流程协助。',
    title: '洛杉矶有哪些值得投的房产开发机会？',
    subtitle: '大多数跨境地产项目的问题，并不在于是否存在机会，而在于是否具备进入的条件。项目从概念到落地，真正的难点在执行与协同。',
    problemIntro: '洛杉矶房产机会多，但真正适合中国开发商的项目很有限：',
    problems: [
      '土地资源不透明，好项目轮不到外来者',
      '开发许可和分区审批流程复杂，周期难以预测',
      '本地开发商鱼龙混杂，筛选成本高',
      '中国资方不了解美国开发节奏，容易在融资端出问题'
    ],
    work: [
      {
        title: '项目获取与推进条件梳理',
        description: '围绕地块、规划、许可与项目阶段，判断项目从概念进入执行的现实条件。'
      },
      {
        title: '关键执行节点协调',
        items: ['规划与许可阶段的问题识别', '项目主体与执行团队能力判断', '开发节奏与关键节点梳理', '与法律、财务、设计等专业方的协同推进']
      },
      {
        title: '合作结构与落地路径支持',
        description: '在项目推进过程中，协助理清不同参与方的角色边界、协作逻辑与落地路径。'
      }
    ],
    expertQuote: {
      sarecJudgment:
        '在跨境地产投资中，真正的风险控制，不在于避免所有风险，而在于识别关键风险，并在进入之前完成判断。',
      andyObservation:
        '很多项目在概念阶段看起来成立，但一进入执行层面，真正的问题就会集中暴露：谁负责推进、谁负责承担、谁有能力落地。',
      investorInsight:
        '开发支持的价值，不是替客户做所有事情，而是在关键节点上让项目继续向前，而不是卡在协作和执行之间。'
    },
    fit: [
      '正在评估美国地产项目的投资人',
      '已接触项目但缺乏完整判断框架的客户',
      '希望在进入前降低结构性风险的投资主体'
    ],
    related: [
      { label: '如何判断一个美国项目值不值得投', href: '/zh/research/framework/' },
      { label: '投资风险清单', href: '/zh/research/risk-checklist/' },
      { label: '往期案例', href: '/zh/projects/' }
    ],
    form: {
      title: '开始一次项目讨论',
      submitText: '提交项目信息',
      fields: [
        { label: '姓名', name: 'name', required: true },
        { label: '联系邮箱', name: 'email', required: true, type: 'email' },
        { label: '微信号', name: 'wechat', required: true },
        {
          label: '预算规模',
          name: 'budget',
          required: true,
          type: 'select',
          options: ['$500万以下', '$500-2000万', '$2000万以上', '未确定']
        },
        {
          label: '关注类型',
          name: 'focus_type',
          required: true,
          type: 'select',
          options: ['住宅', '商业', '土地', '在建项目']
        },
        {
          label: '时间框架',
          name: 'timeline',
          type: 'select',
          options: ['3个月内', '半年内', '1年内', '灵活']
        }
      ]
    }
  },
  dueDiligence: {
    slug: 'due-diligence',
    metaTitle: '美国房产项目有哪些致命风险？| 风控尽调 | SAREC',
    metaDescription:
      'SAREC提供针对美国房产项目的系统性风险评估与尽职调查，覆盖开发商背景、法律合规、财务结构与退出机制。',
    title: '投资美国房产之前，这些风险你查清楚了吗？',
    subtitle: '大多数跨境地产项目的问题，并不在于是否存在机会，而在于是否具备进入的条件。风险通常不是发生在项目失败之后，而是在进入之前没有被识别。',
    problemIntro: '很多中国投资人在美国吃亏，不是因为市场判断错了，而是因为做了决策却没有做尽调：',
    problems: [
      '开发商过去的项目从没交付过，但没有人告诉你',
      '项目土地有产权纠纷，律师意见是标准模板，没有人真的去查',
      '财务结构里藏着优先回报给GP的条款，你的收益被结构性稀释了',
      '退出机制不清晰，锁定期超过你的资金计划'
    ],
    work: [
      { title: '项目主体背景核查', description: '对开发商、关联方、历史项目记录及潜在法律风险进行系统核查。' },
      { title: '法律与产权结构审阅', description: '围绕产权、许可、法律文件及主要责任边界，识别进入前必须厘清的问题。' },
      { title: '财务逻辑与交易结构分析', description: '检查资金来源、回报分配、优先级安排及潜在结构性风险。' },
      { title: '市场可行性验证', description: '通过市场对比、成本逻辑与退出假设，对项目可行性做现实判断。' },
      { title: '关键风险清单输出', description: '形成进入前的风险清单与判断建议，帮助客户明确该进、缓进或不进。' }
    ],
    expertQuote: {
      sarecJudgment:
        '在跨境地产投资中，真正的风险控制，不在于避免所有风险，而在于识别关键风险，并在进入之前完成判断。',
      andyObservation:
        '多数风险并不隐藏在市场表面，而是隐藏在项目主体、法律文件和财务安排里。没有系统核查，进入本身就可能是错误。 ',
      investorInsight:
        '对投资主体而言，尽调不是附加动作，而是进入之前必须完成的决策前提。'
    },
    fit: [
      '正在评估美国地产项目的投资人',
      '已接触项目但缺乏完整判断框架的客户',
      '希望在进入前降低结构性风险的投资主体'
    ],
    related: [
      { label: '投资风险清单', href: '/zh/research/risk-checklist/' },
      { label: '项目判断框架', href: '/zh/research/framework/' }
    ],
    form: {
      title: '开始一次项目讨论',
      submitText: '提交项目信息',
      fields: [
        { label: '姓名', name: 'name', required: true },
        { label: '联系邮箱', name: 'email', required: true, type: 'email' },
        { label: '微信号', name: 'wechat', required: true },
        { label: '项目类型', name: 'project_type', required: true, type: 'select', options: ['住宅', '商业', 'EB-5', '其他'] },
        { label: '项目规模', name: 'project_scale', type: 'select', options: ['$500万以下', '$500-2000万', '$2000万以上'] },
        {
          label: '最担心的风险点',
          name: 'risk_focus',
          required: true,
          type: 'select',
          options: ['开发商背景', '产权法律', '财务结构', '市场可行性', '退出机制']
        }
      ]
    }
  },
  capital: {
    slug: 'capital',
    metaTitle: '中国资本如何合规对接美国房产开发商？| 资本对接 | SAREC',
    metaDescription:
      'SAREC连接中方资金与美国优质项目方，推动合规结构下的跨境投资落地，覆盖EB-5、夹层融资、联合开发等结构。',
    title: '中国资本如何合规、高效地对接美国开发机会？',
    subtitle: '大多数跨境地产项目的问题，并不在于是否存在机会，而在于是否具备进入的条件。资金与项目的匹配，从来不是简单的对接问题，而是结构问题。',
    problemIntro: '中国资本进入美国地产市场有很高的隐性门槛：',
    problems: [
      '找不到真正优质的项目，市面上的机会要么太贵要么有问题',
      '合规结构不清楚，资金跨境、税务处理容易踩雷',
      '美国项目方不了解中国投资人的决策习惯，双方沟通效率极低',
      'EB-5以外的投资结构选项少，知道的人少'
    ],
    work: [
      {
        title: '资金与项目的匹配判断',
        items: ['围绕资金属性、项目阶段与合作目标，判断双方是否具备匹配基础', '明确资金需求与项目需求之间是否在结构上可成立', '识别合作中最容易失衡的角色与利益安排']
      },
      {
        title: '合作结构梳理',
        items: ['协助讨论股权、债权、夹层或其他安排的适配性', '对回报顺序、权责边界与推进机制进行前置梳理', '判断结构是否真正适合进入下一阶段']
      },
      {
        title: '资源协同与推进支持',
        items: ['在具备明确判断基础上，推动双方沟通进入更有效率的讨论', '协助整理对接材料与关键问题清单', '在推进过程中持续对齐信息、节奏与执行预期']
      }
    ],
    expertQuote: {
      sarecJudgment:
        '在跨境地产投资中，真正的风险控制，不在于避免所有风险，而在于识别关键风险，并在进入之前完成判断。',
      andyObservation:
        '资本协同最常见的失败，不是没有见到对手方，而是在结构还没成立时就仓促进入推进。对接之前，先判断结构是否成立，远比把人拉到桌上更重要。',
      investorInsight:
        '对投资主体而言，资本与项目的匹配必须建立在结构清晰、角色明确与执行可推进的前提上。'
    },
    fit: [
      '正在评估美国地产项目的投资人',
      '已接触项目但缺乏完整判断框架的客户',
      '希望在进入前降低结构性风险的投资主体'
    ],
    related: [
      { label: 'EB-5投资完全指南', href: '/zh/research/eb5/' },
      { label: '投资风险清单', href: '/zh/research/risk-checklist/' }
    ],
    form: {
      title: '开始一次项目讨论',
      submitText: '提交项目信息',
      fields: [
        { label: '姓名', name: 'name', required: true },
        { label: '联系邮箱', name: 'email', required: true, type: 'email' },
        { label: '微信号', name: 'wechat', required: true },
        { label: '身份', name: 'identity', required: true, type: 'select', options: ['投资人', '项目方'] },
        {
          label: '投资规模或项目规模',
          name: 'scale',
          required: true,
          type: 'select',
          options: ['$500万以下', '$500-2000万', '$2000万以上']
        },
        {
          label: '最关注的结构类型',
          name: 'structure_type',
          required: true,
          type: 'select',
          options: ['EB-5', '夹层融资', '股权入股', '其他']
        }
      ]
    }
  }
};

export const aboutPage = {
  metaTitle: '关于 SAREC | 跨境地产项目协作与资源整合平台',
  metaDescription:
    'SAREC 是跨境地产项目协作与资源整合平台，连接中国资本、美国资本与美国项目方，围绕项目判断、结构设计、风险控制与落地协同推进合作。',
  title: '关于 SAREC',
  subtitle:
    'SAREC 不是一个单纯的信息平台，也不是一站式“带看美国项目”的中介网站。我们更像跨境地产合作中的判断层与协作层——在中国资本、美国资本与美国项目方之间，把最容易出问题的环节提前看清、对齐、拆解。',
  who: {
    title: '我们是谁',
    body: [
      'SAREC 是跨境地产项目协作与资源整合平台，服务于希望进入美国市场的中国开发商、投资人，以及希望建立高质量跨境合作关系的美国项目方。',
      '我们理解的跨境地产合作，不是简单地把项目、资金和人放到同一个桌面上，而是先把判断框架、合作边界、结构逻辑和执行路径建立起来。',
      '真正成熟的合作，不靠热闹，不靠故事，而靠对项目的理解、对风险的尊重，以及对落地过程的持续把控。'
    ],
    bullets: []
  },
  positioning: {
    title: '我们的定位',
    intro: '跨境地产项目协作与资源整合平台',
    body:
      'SAREC 连接中国资本、美国资本与美国项目方。我们的工作不止于资源对接，而是围绕项目判断、结构设计、风险控制与落地协同，推动跨境合作真正成立并向前推进。'
  },
  functions: [
    {
      title: '项目判断与研究支持',
      lines: ['围绕开发项目、投资结构、市场变化与政策环境，建立更接近实务的判断框架，而不是停留在表面信息层面。']
    },
    {
      title: '跨境资源整合与协作推动',
      lines: ['连接中国资本、美国资本与美国项目方，并在关键合作节点中推动信息对齐、角色协同与执行落地。']
    },
    {
      title: '风控、结构与落地支持',
      lines: ['从项目进入前的尽调判断，到合作过程中的结构设计、许可推进、执行配合与风险识别，形成更完整的支持链条。']
    }
  ],
  statsIntro:
    '这些数字的意义，不在于规模本身，而在于长期积累下来的合作密度、问题样本与判断经验。对于跨境地产合作来说，经验并不是“看过很多项目”，而是知道哪些项目不能进、哪些结构不能碰、哪些合作关系一开始就不成立。',
  stats: [
    { value: '100+', label: '跨境合作伙伴' },
    { value: '2000+', label: '服务与接触客户' },
    { value: '124场', label: '活动与交流记录' }
  ],
  partners:
    'SAREC 与开发、资本、法律、财务、设计、市场等多个专业端保持持续合作。我们不把“认识很多人”视为优势，真正的优势在于——知道在什么场景下，应该让谁进场，谁不该进场。',
  contact: {
    body:
      '如果您正在评估一个项目，或正在寻找合适的跨境合作路径，欢迎与我们联系。我们更愿意先讨论问题本身，而不是急着推进结果。',
    address: '洛杉矶市',
    phone: '+1（626）658-6066',
    email: 'info@sinoamericanrec.org'
  },
  ctas: [
    { text: '预约项目交流', href: '/zh/contact/' },
    { text: '查看项目与案例', href: '/zh/projects/' }
  ]
};

export const footerContent = {
  groups: [
    {
      title: '核心服务',
      links: [
        { label: '出海战略咨询', href: '/zh/services/strategy/' },
        { label: '洛杉矶项目开发', href: '/zh/services/development/' },
        { label: '风控尽调服务', href: '/zh/services/due-diligence/' },
        { label: '资本对接协作', href: '/zh/services/capital/' }
      ]
    },
    {
      title: '研究与判断',
      links: [
        { label: 'EB-5', href: '/zh/research/eb5/' },
        { label: '投资常见风险', href: '/zh/research/investment-pitfalls/' },
        { label: '项目判断框架', href: '/zh/research/framework/' },
        { label: '风险清单', href: '/zh/research/risk-checklist/' }
      ]
    },
    {
      title: '机构信息',
      links: [
        { label: '关于 SAREC', href: '/zh/about/' },
        { label: '会员服务', href: '/zh/membership/' },
        { label: '项目与案例', href: '/zh/projects/' },
        { label: '联系 SAREC', href: '/zh/contact/' }
      ]
    },
    {
      title: '法律与合规',
      links: [
        { label: '风险披露', href: '/zh/legal/risk-disclosure/' },
        { label: '隐私政策', href: '/zh/legal/privacy/' },
        { label: '免责声明', href: '/zh/legal/disclaimer/' }
      ]
    }
  ],
  disclaimer: '页面内容仅作信息说明、案例展示与研究参考，不构成公开募资、收益承诺或投资建议。'
};

export const servicesOverviewPage = {
  metaTitle: 'SAREC核心服务 | 出海战略・项目开发・风控尽调・资本对接',
  metaDescription: 'SAREC为中国开发商和投资人提供四项核心服务：出海战略咨询、洛杉矶项目开发、风控尽调、资本对接撮合。',
  title: '核心服务',
  subtitle: '我们不提供单一服务，而是围绕跨境地产投资的关键环节，提供系统性的判断、结构设计与落地支持。',
  positioningIntro: '在跨境地产合作中，大多数问题并不出现在资源获取，而是出现在判断、结构与执行环节。',
  positioningPoints: ['项目判断', '风险识别', '交易结构设计', '资源协同与执行推进'],
  positioningOutro: 'SAREC 的服务，并不是简单的撮合或单点支持，而是围绕以上核心能力展开：',
  services: [
    {
      title: '项目判断与投资策略',
      description: '在进入一个项目之前，判断本身就是最重要的决策。我们帮助客户从市场、产品、位置、结构与退出路径等多个维度，对项目进行系统性分析与初步判断。',
      href: '/zh/services/strategy/'
    },
    {
      title: '项目开发与落地支持',
      description: '从项目获取、规划推进，到开发过程中的关键节点，我们参与并协调不同角色，推动项目从方案走向现实。',
      href: '/zh/services/development/'
    },
    {
      title: '风险识别与尽职调查',
      description: '通过对项目主体、法律结构、财务逻辑及市场可行性的系统核查，帮助客户在进入前识别关键风险。',
      href: '/zh/services/due-diligence/'
    },
    {
      title: '资本与项目协同',
      description: '在具备明确判断基础上，我们协助匹配合适的资金与项目方，并推动合作结构的建立与落地。',
      href: '/zh/services/capital/'
    }
  ],
  guide: [
    '不确定应从哪一项服务开始，也不必先急着做决定。',
    '告诉我们您当前所处的阶段，我们可以先帮助判断，问题究竟出在项目、结构、风险，还是执行环节。'
  ],
  cta: { text: '预约30分钟免费咨询', href: '/zh/contact/' }
};

export const projectsPage = {
  metaTitle: 'SAREC合作项目与投资案例 | 洛杉矶房产开发实例',
  metaDescription: 'SAREC历年合作的洛杉矶房产开发项目与投资案例，展示中美联合开发、EB-5项目及资本对接实例。',
  title: 'SAREC合作项目与案例',
  subtitle: '不是广告，是真实记录。以下是SAREC参与协调的部分项目，展示我们如何在实际工作中帮助客户',
  active: {
    title: '在建/活跃项目',
    note: '页面展示仅作项目案例说明，不构成公开募资、收益承诺或投资建议。具体合作方式、资料披露范围与商业条款，以后续正式文件为准。',
    items: [
      {
        name: '4136 Rosewood｜洛杉矶精品公寓开发项目',
        area: '洛杉矶成熟社区，距市中心约 15 分钟车程，周边生活配套与交通条件较成熟。',
        type: '精品公寓开发',
        scale: '69 个公寓单元，6 层建筑。',
        status: '已进入实质推进阶段',
        stage: '已完成关键土地 entitlement 审批，开工许可手续已完成，建筑贷款手续已完成，随时可以开工，属于已进入实质推进阶段的开发项目。',
        positioning: '面向中高收入家庭及专业人士的中高端公寓产品。',
        summaries: ['69 单元', '6 层', '洛杉矶成熟社区', '关键审批已推进'],
        description:
          '4136 Rosewood 是 Terra Capital 当前重点推进的洛杉矶住宅开发项目之一。项目不属于概念性展示，而是已经进入实际审批与推进流程的真实开发案例。该项目可作为 SAREC / Terra Capital 在洛杉矶住宅开发方向上的代表性案例，用于展示项目判断、审批推进、产品定位和开发管理能力。',
        boundary:
          '页面展示仅作项目案例说明，不构成公开募资、收益承诺或投资建议。具体合作方式、资料披露范围与商业条款，以后续正式文件为准。'
      }
    ]
  },
  completed: {
    title: '已完成项目',
    note: '使用同一项目卡片结构，状态标注为"已竣工"。'
  },
  cases: [
    {
      title: 'EB-5申请人如何规避区域中心风险',
      background: '某中国客户接触了一个EB-5项目，项目材料完整，开发商口碑良好。',
      action: '独立查询到该区域中心有一项未公开的SEC非正式调查记录。',
      result: '客户放弃投资。18个月后该区域中心被暂停。',
      linkText: '了解SAREC风控尽调服务',
      href: '/zh/services/due-diligence/'
    },
    {
      title: '中美联合开发如何搭建合规结构',
      background: '一家中国开发商希望在洛杉矶以LP身份参与一个住宅项目。',
      action: '协助设计Delaware LP结构，完成资金来源文件准备，对接移民律师。',
      result: '项目顺利启动，资金合规到位。',
      linkText: '了解SAREC资本对接服务',
      href: '/zh/services/capital/'
    }
  ],
  invite: {
    title: '想把您的项目放进来？',
    body: '如果您有洛杉矶/南加州的房产项目，或有已完成的中美合作案例，欢迎联系SAREC，我们可以探讨合作展示的可能性。',
    cta: { text: '联系我们', href: '/zh/contact/' }
  }
};

export const researchPages: Record<string, ResearchArticleContent> = {
  eb5: {
    slug: 'eb5',
    metaTitle: 'EB-5是什么？2026年值不值得投？SAREC完整解析',
    metaDescription:
      'EB-5投资移民全面指南：政策现状、投资金额、排期、风险与SAREC专家判断。适合正在评估EB-5的中国投资人。',
    title: 'EB-5投资移民：2026年还值不值得投？',
    sections: [
      {
        title: 'EB-5是什么？',
        paragraphs: [
          'EB-5（Employment-Based Fifth Preference）是美国国会于1990年设立的投资移民项目。投资人将资金投入美国商业项目，创造一定数量的就业岗位，换取美国绿卡。',
          '本质上，EB-5是一种附带移民属性的私募股权投资：你投的是一个美国房地产或商业开发项目，回报是绿卡，而不是现金分红（虽然有些项目也给利息）。'
        ]
      },
      {
        title: '2026年EB-5关键参数',
        table: [
          { label: '普通投资额', value: '$1,050,000' },
          { label: 'TEA区域投资额', value: '$800,000' },
          { label: '每年签证配额', value: '约10,000个（含家属）' },
          { label: '中国大陆排期', value: '当前约2-3年（视政策）' },
          { label: '投资结构', value: '通过区域中心（Regional Center）' }
        ]
      },
      {
        title: 'EB-5投资流程',
        orderedItems: [
          '选择项目与区域中心：核查区域中心合法性（USCIS注册），审查项目可行性报告和财务结构，律师审查认购协议',
          '资金准备与合规：证明资金合法来源（Source of Funds），完成跨境资金转移合规安排',
          '提交I-526申请：由移民律师准备申请材料，审批周期约12-24个月，批准后进入排期等待',
          '获得有条件绿卡：中国大陆申请人等排期，通常1-3年，排期到后签证面谈，入境获2年有条件绿卡',
          '申请I-829移除条件：项目完工 + 就业创造证明，移除绿卡条件，获永久绿卡'
        ]
      },
      {
        title: 'EB-5主要风险',
        orderedItems: [
          '项目失败：如开发商破产，投资本金可能无法收回。',
          '排期延长：中国大陆申请人排期历史上最长达10年以上，存在政策变动风险。',
          '就业创造未达标：如项目未能创造足够就业，I-829可能被拒，绿卡条件无法移除。',
          '区域中心合规问题：历史上有区域中心因欺诈被SEC调查，投资人损失全部本金。'
        ]
      },
      {
        title: 'EB-5适合哪些人？',
        bullets: [
          '有移民美国需求，愿意以投资换绿卡路径的高净值人群',
          '投资预算在$80万以上，可接受5-7年锁定期',
          '希望合法合规完成资产美元化配置'
        ],
        negativeBullets: ['纯粹追求投资回报（EB-5回报率通常低于同类私募）', '无法接受较长审批周期的申请人']
      }
    ],
    expertQuote: {
      sarecJudgment:
        'EB-5对于有移民需求的中国高净值人群仍然是最直接的路径，但2022年RI5CA法案之后，项目筛选的门槛显著提高了。区域中心的合规历史和项目本身的可行性，是比投资金额更重要的判断维度。',
      andyObservation:
        '我们见过很多EB-5项目，好的项目开发商有完整的竣工历史，财务结构透明，就业测算保守。差的项目往往在销售PPT上很漂亮，但项目可行性报告是用最乐观假设做的。第一步：找独立律师和顾问做背景调查，不要只看项目方提供的材料。',
      investorInsight: 'EB-5不是买保险，是一笔真实的私募投资。把它当投资来做尽调，而不是当移民工具来走流程。'
    },
    relatedTitle: '相关资源',
    related: [
      { label: '投资风险清单', href: '/zh/research/risk-checklist/' },
      { label: '项目判断框架', href: '/zh/research/framework/' }
    ],
    cta: {
      title: '正在评估EB-5项目？SAREC提供独立的项目背景核查服务。',
      href: '/zh/contact/#investment',
      text: '预约免费初步咨询'
    }
  },
  investmentPitfalls: {
    slug: 'investment-pitfalls',
    metaTitle: '华人投资美国房产的7个常见风险 | SAREC实战总结',
    metaDescription:
      'SAREC整理华人投资美国房产最常见的7类风险，每条都有真实案例背景，帮助投资人在决策前建立风险意识。',
    title: '华人投资美国房产，这7类风险最容易被忽视',
    subtitle: '不是吓你，是帮你提前想清楚。SAREC从多年陪同客户的实战中总结，每一条都有真实案例背景',
    sections: [
      {
        title: '7类常见风险',
        detailItems: [
          {
            title: '风险1：合伙人背景没有独立核查',
            body:
              '最常见的失误之一。项目方提供的资料永远是最好看的版本。开发商过去的项目是否按时完工？有没有诉讼记录？关联方是否复杂？这些信息在美国的公开数据库里都能查到，但大多数人没有查。'
          },
          {
            title: '风险2：法律文件没有独立律师审查',
            body:
              '美国项目的认购协议通常几十页，条款里藏着：优先回报给GP的安排（你的收益被稀释）、锁定期条款（你以为可以退出，其实不行）、责任豁免条款（出了问题开发商不负责）。不找独立律师，只看项目方提供的"要点摘要"，等于蒙眼签字。'
          },
          {
            title: '风险3：资金来源合规准备不足',
            body:
              'EB-5申请中，资金合法来源证明（Source of Funds）是最常被拒原因之一。很多申请人低估了USCIS对资金溯源的严格程度：赠与款、出售资产所得、股权转让收入——每一笔都需要文件链条。提前1-2年开始准备，而不是等签约再补材料。'
          },
          {
            title: '风险4：对美国开发周期的预期不现实',
            body:
              '中国的地产开发节奏和美国完全不同。美国的许可审批流程（Entitlement）可能需要2-3年，在此期间资金锁定，市场可能已经变化。进场前，把开发周期按最悲观的估算再乘以1.5倍来计划资金。'
          },
          {
            title: '风险5：选择了错误的投资结构',
            body:
              '并非所有"美国房产投资"都是同一回事：EB-5 ≠ 直接购房 ≠ 房地产基金 ≠ 夹层融资。不同结构的风险、回报、流动性、税务处理完全不同。在决定"投什么项目"之前，先搞清楚"用什么结构投"。'
          },
          {
            title: '风险6：退出机制不清晰',
            body:
              '很多投资人在进场时没有认真想退出问题：什么情况下可以退出？谁来收购你的份额？锁定期多长？如果项目方没有提供清晰的退出安排，这本身就是风险信号。'
          },
          {
            title: '风险7：忽视汇率和资金回流风险',
            body:
              '投资回报最终要回到中国，但跨境资金流动有合规要求。美元对人民币汇率的变化，可能吃掉你的实际回报。提前做好汇率对冲和资金回流的合规安排，是经常被忽视的最后一步。'
          }
        ]
      }
    ],
    expertQuote: {
      sarecJudgment:
        '这7类风险，没有一条是因为市场不好造成的。都是可以通过尽调、合适的结构和独立顾问来规避的。美国市场不缺机会，缺的是有能力帮你做真实判断的伙伴。',
      andyObservation:
        '遇到过一个客户，项目各方面看起来都不错。但在谈合同阶段，项目方拒绝提供某份财务文件，说"这是内部资料"。我建议客户不要投。后来那个项目果然出了问题。一个真正好的项目，不会拒绝独立审查。',
      investorInsight: '做尽调不是不信任对方，是保护自己。在美国这个法律体系里，签了字就是你的责任。'
    },
    relatedTitle: '相关工具',
    related: [
      { label: '下载：SAREC投资风险清单', href: '/zh/research/risk-checklist/' },
      { label: '了解SAREC风控尽调服务', href: '/zh/services/due-diligence/' }
    ],
    cta: {
      title: '需要先评估项目风险？',
      href: '/zh/services/due-diligence/',
      text: '委托SAREC做风控尽调'
    }
  },
  framework: {
    slug: 'framework',
    metaTitle: '如何判断一个美国房产项目值不值得投？| SAREC判断框架',
    metaDescription: 'SAREC实战项目评估框架，5个维度帮助投资人从公开信息对美国房产项目做出初步判断。',
    title: '拿到一个美国房产项目，你应该问哪5个问题？',
    subtitle: 'SAREC整理的实战初判框架。用公开信息完成第一轮筛选，再决定是否值得深入尽调',
    sections: [
      {
        title: '5个项目判断维度',
        detailItems: [
          {
            title: '维度1：开发商历史项目记录',
            question: '要查的问题：这家开发商过去5年完成了多少个类似项目？有没有按时交付？有没有超预算？有没有未决诉讼或SEC调查记录？',
            method: '查找方法：美国各州的法院公开记录（Pacer等系统）、USCIS对EB-5区域中心的监管记录、LinkedIn + Google搜索关键人员背景',
            redFlag: '红旗信号：开发商无法提供已完成项目列表，或已完成项目寥寥。'
          },
          {
            title: '维度2：土地与许可状态',
            question: '要查的问题：土地是否已经完成产权清晰的收购？开发许可（Entitlement）处于哪个阶段？分区是否支持目标开发类型？',
            redFlag: '红旗信号：土地仍在谈判中，或开发许可尚未启动，但项目已在募资。'
          },
          {
            title: '维度3：财务结构合理性',
            question: '要查的问题：项目总投资的资金来源构成（自有资金/银行贷款/EB-5/其他）？GP的资金投入比例？（低于10%需警惕）优先回报给谁？回报率假设是否现实？',
            redFlag: '红旗信号：GP几乎无自有资金投入，全靠LP承担风险。'
          },
          {
            title: '维度4：市场可行性',
            question: '要查的问题：项目所在区域的可比项目（Comps）近期成交价是多少？项目的销售/租金假设是否与市场数据匹配？开发完成后的出售对象是谁？',
            method: '查找方法：Zillow、Redfin、CoStar可查可比数据；LA County Assessor可查区域历史成交',
            redFlag: '红旗信号：财务模型使用的售价/租金假设明显高于近期Comps。'
          },
          {
            title: '维度5：退出机制',
            question: '要查的问题：项目计划的退出时间线是多少？是出售、再融资还是持有出租？如果项目延期，LP的权利是什么？',
            redFlag: '红旗信号：退出机制模糊，或合同中没有针对延期的处理条款。'
          }
        ]
      },
      {
        title: '初判结论标准',
        bullets: ['5个维度全部通过：进入深度尽调', '3-4个通过：有条件推进，重点关注未通过维度', '2个以下通过：建议放弃']
      }
    ],
    expertQuote: {
      sarecJudgment:
        '这个框架是初筛工具，不是最终决策依据。通过初筛的项目，还需要专业律师和财务顾问做完整尽调。但用这5个维度做第一轮筛选，至少能淘汰掉70%的问题项目。',
      andyObservation:
        '最容易被忽视的是维度3（财务结构）。很多投资人看了区域、看了渲染图，就被吸引了。但真正决定你能不能拿到回报的，是合同条款里的分配结构。把协议发给一个不认识项目方的独立律师，让他用5分钟告诉你"这个结构对LP公平吗"。',
      investorInsight: '花2小时做初判，可能省下几年的麻烦。这个框架的目的不是让你更复杂，而是让你更快找到真正值得深入看的项目。'
    },
    relatedTitle: '相关工具',
    related: [
      { label: 'SAREC投资风险清单（可下载）', href: '/zh/research/risk-checklist/' },
      { label: '委托SAREC做风控尽调', href: '/zh/services/due-diligence/' }
    ],
    cta: {
      title: '需要先评估项目风险？',
      href: '/zh/services/due-diligence/',
      text: '委托SAREC做风控尽调'
    }
  }
};

export const solutionsPage = {
  metaTitle: '合作方案 | SAREC',
  metaDescription:
    'SAREC 面向开发商、投资人和项目方，提供从项目判断、风险识别、结构设计到落地协作的合作方案。',
  title: '你是想投资美国地产，还是想在美国做项目？',
  subtitle:
    'SAREC 面向开发商、投资人和项目方，提供从项目判断、风险识别、结构设计到落地协作的合作方案。我们不把合作停留在“介绍资源”，而是帮助客户判断是否值得进入、如何进入，以及进入后如何推进。',
  heroPrimaryCTA: { text: '提交合作需求', href: '/zh/contact/' },
  heroSecondaryCTA: { text: '预约项目讨论', href: '/zh/contact/' },
  entry: {
    title: '四种合作方式',
    intro:
      '不同客户进入美国地产市场的起点不同。SAREC 根据客户阶段、资源条件和目标，提供不同层级的合作方式。',
    items: [
      {
        title: '项目判断与风控咨询',
        fit: '已经接触美国地产项目，但不确定是否值得进入的客户。',
        scope:
          '对项目位置、开发阶段、项目方背景、审批状态、资金结构、退出路径和关键风险进行初步判断。',
        result: '项目初筛意见、主要风险点、下一步建议。',
        fee: '根据项目复杂度和参与深度收取咨询费。',
        cta: { text: '提交项目资料', href: '/zh/contact/' }
      },
      {
        title: '房地产项目合作',
        fit: '有资金、有项目需求，或希望参与美国房地产开发项目的客户。',
        scope: '围绕真实项目，参与项目判断、结构设计、资源协调、开发推进和后续落地协作。',
        result: '项目参与路径、合作结构建议、落地推进支持。',
        fee: '根据具体项目，可采用管理费、顾问费、佣金、项目分成或其他合作结构。',
        cta: { text: '预约项目合作讨论', href: '/zh/contact/' }
      },
      {
        title: '资本与项目对接',
        fit: '有项目需要资金，或有资金希望寻找合适房地产项目的客户。',
        scope: '在完成基本判断与风险识别后，推动资金方、项目方和相关专业资源之间的沟通与协作。',
        result: '资本对接路径、合作条件梳理、结构建议。',
        fee: '根据合作性质，可采用咨询费、居间佣金、成功费或长期合作方式。',
        cta: { text: '提交对接需求', href: '/zh/contact/' }
      },
      {
        title: '美国家庭资产配置咨询',
        fit: '希望通过房地产、保险、信贷、hard money、基金或其他金融工具进行美国资产配置的客户。',
        scope:
          '基于客户身份、资金规模、风险偏好和家庭目标，提供美国资产配置方向建议，并在合规范围内对接相关产品或专业机构。',
        result: '资产配置思路、产品方向建议、后续执行路径。',
        fee: '可根据服务内容收取咨询费，也可能通过合规产品推荐或合作机构获得佣金。',
        cta: { text: '预约资产配置咨询', href: '/zh/contact/' }
      }
    ]
  },
  principles: {
    title: '我们如何判断是否合作？',
    intro: 'SAREC 不追求所有机会，也不适合所有客户。我们更关注三件事：',
    items: [
      {
        title: '项目是否真实',
        body: '是否具备清晰的资产、土地、审批、资金、开发或退出逻辑。'
      },
      {
        title: '结构是否合理',
        body: '合作关系、权责边界、资金路径和风险承担是否清楚。'
      },
      {
        title: '双方是否适合长期合作',
        body: '真正有价值的合作，不是一笔交易，而是持续建立判断、信任和执行能力。'
      }
    ]
  },
  steps: {
    title: '如何开始合作？',
    items: [
      {
        title: '提交基本需求',
        body: '您可以提交项目资料、投资目标、资产配置需求或合作想法。'
      },
      {
        title: '初步判断',
        body: 'SAREC 根据资料完整度和合作方向，判断是否适合进入下一步沟通。'
      },
      {
        title: '确定合作方式',
        body: '根据客户目标和项目情况，确定咨询、项目合作、资本对接、资产配置或其他合作路径。'
      },
      {
        title: '进入执行',
        body: '在合作条件明确后，进入具体判断、结构设计、资源协同或项目推进阶段。'
      }
    ]
  },
  notice: {
    title: '重要说明',
    body: [
      '本页面内容仅用于说明 SAREC 可提供的合作方向，不构成公开募资、收益承诺、证券发行、法律、税务或投资建议。',
      '具体合作方式、收费结构、资料披露范围与商业条款，均需根据具体项目、客户情况和正式文件另行确认。'
    ]
  },
  cta: {
    title: '如果您已经有项目、资金或合作需求，现在可以先进入一次初步判断。',
    subtitle: '我们会先看您的目标、项目阶段和资料情况，再判断是否适合进一步沟通。',
    primary: { text: '提交合作需求', href: '/zh/contact/' },
    secondary: { text: '预约项目讨论', href: '/zh/contact/' }
  }
};
