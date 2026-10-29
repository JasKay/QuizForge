import "./globals.css";
import "./buzzer.css";
import "./learning.css";
import "./trivia.css";
import "./refinement.css";
import "./mastery.css";
import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
const font = DM_Sans({
  subsets: ["latin"],
  variable: "--font-buzzer",
  display: "swap",
});
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f6f0",
};
export const metadata: Metadata = {
  title: "Buzzer! — Learn. Practice. Compete.",
  applicationName: "Buzzer!",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Buzzer!" },
  description:
    "Follow connected trivia trails, discover something new, and bring your knowledge to category games, Ultimate Challenge, and multiplayer HCASC-style matches.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={font.variable}>{children}</body>
    </html>
  );
}
