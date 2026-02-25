import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FamilyVitals",
    short_name: "FamilyVitals",
    description: "Personal + family health hub",
    start_url: "/profiles",
    display: "standalone",
    background_color: "#f6f2e7",
    theme_color: "#1b756b",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}
