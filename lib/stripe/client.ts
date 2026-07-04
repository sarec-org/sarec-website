/**
 * Stripe 客户端（服务端专用）。
 * ------------------------------------------------------------------
 * - 只从 process.env.STRIPE_SECRET_KEY 读取密钥，绝不写死。
 * - 懒加载：缺 key 时抛错，build / typecheck 不需要真实 key。
 * - 仅 server import；publishable key（NEXT_PUBLIC_*）才可进客户端。
 * - 不指定 apiVersion，使用账户默认版本（向前兼容）。
 */
import Stripe from 'stripe';

let stripe: Stripe | undefined;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  if (!stripe) {
    stripe = new Stripe(key);
  }
  return stripe;
}
