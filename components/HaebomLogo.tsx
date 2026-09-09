export function HaebomLogo({ size = 36, withWordmark = true }: { size?: number; withWordmark?: boolean }) {
  return (
    <span className="logo-lockup" aria-label="해봄 HAEBOM">
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
      >
        <title>해봄</title>
        <rect width="64" height="64" rx="16" fill="url(#hb_bg)" />
        {/* seed → sprout / two points connecting into insight */}
        <circle cx="22" cy="38" r="5" fill="#FFF7E8" />
        <circle cx="42" cy="26" r="5" fill="#FFE08A" />
        <path
          d="M26 36C30 28 36 24 42 26"
          stroke="#FFF7E8"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M42 26C44 18 48 14 52 12"
          stroke="#C8F5C0"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M42 26C46 22 50 22 54 20"
          stroke="#C8F5C0"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="hb_bg" x1="8" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1F6B4A" />
            <stop offset="1" stopColor="#0E3D2C" />
          </linearGradient>
        </defs>
      </svg>
      {withWordmark ? (
        <span className="logo-text">
          <span className="logo-ko">해봄</span>
          <span className="logo-en">HAEBOM</span>
        </span>
      ) : null}
    </span>
  );
}
