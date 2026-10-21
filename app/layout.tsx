import "./globals.css";
import type { Metadata, Viewport } from "next";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};
export const metadata: Metadata = {
  title: "Trivia",
  applicationName: "Trivia",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Trivia" },
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
