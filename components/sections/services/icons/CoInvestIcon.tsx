type IconProps = {
  className?: string;
  size?: number;
};

/** Co-Invest 共投 — 3 nodes forming a triangle (top center, bottom-left,
 *  bottom-right), connected by lines. Suggests an LLC equity structure. */
export function CoInvestIcon({ className, size = 32 }: IconProps) {
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
      {/* Three connecting lines (drawn first so nodes sit on top) */}
      <line x1="16" y1="6" x2="8" y2="24" />
      <line x1="16" y1="6" x2="24" y2="24" />
      <line x1="8" y1="24" x2="24" y2="24" />
      {/* Three nodes */}
      <circle cx="16" cy="6" r="2" />
      <circle cx="8" cy="24" r="2" />
      <circle cx="24" cy="24" r="2" />
    </svg>
  );
}
