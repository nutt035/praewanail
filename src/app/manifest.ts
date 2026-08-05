import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Antonette Nail",
    short_name: "Antonette",
    description: "ร้านทำเล็บ Antonette Nail — จองคิวออนไลน์ง่าย ๆ",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF8F7",
    theme_color: "#B76E79",
    icons: [
      {
        src: "/web-app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/web-app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
