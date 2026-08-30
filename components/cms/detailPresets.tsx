/**
 * CMS V2 详情页共用预设 —— 让三套详情页的正文与图片规格保持同一份定义。
 * ⚠️ 全部指向 detail.module.css(逐字复制自 rosewood.module.css / projects.module.css)的既有类,
 *    不含任何自创样式。
 */
import { SaImage } from '@/components/shared/SaImage';
import type { CmsMarkdownClasses } from './CmsMarkdown';
import type { GalleryImage } from '@/lib/cms/types';
import styles from './detail.module.css';

/** 正文规格 = 案例页 R03 的 .ed1Body / .ed1BlockH3 / .roleBulletList */
export const PROSE_CLASSES: CmsMarkdownClasses = {
  paragraph: styles.ed1Body,
  heading: styles.ed1BlockH3,
  list: styles.roleBulletList
};

/** 图集图片 = 项目页 P02 卡片的 .typeImage 规格 */
export function GALLERY_IMAGE(g: GalleryImage) {
  return (
    <SaImage
      src={g.image}
      alt={g.alt}
      fill
      sizes="(max-width: 1024px) 100vw, 33vw"
      filterIntensity="none"
      className={styles.typeImage}
    />
  );
}
