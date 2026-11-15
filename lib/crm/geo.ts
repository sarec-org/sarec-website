/**
 * 地址 → 经纬度（1.3.5 第 6 条：「导航」用微信自带地图打开，服务器按地址存一次经纬度）。
 * - 用美国人口普查局的免费地理编码（geocoding.geo.census.gov，不要密钥、不收费），只认美国地址。
 * - 结果按地址的 sha256 存进 Blob（{prod|test}/geo/<sha>.json），同一个地址只查一次；查不到也存，免得反复查。
 * - 任何失败都返回 null：小程序拿不到坐标时「导航」退回复制地址，不报错。
 */
import { createHash } from 'node:crypto';

export type Geo = { lat: number; lng: number };
const PREFIX = () => `${process.env.VERCEL_ENV === 'production' ? 'prod' : 'test'}/geo`;
const mem = new Map<string, Geo | null>();

function key(address: string) {
  return createHash('sha256').update(address.trim().toLowerCase().replace(/\s+/g, ' ')).digest('hex').slice(0, 40);
}

async function readStored(k: string): Promise<{ hit: boolean; geo: Geo | null }> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { hit: false, geo: null };
  try {
    const { head } = await import('@vercel/blob');
    const h = await head(`${PREFIX()}/${k}.json`);
    const res = await fetch(h.url, { cache: 'no-store' });
    if (!res.ok) return { hit: false, geo: null };
    const j = (await res.json()) as { geo: Geo | null };
    return { hit: true, geo: j.geo ?? null };
  } catch {
    return { hit: false, geo: null };
  }
}

async function store(k: string, geo: Geo | null) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    const { put } = await import('@vercel/blob');
    await put(`${PREFIX()}/${k}.json`, JSON.stringify({ geo, at: new Date().toISOString() }), { access: 'public', contentType: 'application/json', addRandomSuffix: false });
  } catch (e) {
    console.log('[geo] store failed', (e as Error).message);
  }
}

async function census(address: string): Promise<Geo | null> {
  const u = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 4000);
  try {
    const res = await fetch(u, { signal: ctl.signal, cache: 'no-store' });
    if (!res.ok) return null;
    const j = (await res.json()) as { result?: { addressMatches?: { coordinates?: { x: number; y: number } }[] } };
    const c = j.result?.addressMatches?.[0]?.coordinates;
    return c && Number.isFinite(c.x) && Number.isFinite(c.y) ? { lat: c.y, lng: c.x } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** 查地址的经纬度；查不到 / 出错返回 null */
export async function geocode(address: string | null | undefined): Promise<Geo | null> {
  const a = (address ?? '').trim();
  if (a.length < 6) return null;
  const k = key(a);
  if (mem.has(k)) return mem.get(k) ?? null;
  const s = await readStored(k);
  if (s.hit) {
    mem.set(k, s.geo);
    return s.geo;
  }
  const g = await census(a);
  mem.set(k, g);
  await store(k, g);
  return g;
}
