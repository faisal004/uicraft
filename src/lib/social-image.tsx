import { ImageResponse } from "next/og";

type SocialImageProps = {
  title: string;
  description: string;
  category?: string;
};

export const socialImageSize = {
  width: 1200,
  height: 630,
};

export function createSocialImage({
  title,
  description,
  category = "Interaction study",
}: SocialImageProps) {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#1736f5",
          color: "#f4ff8c",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Arial, Helvetica, sans-serif",
          height: "100%",
          justifyContent: "space-between",
          overflow: "hidden",
          padding: "64px 72px",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(244,255,140,0.35) 1.5px, transparent 1.5px)",
            backgroundSize: "12px 12px",
            display: "flex",
            height: "100%",
            left: 0,
            maskImage: "linear-gradient(135deg, transparent 20%, black 100%)",
            opacity: 0.45,
            position: "absolute",
            top: 0,
            width: "100%",
          }}
        />

        <div
          style={{
            alignItems: "center",
            display: "flex",
            fontSize: 28,
            fontWeight: 700,
            justifyContent: "space-between",
            letterSpacing: "-0.02em",
            position: "relative",
          }}
        >
          <span>UIcraft</span>
          <span
            style={{
              border: "2px solid rgba(244,255,140,0.55)",
              borderRadius: 999,
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: "0.04em",
              padding: "10px 18px",
              textTransform: "uppercase",
            }}
          >
            {category}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: 920,
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: title.length > 30 ? 76 : 92,
              fontWeight: 800,
              letterSpacing: "-0.065em",
              lineHeight: 0.94,
            }}
          >
            {title}
          </div>
          <div
            style={{
              color: "rgba(244,255,140,0.78)",
              fontSize: 26,
              lineHeight: 1.35,
              marginTop: 30,
              maxWidth: 820,
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: 12,
            position: "relative",
          }}
        >
          {[0, 1, 2].map((item) => (
            <span
              key={item}
              style={{
                background: item === 2 ? "#181916" : "#f4ff8c",
                border: item === 2 ? "2px solid #f4ff8c" : "none",
                display: "flex",
                height: 14,
                transform: `translateY(${-item * 4}px)`,
                width: 14,
              }}
            />
          ))}
        </div>
      </div>
    ),
    socialImageSize,
  );
}
