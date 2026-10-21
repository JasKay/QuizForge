import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QuizForge — Team Quiz Bowl",
    short_name: "QuizForge",
    description: "Your team. Shared questions. Every phone.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f2",
    theme_color: "#faf8f2",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
