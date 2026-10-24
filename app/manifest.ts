import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Buzzer! — Learn. Practice. Compete.",
    short_name: "Buzzer!",
    description: "Solo and multiplayer trivia practice.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f6f0",
    theme_color: "#f7f6f0",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
