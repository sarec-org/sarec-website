/**
 * AI 海报：活动类型 × 风格 → 画图指令（东哥 11/10）。
 * 每个风格一段预设指令模板：电影海报构图、中下部留出放字的暗区、画面里不出现任何文字；
 * 红线写死在 SAFETY 里：不画真人 / 名人 / 可识别人脸，不出现品牌商标、车标、可识别车型。
 * 主讲人照片只用后台上传的真实照片合成（见 compose），不让 AI 画。
 * 文字版式参考设计稿「大片款 56–63」「AI 未来款 64–71」，片名字效对应 TitleFx。
 */

export const EVENT_TYPES = [
  { key: 'lecture', label: '讲座', motif: 'a single dramatic symbolic object or landscape that suggests ideas and insight' },
  { key: 'summit', label: '论坛峰会', motif: 'a grand modern auditorium stage with sweeping light beams and an empty podium' },
  { key: 'golf', label: '高尔夫球赛', motif: 'a golf course hilltop with a flagstick, a tiny distant silhouetted golfer mid-swing and the arc of a ball' },
  { key: 'guandan', label: '掼蛋牌局', motif: 'four playing cards face down on a green felt table under a single overhead spotlight, poker chips' },
  { key: 'estate', label: '房地产', motif: 'a modern skyscraper rising above the clouds over a city' },
  { key: 'tax', label: '会计税务', motif: 'a giant stone percent sign monument and calculator-like geometric shapes' },
  { key: 'law', label: '法律', motif: 'the silhouette of scales of justice and a gavel' },
  { key: 'insurance', label: '保险', motif: 'a small warmly lit house sheltered under a large golden umbrella' },
  { key: 'design', label: '设计师聚会', motif: 'bold overlapping geometric color blocks and architectural forms' },
  { key: 'gala', label: '年会晚宴', motif: 'an elegant banquet hall with chandeliers, champagne glasses and golden bokeh' },
  { key: 'tour', label: '考察团', motif: 'a long road leading toward a distant skyline, an open map and a compass' },
  { key: 'cocktail', label: '酒会', motif: 'cocktail glasses on a rooftop bar at dusk with city lights' },
  { key: 'other', label: '其它', motif: 'an evocative symbolic scene' }
] as const;
export type EventTypeKey = (typeof EVENT_TYPES)[number]['key'];

/** 片名字效：对应设计稿 mt-gold / mt-steel / mt-fire / mt-cyan / mt-green / mt-pink / mt-holo / mt-ink */
export type TitleFx = 'gold' | 'steel' | 'fire' | 'cyan' | 'green' | 'pink' | 'holo' | 'ink';

export type PosterStyle = {
  key: string;
  group: 'film' | 'ai' | 'photo' | 'guofeng';
  label: string;
  scene: string; // 画面气质（英文，给画图模型）
  fx: TitleFx;
  light?: boolean; // 浅底款（字用深色）
  en: string; // 片名上方英文小字
  serif?: boolean; // 片名用宋体（否则黑体）
  brush?: boolean; // 片名用毛笔字（赌神片、国风）
};

export const STYLE_GROUPS = [
  { key: 'film', label: '好莱坞大片' },
  { key: 'ai', label: 'AI 未来感' },
  { key: 'photo', label: '写实摄影' },
  { key: 'guofeng', label: '国风' }
] as const;

