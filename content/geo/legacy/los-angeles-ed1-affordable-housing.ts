import type { LegacyResearchGeo } from '../../../lib/geo/types';

const data: LegacyResearchGeo = {
  slug: 'los-angeles-ed1-affordable-housing',
  title: '洛杉矶 ED1 与经济适用房开发观察',
  description:
    '从政策背景、审批效率、土地适用性、融资、建设成本、长期运营和退出路径等角度，观察洛杉矶 ED1 与 100% 经济适用房开发项目中的机会与风险。',
  directAnswer:
    'ED1（洛杉矶市长 Karen Bass 签发的 Executive Directive No. 1）为符合条件的 100% 经济适用房项目提供更高效的审批路径，但它改变的是审批路径，不是项目成败。审批加速不等于无审批，项目仍需满足设计、建筑、消防、公用事业、租户保护等部门要求，并且仍要面对融资、建设成本、长期运营和退出的真实考验。判断 ED1 项目，第一步应看土地和政策是否真正适用，而不是先看收益。ED1 的具体规则和执行口径可能调整，应以洛杉矶市官方最新公告为准。',
  faq: [
    {
      question: 'ED1 是什么？',
      answer:
        'ED1 是洛杉矶市长 Karen Bass 签发的第 1 号行政指令（Executive Directive No. 1），目的是加快临时住房和符合条件的 100% 经济适用房项目的许可与审批。该指令此后经过多次修订，相关执行指引由市政府部门发布，具体适用条件应以市长办公室、City Planning 和 LAHD 的官方页面为准。'
    },
    {
      question: '项目走 ED1 路径，是否就等于自动获批？',
      answer:
        '不是。ED1 可能缩短部分审批周期、减少部分 discretionary review 的不确定性，但项目仍需完成 Plan Check、回复 Corrections、取得 Permit 和各部门 clearance，LADBS、LAFD、LADWP 等部门的未决事项仍可能影响进度。审批加速只能降低部分时间和程序不确定性，不能替代技术审查和施工准备。'
    },
    {
      question: '判断一个 ED1 项目，应该先看什么？',
      answer:
        '先看土地条件和政策适用性：地块的 zoning 和规划条件、是否符合 100% affordable housing 要求、是否涉及租户保护、历史资源、环境或高火险等限制，以及地块形状、临街条件、公用事业、消防和交通是否支持开发。并不是所有土地都适合 ED1，也不是所有 ED1 项目都有合理经济性。'
    },
    {
      question: 'ED1 项目的融资和建设成本有什么风险？',
      answer:
        '政策支持不等于银行自动贷款，贷款机构仍会看预算、开发商经验、资金来源、担保能力、收入假设和退出路径，项目可能还需要补贴或税收优惠等其他资金来源。ED1 可能压缩审批时间，但不能压缩建设成本，人工、材料、保险、结构类型和各类软成本都直接影响项目经济性。'
    },
    {
      question: '100% 经济适用房项目建成后还要注意什么？',
      answer:
        '这类项目也是长期运营和合规管理项目，需要考虑租金和收入限制对 NOI 的影响、租户资格审核、物业管理和维修储备、长期 compliance 要求，以及未来出售或再融资时买家如何评估这类受限资产。退出路径应在项目开始时就设计，而不是只写在模型最后一行。'
    }
  ],
  sourceList: [
    {
      name: 'Office of Mayor Karen Bass：Executive Directives（行政指令列表，含 ED 1 及各修订版）',
      url: 'https://mayor.lacity.gov/ExecutiveDirectives',
      accessedAt: '2026-11-05'
    },
    {
      name: 'Office of Mayor Karen Bass：Mayor Bass signs Executive Directive to dramatically accelerate and lower the cost of affordable housing and temporary housing',
      url: 'https://mayor.lacity.gov/news/mayor-bass-signs-executive-directive-dramatically-accelerate-and-lower-cost-affordable-housing',
      accessedAt: '2026-11-05'
    },
    {
      name: 'Los Angeles Housing Department (LAHD)：New ED 1 Guidelines for Affordable Housing Streamlining',
      url: 'https://housing.lacity.gov/highlights/new-ed-1-guidelines-for-affordable-housing-streamlining',
      accessedAt: '2026-11-05'
    },
    {
      name: 'Los Angeles City Planning：ED 1 FAQ Sheet（PDF）',
      url: 'https://planning.lacity.gov/odocument/8db5f950-7948-481d-8f3d-e397d2dad2b6/ED_1_-_FAQ_Sheet_AD.pdf',
      accessedAt: '2026-11-05'
    },
    {
      name: 'Los Angeles Department of Building and Safety (LADBS)',
      url: 'https://dbs.lacity.gov/',
      accessedAt: '2026-11-05'
    }
  ],
  en: {
    title: 'What does Los Angeles ED1 change for 100% affordable housing development?',
    directAnswer:
      'ED1 (Executive Directive No. 1, issued by Los Angeles Mayor Karen Bass) gives qualifying 100% affordable housing projects a faster approval path, but it changes the approval path, not whether a project succeeds. Faster review is not the same as no review: projects still have to meet design, building, fire, utility and tenant-protection requirements, and still face real financing, construction-cost, operating and exit tests. The first step in evaluating an ED1 project is checking whether the site and the policy genuinely apply, not projecting returns. ED1 rules and implementation may change, so the City of Los Angeles’ latest official guidance should govern.',
    faq: [
      {
        question: 'What is ED1?',
        answer:
          'ED1 is Executive Directive No. 1 issued by Los Angeles Mayor Karen Bass to expedite permits and clearances for temporary shelters and qualifying 100% affordable housing projects. It has been revised several times and city departments have issued implementation guidelines; eligibility should be confirmed on the official pages of the Mayor’s Office, LA City Planning and LAHD.'
      },
      {
        question: 'Does using the ED1 path mean automatic approval?',
        answer:
          'No. ED1 may shorten parts of the approval timeline and reduce some discretionary-review uncertainty, but a project still has to complete plan check, respond to corrections, pull permits and obtain department clearances, and open items with LADBS, LAFD or LADWP can still hold it up. Faster approvals reduce some timing and procedural uncertainty; they do not replace technical review or construction readiness.'
      },
      {
        question: 'What should be checked first on an ED1 project?',
        answer:
          'Site conditions and policy eligibility: zoning and planning constraints, whether the project meets the 100% affordable requirement, any tenant-protection, historic-resource, environmental or high-fire-hazard limits, and whether lot shape, frontage, utilities, fire access and traffic support development. Not every site suits ED1, and not every ED1 project pencils out.'
      },
      {
        question: 'What are the financing and construction-cost risks?',
        answer:
          'Policy support does not mean a lender will automatically fund the project; lenders still review the budget, sponsor experience, sources of funds, guarantees, income assumptions and exit path, and additional subsidies or tax incentives may be needed. ED1 may compress approval time, but it does not compress construction costs—labor, materials, insurance, construction type and soft costs all drive feasibility.'
      },
      {
        question: 'What matters after a 100% affordable project is built?',
        answer:
          'These are long-term operating and compliance assets: rent and income restrictions shape NOI, and owners must handle tenant eligibility, property management, maintenance reserves and ongoing compliance, plus how future buyers or lenders will value a restricted asset. The exit path should be designed at the start, not left to the last line of the model.'
      }
    ]
  }
};

export default data;
