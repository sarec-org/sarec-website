import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type ServiceCardProps = {
  title: string;
  description: string;
  href: string;
};

export function ServiceCard({ title, description, href }: ServiceCardProps) {
  return (
    <Card className="flex min-h-52 flex-col justify-between md:min-h-56">
      <div>
        <h3 className="font-sans text-lg font-semibold leading-snug text-ink md:text-xl">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-muted md:mt-4 md:text-base">{description}</p>
      </div>
      <div className="mt-8">
        <Button href={href} variant="secondary">
          了解详情
        </Button>
      </div>
    </Card>
  );
}
