type IconProps = {
  className?: string;
  size?: number;
};

/** Advisory 咨询撮合 — document (rectangle with content lines) +
 *  magnifying lens on the bottom-right corner. */
export function AdvisoryIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Document */}
      <rect x="6" y="4" width="16" height="20" />
      {/* Content lines */}
      <line x1="9" y1="10" x2="19" y2="10" />
      <line x1="9" y1="14" x2="19" y2="14" />
      <line x1="9" y1="18" x2="15" y2="18" />
      {/* Magnifying lens (circle) overlapping bottom-right of doc */}
      <circle cx="22" cy="22" r="4" />
      {/* Lens handle */}
      <line x1="25" y1="25" x2="28" y2="28" />
    </svg>
  );
}
