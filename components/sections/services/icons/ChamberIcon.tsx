type IconProps = {
  className?: string;
  size?: number;
};

/** Chamber 商会 — round table (center circle) + 6 member dots evenly
 *  distributed around it at 12 / 2 / 4 / 6 / 8 / 10 o'clock positions. */
export function ChamberIcon({ className, size = 32 }: IconProps) {
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
      {/* Center round table */}
      <circle cx="16" cy="16" r="6" />
      {/* 6 member dots at radius 12 */}
      <circle cx="16" cy="4" r="1.5" />
      <circle cx="26.4" cy="10" r="1.5" />
      <circle cx="26.4" cy="22" r="1.5" />
      <circle cx="16" cy="28" r="1.5" />
      <circle cx="5.6" cy="22" r="1.5" />
      <circle cx="5.6" cy="10" r="1.5" />
    </svg>
  );
}
