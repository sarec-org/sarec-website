/**
 * 研究中心索引（网站 /zh/research 与小程序内容接口共用，只维护这一份）。
 */
export type IndexArticle = {
  code: string;
  title: string;
  desc: string;
  href: string;
};

export type IndexCategory = {
  eyebrow: string;
  title: string;
  articles: IndexArticle[];
};

export const indexCategories: IndexCategory[] = [
  {
    eyebrow: 'A · MARKET & POLICY',
    title: '市场与政策',
    articles: [
      {
        code: '01',
        title: 'ED1 政策与项目机会深度解读',
        desc: '从政策窗口到真实周期,从资格定义到审批通道 —— ED1 经济适用房项目的完整理解框架。',
        href: '/zh/research/los-angeles-ed1-affordable-housing'
      },
      {
        code: '02',
        title: '美国房地产开发流程',
        desc: '土地、设计、entitlement、审批、施工、运营、退出 —— 一个完整开发周期的关键节点解析。',
        href: '/zh/research/us-real-estate-development-process'
      }
    ]
  },
  {
    eyebrow: 'B · STRUCTURE & METRICS',
    title: '投资结构与指标',
    articles: [
      {
        code: '03',
        title: 'LP / GP 结构与项目合作机制',
        desc: '资金、权力、责任、退出 —— 跨境地产合作中真正决定结果的是结构,不是项目本身。',
        href: '/zh/research/lp-gp-structure'
      },
      {
        code: '04',
        title: 'Cap Rate / IRR / ROE 指标理解',
        desc: '收益指标背后的假设、风险与限制 —— 读懂模型,而不只是数字。',
        href: '/zh/research/cap-rate-irr-roe'
      },
      {
        code: '05',
        title: '跨境房地产投资判断框架',
        desc: '5 个维度构成的实战初判方法 —— 用公开信息完成第一轮筛选,再决定是否深入尽调。',
        href: '/zh/research/framework'
      }
    ]
  },
  {
    eyebrow: 'C · RISK MANAGEMENT',
    title: '风险控制',
    articles: [
      {
        code: '06',
        title: '中国投资人美国房地产常见风险',
        desc: '九类系统性风险,从信息不对称到退出机制 —— 跨境投资人必须看懂的判断框架。',
        href: '/zh/research/chinese-investors-us-real-estate-risks'
      },
      {
        code: '07',
        title: '美国房地产投资风险清单',
        desc: '8 个模块、可直接用于项目初筛的检查清单 —— 把关键问题提前问清楚。',
        href: '/zh/research/risk-checklist'
      },
      {
        code: '08',
        title: '美国房地产投资常见误区',
        desc: '7 类华人投资人最容易踩到的陷阱,每条都来自 SAREC 实战案例背景。',
        href: '/zh/research/investment-pitfalls'
      }
    ]
  },
  {
    eyebrow: 'D · EB-5 & IMMIGRATION',
    title: 'EB-5 / 移民与地产',
    articles: [
      {
        code: '09',
        title: 'EB-5 与美国房地产项目',
        desc: 'EB-5 投资移民全景 —— 政策、金额、排期、流程、风险,与 SAREC 的尽调判断。',
        href: '/zh/research/eb5'
      }
    ]
  }
];
