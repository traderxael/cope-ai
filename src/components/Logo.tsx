interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}

export function Logo({
  size = 36,
  withWordmark = false,
  className,
}: LogoProps) {
  return (
    <span className={['brand', className].filter(Boolean).join(' ')}>
      <img
        className="brandMark"
        src="/logo.svg"
        width={size}
        height={size}
        alt=""
        draggable={false}
      />
      {withWordmark ? (
        <span className="brandName">
          Cope <span className="brandAi">AI</span>
        </span>
      ) : null}
    </span>
  );
}
