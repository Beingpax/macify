import { ImageResponse } from "next/og";
import { themeColors } from "@/lib/shared/theme-colors";

export const BLOG_OG_SIZE = { width: 1200, height: 630 } as const;

type BlogOgCardProps = {
  title: string;
  titleLineTwo?: string;
};

const caprasimoFont = fetch("https://fonts.gstatic.com/s/caprasimo/v6/esDT31JQOPuXIUGBp72klQ.ttf").then((response) => response.arrayBuffer());
const urbanistFont = fetch("https://fonts.gstatic.com/s/urbanist/v18/L0xjDF02iFML4hGCyOCpRdycFsGxSrqDLBkfFg.ttf").then((response) => response.arrayBuffer());

function BlogOgArtwork({ title, titleLineTwo = "for Mac" }: BlogOgCardProps) {
  const ink = themeColors.offerInk;

  return (
    <div style={{ background: themeColors.offerSurface, color: ink, display: "flex", fontFamily: "Urbanist", height: "100%", padding: 26, width: "100%" }}>
      <div style={{ background: themeColors.offerSurface, borderRadius: 16, display: "flex", height: "100%", overflow: "hidden", position: "relative", width: "100%" }}>
        <div style={{ color: ink, display: "flex", flexDirection: "column", fontFamily: "Caprasimo", fontSize: 90, fontWeight: 400, left: 70, letterSpacing: "-0.025em", lineHeight: 0.94, position: "absolute", right: 70, textAlign: "center", top: 170 }}>
          <div style={{ display: "flex", justifyContent: "center" }}>{title}</div>
          <div style={{ display: "flex", justifyContent: "center" }}>{titleLineTwo}</div>
        </div>

        <div style={{ alignItems: "center", bottom: 38, color: ink, display: "flex", fontSize: 27, fontWeight: 700, justifyContent: "space-between", left: 52, position: "absolute", right: 52 }}>
          <div style={{ alignItems: "center", display: "flex", gap: 11 }}>
            <svg height="32" viewBox="0 0 64 64" width="32">
              <rect fill={themeColors.ink} height="64" rx="17" width="64" />
              <path d="M16 44V20h7l9 13 9-13h7v24h-7V30l-9 12-9-12v14z" fill={themeColors.white} transform="translate(32 32) scale(1.35) translate(-32 -32)" />
            </svg>
            <div style={{ display: "flex" }}>macify.app</div>
          </div>

          <div style={{ alignItems: "center", display: "flex", gap: 13 }}>
            <svg height="28" viewBox="0 0 20 24" width="22">
              <path d="M3 2.5h14v19l-7-4.3L3 21.5z" fill={ink} stroke={ink} strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <div style={{ display: "flex" }}>Save for later</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function createBlogOgImage(props: BlogOgCardProps) {
  const [caprasimo, urbanist] = await Promise.all([caprasimoFont, urbanistFont]);

  return new ImageResponse(<BlogOgArtwork {...props} />, {
    ...BLOG_OG_SIZE,
    fonts: [
      { data: caprasimo, name: "Caprasimo", style: "normal", weight: 400 },
      { data: urbanist, name: "Urbanist", style: "normal", weight: 700 },
    ],
  });
}
