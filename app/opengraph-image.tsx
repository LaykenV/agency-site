import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Acadiana Web Design | Lafayette, Louisiana | $0 Down Websites";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0f0f12, #1b1f2a)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          color: "white",
          padding: "60px",
        }}
      >
        <div style={{ 
          fontSize: 72, 
          fontWeight: "bold", 
          marginBottom: 12,
          textAlign: "center"
        }}>
          Acadiana Web Design
        </div>
        <div style={{ 
          fontSize: 32, 
          color: "#94a3b8",
          marginBottom: 20,
          textAlign: "center"
        }}>
          Lafayette, Louisiana
        </div>
        <div style={{ 
          fontSize: 28, 
          color: "#cbd5e1",
          marginBottom: 40,
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          ⭐⭐⭐⭐⭐ <span style={{ marginLeft: "12px" }}>5.0 Rating</span>
        </div>
        <div style={{ 
          fontSize: 36, 
          color: "#e2e8f0",
          fontWeight: "600"
        }}>
          $0 Down • $199/mo • 72-Hour Launch
        </div>
      </div>
    ),
    { ...size }
  );
}
