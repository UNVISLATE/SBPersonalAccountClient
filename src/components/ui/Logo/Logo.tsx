import React, { useState } from "react";

interface LogoProps {
  src?: string | null;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  size?: number;
}

const DEFAULT_LOGO = "/unvi/logo_1x1_128.webp";

export const Logo: React.FC<LogoProps> = ({
  src,
  alt = "Logo",
  className = "",
  style,
  size = 32,
}) => {
  const [hasError, setHasError] = useState(false);
  const effectiveSrc = !hasError && src ? src : DEFAULT_LOGO;

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        position: "relative",
        flexShrink: 0,
        ...style,
      }}
    >
      <img
        src={effectiveSrc}
        alt={alt}
        onError={() => setHasError(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />
    </div>
  );
};
