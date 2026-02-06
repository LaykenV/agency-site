import Image from "next/image";

export default function FBCoverPage() {
  return (
    <div
      style={{
        width: 1640,
        height: 624,
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(135deg, hsl(215 85% 30%) 0%, hsl(215 85% 45%) 30%, hsl(215 85% 55%) 60%, hsl(215 70% 62%) 100%)",
        fontFamily:
          "var(--font-display), var(--font-geist-sans), system-ui, sans-serif",
      }}
    >
      {/* Subtle radial overlay for depth */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 1200px 800px at 30% 50%, hsla(215, 85%, 65%, 0.25) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Left content column */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "50%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingLeft: 290,
          paddingRight: 20,
          paddingTop: 48,
          paddingBottom: 48,
          zIndex: 2,
        }}
      >
        {/* Logo + Brand Name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <Image
            src="/logo.png"
            alt="Acadiana Web Design"
            width={48}
            height={48}
            style={{ borderRadius: 8 }}
          />
          <span
            style={{
              color: "white",
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            Acadiana Web Design
          </span>
        </div>

        {/* Main Headline */}
        <h1
          style={{
            color: "white",
            fontSize: 44,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            margin: 0,
            marginBottom: 10,
            maxWidth: 440,
          }}
        >
          Professional Websites for Local Businesses
        </h1>

        {/* Subline */}
        <p
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: 18,
            fontWeight: 500,
            margin: 0,
            marginBottom: 24,
            letterSpacing: "-0.01em",
          }}
        >
          Live in 72 Hours · Managed For You
        </p>

        {/* Pills */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {["Vet Owned", "Serving Acadiana", "$199/mo, $0 Upfront"].map(
            (label) => (
              <span
                key={label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "7px 14px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  backdropFilter: "blur(8px)",
                }}
              >
                {label}
              </span>
            )
          )}
        </div>
      </div>

      {/* Right side — screenshot cards (landscape desktop screenshots) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "50%",
          height: "100%",
          zIndex: 1,
        }}
      >
        {/* TB Tree Service — top-left of right section */}
        <div
          style={{
            position: "absolute",
            top: 20,
            left: -50,
            width: 480,
            height: 255,
            transform: "rotate(-2deg)",
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: "0 25px 70px rgba(0,0,0,0.4)",
            border: "3px solid rgba(255,255,255,0.25)",
            zIndex: 2,
          }}
        >
          <Image
            src="/client-tb-tree.png"
            alt="TB Tree Service"
            fill
            style={{ objectFit: "cover", objectPosition: "top center" }}
          />
        </div>

        {/* All About Towing — bottom-right, cascaded below */}
        <div
          style={{
            position: "absolute",
            top: 290,
            left: 60,
            width: 480,
            height: 255,
            transform: "rotate(2deg)",
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            border: "3px solid rgba(255,255,255,0.2)",
            zIndex: 1,
          }}
        >
          <Image
            src="/client-all-about-towin.png"
            alt="All About Towing"
            fill
            style={{ objectFit: "cover", objectPosition: "top center" }}
          />
        </div>
      </div>
    </div>
  );
}
