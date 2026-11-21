/**
 * D16（指令 7）：测试站手机验证走得通。
 * 只在 Vercel 测试站（VERCEL_ENV === 'preview'）生效：手机验证不真发短信，验证码固定为 246810（任何号码都认）。
 * 正式站（production）、本地开发一律不生效，正式站代码路径不变。服务器只看 VERCEL_ENV，不看前端传参。
 */
export const TEST_FIXED_CODE = '246810';
export const TEST_FIXED_CODE_TEXT = `测试站：只认测试号码（例如 949-555-0199），验证码固定为 ${TEST_FIXED_CODE}`;

export function testFixedCodeOn(): boolean {
  return process.env.VERCEL_ENV === 'preview';
}


/** 指令 9 · D22：名单外号码的提示（判断逻辑在 testPhones.ts，只在服务器用） */
export const TEST_PHONE_ONLY_TEXT = '测试站只认测试号码（例如 949-555-0199），这个号码在测试站发不出验证码';
