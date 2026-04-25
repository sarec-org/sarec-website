import { serviceItems } from '@/lib/content';
import { ServiceCard } from '@/components/sections/ServiceCard';

type ServiceCardsProps = {
  items?: typeof serviceItems;
};

export function ServiceCards({ items = serviceItems }: ServiceCardsProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <ServiceCard key={item.href} {...item} />
      ))}
    </div>
  );
}
