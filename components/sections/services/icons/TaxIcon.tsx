type IconProps = {
  className?: string;
  size?: number;
};

/** Tax 税务 — document with a top-right folded corner + a "%" mark
 *  (two small circles + diagonal slash) inside. */
export function TaxIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="miter"
      className={className}
      aria-hidden="true"
    >
      {/* Document outline with folded top-right corner */}
      <path d="M 6 4 L 19 4 L 23 8 L 23 28 L 6 28 Z" />
      {/* Fold detail */}
      <polyline points="19,4 19,8 23,8" />
      {/* "%" mark — top-left small circle */}
      <circle cx="12" cy="14" r="1.6" />
      {/* "%" mark — bottom-right small circle */}
      <circle cx="18" cy="22" r="1.6" />
      {/* Diagonal slash */}
      <line x1="10" y1="22" x2="20" y2="14" />
    </svg>
  );
}
