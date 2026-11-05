import type { Metadata } from 'next';
import { WebAlbum } from '@/components/home/WebAlbum';

export const metadata: Metadata = { title: '活动相册｜SAREC 中美房地产商会' };
export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: { slug: string } }) {
  return <WebAlbum slug={decodeURIComponent(params.slug)} />;
}