export const STYLES: PosterStyle[] = [
  // 好莱坞大片（设计稿 56–63）
  { key: 'road', group: 'film', label: '公路片', fx: 'fire', serif: true, en: 'A SAREC PRESENTATION', scene: 'epic road movie key art, an endless empty highway vanishing into a blazing sunset, teal and orange color grade, anamorphic lens flare, vast sky' },
  { key: 'sports', group: 'film', label: '体育片', fx: 'gold', en: 'A SAREC PRESENTATION', scene: 'sports drama key art, a huge setting sun behind a hillside, heroic low angle, warm golden backlight, dust in the air' },
  { key: 'gambler', group: 'film', label: '赌神片', fx: 'gold', brush: true, en: 'A SAREC PRESENTATION', scene: '1990s Hong Kong casino film key art, pitch black background, a single hard top light, gold and deep red accents, smoky atmosphere' },
  { key: 'epic', group: 'film', label: '史诗片', fx: 'gold', serif: true, en: 'A SAREC PRESENTATION', scene: 'epic blockbuster key art, monumental scale, god rays piercing dark clouds, the surrounding world sinking into shadow' },
  { key: 'disaster', group: 'film', label: '灾难片', fx: 'steel', en: 'A SAREC PRESENTATION', scene: 'disaster movie key art, towering storm clouds, lightning strikes, cold steel blue grade, sense of impending crisis' },
  { key: 'mystery', group: 'film', label: '悬疑片', fx: 'gold', serif: true, en: 'A SAREC PRESENTATION', scene: 'neo-noir mystery thriller key art, slanted light through venetian blinds, black and gold palette, deep shadows' },
  { key: 'warm', group: 'film', label: '温情片', fx: 'gold', serif: true, en: 'A SAREC PRESENTATION', scene: 'heartwarming drama key art, soft rain at blue hour, warm glowing windows, gentle golden light against cool surroundings' },
  { key: 'art', group: 'film', label: '艺术片', fx: 'holo', en: 'A SAREC PRESENTATION', scene: 'independent art house film poster art, bold overlapping red yellow blue geometric color fields, one neon diagonal line, risograph texture' },
  // AI 未来感（设计稿 64–71）
  { key: 'neural', group: 'ai', label: '神经网络', fx: 'cyan', en: 'NEURAL ESTATE', scene: 'futuristic sci-fi key art, a vast glowing neural network of nodes and light filaments floating in deep navy space, cyan and violet glow' },
  { key: 'holocity', group: 'ai', label: '全息城市', fx: 'cyan', en: 'HOLOGRAPHIC CITY', scene: 'sci-fi key art, a cyan wireframe holographic city rising from a glowing disc, scan lines, dark background' },
  { key: 'chip', group: 'ai', label: '芯片电路', fx: 'green', en: 'SILICON ESTATE', scene: 'sci-fi key art, neon green circuit traces radiating from a central microchip with a tiny glowing house on it, black background, macro photography' },
  { key: 'datagate', group: 'ai', label: '数据之门', fx: 'cyan', en: 'THE DATA GATE', scene: 'sci-fi key art, cascading streams of falling light data around a tall glowing doorway, a tiny faceless silhouette standing far away in front of it' },
  { key: 'orb', group: 'ai', label: '光球', fx: 'holo', en: 'THE ASSISTANT', scene: 'sci-fi key art, a luminous orb encircled by light rings floating in a purple-blue starfield, iridescent glow' },
  { key: 'chrome', group: 'ai', label: '液态金属', fx: 'ink', light: true, en: 'LIQUID FUTURE', scene: 'Y2K futurism key art, a flowing ribbon of liquid chrome metal on a pale pearl background, soft studio lighting, iridescent reflections' },
  { key: 'globe', group: 'ai', label: '数字地球', fx: 'gold', en: 'PACIFIC LINK', scene: 'sci-fi key art, a wireframe digital earth seen from space with two glowing golden flight arcs connecting the west coast of America and East Asia' },
  { key: 'portal', group: 'ai', label: '时空之门', fx: 'pink', en: 'THE PORTAL', scene: 'synthwave sci-fi key art, a glowing circular portal standing on a neon grid horizon, magenta and cyan glow, starry sky' },
  // 写实摄影 / 国风
  { key: 'photo', group: 'photo', label: '写实摄影', fx: 'steel', en: 'A SAREC PRESENTATION', scene: 'award-winning editorial photograph, natural light, shallow depth of field, cinematic color grade, shot on medium format' },
  { key: 'guofeng', group: 'guofeng', label: '国风', fx: 'gold', brush: true, en: 'A SAREC PRESENTATION', scene: 'contemporary Chinese ink-wash painting style key art, misty layered mountains, gold leaf accents, xuan paper texture, elegant negative space' }
];

export const styleOf = (k: string | null | undefined): PosterStyle => STYLES.find((s) => s.key === k) ?? STYLES[0];
export const typeOf = (k: string | null | undefined) => EVENT_TYPES.find((t) => t.key === k) ?? EVENT_TYPES[EVENT_TYPES.length - 1];

/** 红线（每条指令都带）：不出现文字、真人人脸、品牌 / 车标 / 可识别车型 */
export const SAFETY =
  'Absolutely no text, no letters, no words, no numbers, no logos, no watermarks, no signage anywhere in the image. ' +
  'No real people, no celebrities, no recognizable faces; any human figure must be a tiny distant faceless silhouette. ' +
  'No brand names, no trademarks, no car badges, no recognizable car models; any vehicle must be a generic unbranded concept design.';

/** 构图：电影海报竖构图，主体在上中部，中下部留出放字的暗区 */
export const COMPOSITION =
  'Vertical 2:3 cinematic movie poster key art composition, the main subject placed in the upper and middle part of the frame, ' +
  'the lower 40 percent of the image fades into a dark, calm, uncluttered area reserved for title text, dramatic lighting, high detail, photorealistic rendering, 8k.';
const LIGHT_COMPOSITION = COMPOSITION.replace('fades into a dark, calm', 'fades into a light, soft, calm');

/** 品牌 / 车型词替换成通用说法（画面主题里如果有人写了 Tesla、Cybercab 之类） */
const BRANDS: [RegExp, string][] = [
  [/\b(tesla|cybercab|cybertruck|robovan|model\s?[3sxy]|waymo|zoox|cruise|uber|lyft|bmw|mercedes|benz|audi|porsche|ferrari|lamborghini|toyota|honda|nissan|ford|chevrolet|chevy|byd|nio|xpeng|apple|google|nvidia|openai|microsoft|amazon)\b/gi, 'generic'],
  [/特斯拉|赛博|蔚来|小鹏|比亚迪|理想汽车|奔驰|宝马|奥迪|保时捷|法拉利|兰博基尼|丰田|本田|福特|谷歌|苹果|英伟达/g, '']
];
export function scrubBrands(s: string): string {
  let out = s;
  for (const [re, to] of BRANDS) out = out.replace(re, to);
  return out.replace(/\s{2,}/g, ' ').trim();
}

/**
 * 拼指令：风格画面 + 主题（后台可填英文/中文“画面主题”，不填用活动类型的默认意象）+ 构图 + 红线。
 * 不把活动标题原文塞进指令（中文标题会诱导模型在画面里写字，也可能带品牌名）。
 */
export function buildPrompt(opts: { type: string; style: string; subject?: string | null }): string {
  const st = styleOf(opts.style);
  const ty = typeOf(opts.type);
  const subject = scrubBrands((opts.subject ?? '').slice(0, 300)) || ty.motif;
  return [`${st.scene}.`, `Subject: ${subject}.`, st.light ? LIGHT_COMPOSITION : COMPOSITION, SAFETY].join(' ');
}
