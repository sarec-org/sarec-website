type IconProps = {
  className?: string;
  size?: number;
};

/** Legal 法律 — balance scales: vertical pole + horizontal beam +
 *  two short hanging strings ending in pan plates + a base. */
export function LegalIcon({ className, size = 32 }: IconProps) {
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
      {/* Vertical pole */}
      <line x1="16" y1="6" x2="16" y2="26" />
      {/* Horizontal beam */}
      <line x1="6" y1="8" x2="26" y2="8" />
      {/* Hanging strings */}
      <line x1="8" y1="8" x2="8" y2="14" />
      <line x1="24" y1="8" x2="24" y2="14" />
      {/* Pan plates (short horizontal lines) */}
      <line x1="5" y1="14" x2="11" y2="14" />
      <line x1="21" y1="14" x2="27" y2="14" />
      {/* Base */}
      <line x1="12" y1="26" x2="20" y2="26" />
    </svg>
  );
}
