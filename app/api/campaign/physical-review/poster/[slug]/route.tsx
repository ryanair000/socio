import { ImageResponse } from "next/og";
import { POSTERS, type Item } from "@/lib/physical-review-posters";

export const runtime = "edge";

function ProductCard({ item, compact = false }: { item: Item; compact?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", flex: 1, minWidth: 0, height: compact ? 480 : 560, padding: compact ? 22 : 28, border: "2px solid #e5e7eb", borderRadius: 30, background: "#fff", boxShadow: "0 18px 40px rgba(13,27,42,.08)" }}>
      <img src={item.image} alt="" width={compact ? 230 : 310} height={compact ? 230 : 310} style={{ objectFit: "contain", maxWidth: "100%" }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: "100%" }}>
        <div style={{ fontSize: compact ? 29 : 36, lineHeight: 1.05, fontWeight: 800, color: "#0d1b2a" }}>{item.name}</div>
        <div style={{ marginTop: 12, fontSize: compact ? 29 : 42, lineHeight: 1, fontWeight: 900, color: "#e6001e" }}>{item.price}</div>
        {item.tag ? <div style={{ marginTop: 13, fontSize: compact ? 20 : 25, color: "#4b5563" }}>{item.tag}</div> : null}
      </div>
    </div>
  );
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const poster = POSTERS[slug];
  if (!poster) return new Response("Poster not found", { status: 404 });
  const compact = poster.items.length >= 4;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "48px 52px 38px", background: "#fff", color: "#0d1b2a" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", fontSize: 50, fontWeight: 900, letterSpacing: -2 }}><span>cheza</span><span style={{ color: "#e6001e" }}>Hub</span><span style={{ color: "#e6001e", fontSize: 28, alignSelf: "flex-end", marginBottom: 6 }}>.co.ke</span></div>
        <div style={{ display: "flex", padding: "12px 24px", borderRadius: 999, background: "#0d1b2a", color: "#fff", fontSize: 23, fontWeight: 800 }}>{poster.eyebrow}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 34 }}>
        <div style={{ fontSize: poster.title.length > 34 ? 60 : 70, lineHeight: .98, fontWeight: 900, letterSpacing: -2, maxWidth: 980 }}>{poster.title}</div>
        <div style={{ marginTop: 16, fontSize: 28, color: "#596273" }}>{poster.subtitle}</div>
        <div style={{ width: 110, height: 7, background: "#e6001e", borderRadius: 9, marginTop: 20 }} />
      </div>
      <div style={{ display: "flex", gap: compact ? 12 : 22, flex: 1, alignItems: "center", marginTop: 30 }}>
        {poster.items.map((item) => <ProductCard key={item.name} item={item} compact={compact} />)}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 28, paddingTop: 23, borderTop: "2px solid #e5e7eb" }}>
        <div style={{ display: "flex", maxWidth: 610, fontSize: 22, color: "#596273" }}>{poster.note}</div>
        <div style={{ display: "flex", gap: 24, alignItems: "center", fontSize: 23, fontWeight: 800 }}><span>chezahub.co.ke</span><span style={{ color: "#e6001e" }}>+254 113 033 475</span></div>
      </div>
    </div>,
    { width: 1080, height: 1080, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
