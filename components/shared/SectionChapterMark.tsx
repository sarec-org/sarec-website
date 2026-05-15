import styles from './SectionChapterMark.module.css';

/**
 * SectionChapterMark — mono numeric tag + accent rule, used to mark
 * the start of a magazine-style section ("01", "02" …).
 */
export type SectionChapterMarkProps = {
  number: string;
  className?: string;
};

export function SectionChapterMark({
  number,
  className,
}: SectionChapterMarkProps) {
  const mergedClassName = [styles.chapterMark, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={mergedClassName}>
      <span className={styles.number}>{number}</span>
      <span className={styles.line} aria-hidden="true" />
    </div>
  );
}
