import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Macify",
    short_name: "Macify",
    description: "A curated directory of useful macOS applications.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f5f6",
    theme_color: "#171b1e",
    icons: [
      {
        src: "/icons/macify-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/macify-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
