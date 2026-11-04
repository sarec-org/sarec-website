/** Svix 签名校验（Resend webhook 使用）。 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifySvix(secret: string, id: string, ts: string, payload: string, sigHeader: string): boolean {
  const t = Number(ts);
  if (!id || !Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${ts}.${payload}`).digest();
  return sigHeader.split(' ').some((part) => {
    const [ver, sig] = part.split(',');
    if (ver !== 'v1' || !sig) return false;
    const got = Buffer.from(sig, 'base64');
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
