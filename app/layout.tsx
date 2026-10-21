import "./globals.css";
import type { Metadata, Viewport } from "next";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf8f2",
};
export const metadata: Metadata = {
  title: "QuizForge | Your team. Every phone.",
  applicationName: "QuizForge",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "QuizForge" },
  description:
    "Mobile-first quiz-bowl team training. Join a shared practice room, buzz in on your phone, and prepare for your next competition together.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
