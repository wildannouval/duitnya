// src/app/manifest.ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Duitnya",
    short_name: "Duitnya",
    description: "Catat keuangan pribadi: akun, transaksi, budget, hutang-piutang, langganan.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#0ea5e9",
    lang: "id",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    screenshots: [],
    categories: ["finance", "productivity"]
  };
}
