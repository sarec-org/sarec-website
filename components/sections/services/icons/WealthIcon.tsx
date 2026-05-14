type IconProps = {
  className?: string;
  size?: number;
};

/** Wealth 财富 — upward trend polyline (no axes, no bars, just an
 *  abstract long-term ascending zigzag) with an arrowhead at the top. */
export function WealthIcon({ className, size = 32 }: IconProps) {
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
      {/* Trend polyline */}
      <polyline points="4,24 12,18 20,22 28,8" />
      {/* Arrowhead at top-right (two short strokes meeting at a sharp tip) */}
      <polyline points="24,8 28,8 28,12" />
    </svg>
  );
}
