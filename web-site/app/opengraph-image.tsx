import { ImageResponse } from "next/og";

import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "56px",
          background:
            "linear-gradient(135deg, #eff6ff 0%, #dbeafe 32%, #e2e8f0 100%)",
          color: "#0f172a",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            borderRadius: "36px",
            padding: "48px",
            background:
              "radial-gradient(circle at top right, rgba(47,125,211,0.18), transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.96), rgba(241,245,249,0.96))",
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 24px 80px rgba(15,23,42,0.12)",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
              color: "#2f7dd3",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.03em",
            }}
          >
            <div
              style={{
                display: "flex",
                width: "64px",
                height: "64px",
                borderRadius: "18px",
                background: "rgba(47,125,211,0.12)",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(47,125,211,0.18)",
              }}
            >
              Q
            </div>
            <span>{APP_NAME}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div
              style={{
                display: "flex",
                maxWidth: "880px",
                fontSize: 68,
                lineHeight: 1.02,
                letterSpacing: "-0.05em",
                fontWeight: 800,
              }}
            >
              Build strategies. Backtest with confidence.
            </div>
            <div
              style={{
                display: "flex",
                maxWidth: "760px",
                fontSize: 28,
                lineHeight: 1.4,
                color: "#334155",
              }}
            >
              {APP_TAGLINE} One place for strategy building, testing, wallet
              flow, and plan upgrades.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "14px",
              alignItems: "center",
              fontSize: 22,
              color: "#475569",
            }}
          >
            <div
              style={{
                display: "flex",
                padding: "12px 18px",
                borderRadius: "999px",
                background: "#dbeafe",
                color: "#1d4ed8",
                fontWeight: 700,
              }}
            >
              Strategy Builder
            </div>
            <div
              style={{
                display: "flex",
                padding: "12px 18px",
                borderRadius: "999px",
                background: "#e2e8f0",
              }}
            >
              Backtesting App
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
