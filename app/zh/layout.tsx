import { site } from '@/lib/content';

export default function ZhLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'SAREC 中美房地产商会',
        alternateName: 'Sino-American Real Estate Chamber',
        url: 'https://sinoamericanrec.org',
        description:
          '跨境地产项目协作与资源整合平台，提供美国房地产项目判断、风险控制、结构设计、资源协同与合作推进服务。',
        email: site.email,
        telephone: site.phone
      },
      {
        '@type': 'WebSite',
        name: 'SAREC 中美房地产商会',
        alternateName: 'Sino-American Real Estate Chamber',
        url: 'https://sinoamericanrec.org'
      },
      {
        '@type': 'Service',
        name: 'SAREC 跨境地产服务',
        serviceType: '美国房地产项目判断、风险控制、结构设计、资源协同、项目合作、家庭资产配置咨询、房地产考察与培训',
        provider: {
          '@type': 'Organization',
          name: 'SAREC 中美房地产商会',
          url: 'https://sinoamericanrec.org'
        },
        areaServed: ['United States', 'China'],
        description:
          'SAREC 的核心价值不止于资源对接，而是围绕项目判断、结构设计、风险控制与落地协同，推动跨境合作更稳健地成立与推进。'
      }
    ]
  };

  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        type="application/ld+json"
      />
      {children}
    </>
  );
}
