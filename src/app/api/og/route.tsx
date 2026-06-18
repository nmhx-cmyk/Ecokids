import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

// Brand palette — match design tokens.
const CREAM_50 = "#FFF8F2";
const CORAL_500 = "#FF6B5A";
const INK_900 = "#1F1A17";
const INK_500 = "#6B6660";

// TODO: upgrade to bundled Be Vietnam Pro font for crisper Vietnamese rendering.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title")?.slice(0, 120) || "Ecokids";
  const subtitle = searchParams.get("subtitle")?.slice(0, 160) || undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: CREAM_50,
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: CORAL_500,
            letterSpacing: "-0.02em",
          }}
        >
          Ecokids
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              color: INK_900,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                marginTop: 24,
                fontSize: 36,
                color: INK_500,
                lineHeight: 1.3,
                maxWidth: 1000,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        <div
          style={{
            fontSize: 24,
            color: INK_500,
          }}
        >
          Thời trang trẻ em an toàn, chất lượng
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "cache-control": "public, max-age=3600, s-maxage=3600",
      },
    },
  );
}
