type IconProps = {
  className?: string;
  size?: number;
};

/** Immigration 移民 — simplified globe (circle + equator + meridian) +
 *  a small arrow indicating cross-border movement out of the globe. */
export function ImmigrationIcon({ className, size = 32 }: IconProps) {
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
      {/* Globe */}
      <circle cx="14" cy="16" r="9" />
      {/* Equator */}
      <line x1="5" y1="16" x2="23" y2="16" />
      {/* Meridian (vertical ellipse) */}
      <ellipse cx="14" cy="16" rx="4" ry="9" />
      {/* Cross-border arrow shaft */}
      <line x1="20" y1="10" x2="28" y2="4" />
      {/* Arrow head (two short lines forming the tip) */}
      <line x1="28" y1="4" x2="24" y2="4" />
      <line x1="28" y1="4" x2="28" y2="8" />
    </svg>
  );
}
