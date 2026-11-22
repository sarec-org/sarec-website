/** 指令 9 · D22（只在服务器用）：测试站固定验证码的号码名单 */
import { getPool } from '@/lib/db/client';
import { getSetting } from './orders';
import { CrmError } from './events';
import { TEST_PHONE_ONLY_TEXT, testFixedCodeOn } from './testFixedCode';

/**
 * 指令 9 · D22：固定验证码只对名单里的号码生效（只在测试站；正式站没有这段逻辑）。
 * 名单：① 北美保留给虚构用途的 555-0100～555-0199（任何区号，+1 xxx 555 01xx）；
 *       ② 测试库 crm_settings 里的 test_fixed_code_phones（数组，可放东哥给的号码，默认空）。
 * 名单外的号码在测试站一律发不出码、登不了：code 'test_phone_only'，message 下面这句。
 */
export function isFictionalTestPhone(e164: string): boolean {
  return /^\+1\d{3}55501\d{2}$/.test(e164.replace(/[^\d+]/g, ''));
}

export async function testPhoneAllowed(e164: string): Promise<boolean> {
  if (isFictionalTestPhone(e164)) return true;
  const list = await getSetting<unknown>(getPool(), 'test_fixed_code_phones', []);
  if (!Array.isArray(list)) return false;
  const digits = (x: string) => x.replace(/\D/g, '');
  const want = digits(e164);
  return list.some((x) => typeof x === 'string' && digits(x).length >= 10 && (digits(x) === want || `1${digits(x)}` === want));
}

/** 测试站：名单外的号码直接拦（发码、验证都拦）。不是测试站什么也不做。 */
export async function assertTestPhone(e164: string): Promise<void> {
  if (!testFixedCodeOn()) return;
  if (await testPhoneAllowed(e164)) return;
  throw new CrmError('test_phone_only', TEST_PHONE_ONLY_TEXT);
}
