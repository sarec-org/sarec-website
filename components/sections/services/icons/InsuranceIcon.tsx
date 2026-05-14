type IconProps = {
  className?: string;
  size?: number;
};

/** Insurance 保险 — geometric shield outline: top horizontal edge,
 *  short vertical sides, angled tapers down to a point at the bottom. */
export function InsuranceIcon({ className, size = 32 }: IconProps) {
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
      {/* Shield: top → right side → right taper → bottom point → left taper → left side → close */}
      <path d="M 8 6 L 24 6 L 24 14 L 16 28 L 8 14 Z" />
    </svg>
  );
}
