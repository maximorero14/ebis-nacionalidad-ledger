type NationalEmblemProps = {
  className?: string;
};

export function NationalEmblem({ className }: NationalEmblemProps) {
  return (
    <svg
      viewBox="0 0 40 46"
      className={className}
      aria-hidden="true"
      focusable="false"
      role="presentation"
    >
      <path
        d="M8 14 L11 5.5 L15.5 11.5 L20 3.5 L24.5 11.5 L29 5.5 L32 14 L32 17.4 L8 17.4 Z"
        fill="currentColor"
        opacity="0.94"
      />
      <circle cx="11" cy="5.5" r="1.5" fill="currentColor" />
      <circle cx="20" cy="3.5" r="1.7" fill="currentColor" />
      <circle cx="29" cy="5.5" r="1.5" fill="currentColor" />
      <rect x="9" y="17.4" width="22" height="2.2" rx="1" fill="currentColor" />
      <path
        d="M10.5 21.4 H29.5 V29.6 C29.5 36.6 24.3 41.4 20 43.4 C15.7 41.4 10.5 36.6 10.5 29.6 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M20 21.8 V43 M10.7 29.9 H29.3"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.55"
      />
      <circle cx="15" cy="25.6" r="1.3" fill="currentColor" opacity="0.85" />
      <circle cx="25" cy="25.6" r="1.3" fill="currentColor" opacity="0.85" />
      <path d="M17.2 33.6 L20 30.4 L22.8 33.6 L20 37.4 Z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}
