import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#1736f5",
          color: "#f4ff8c",
          display: "flex",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: 112,
          fontWeight: 900,
          height: "100%",
          justifyContent: "center",
          letterSpacing: "-0.08em",
          width: "100%",
        }}
      >
        U
      </div>
    ),
    size,
  );
}
