import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type SkeletonPageProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
};

export function SkeletonPage({ title, description, children }: SkeletonPageProps) {
  return (
    <div className="py-16 md:py-24">
      <div className="container-shell">
        <div className="max-w-3xl">
          <p className="font-sans text-sm font-semibold text-gold">第一批路由骨架</p>
          <h1 className="mt-4 font-sans text-4xl font-bold md:text-5xl">{title}</h1>
          {description ? <p className="mt-6 text-lg text-muted">{description}</p> : null}
        </div>
        <Card className="mt-10">
          {children ?? (
            <p className="text-muted">页面基础结构已建立。详细内容排版将在后续批次继续完善。</p>
          )}
          <div className="mt-8">
            <Button href="/zh/contact/" variant="secondary">
              预约咨询
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
