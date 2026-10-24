"use client";
import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { unlockSound } from "@/lib/game";
import { ArrowLeft, UserRound } from "lucide-react";
export function GameHeader(_: { name?: string; xp?: number }) {
  useEffect(() => {
    const resize = () =>
      document.documentElement.style.setProperty(
        "--app-height",
        (window.visualViewport?.height || window.innerHeight) + "px",
      );
    resize();
    window.addEventListener("pointerdown", unlockSound, { capture: true });
    window.addEventListener("keydown", unlockSound, { capture: true });
    window.visualViewport?.addEventListener("resize", resize);
    return () => {
      window.visualViewport?.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", unlockSound, true);
      window.removeEventListener("keydown", unlockSound, true);
    };
  }, []);
  const path = usePathname(),
    home = path === "/" || path === "/dashboard";
  return (
    <header className="trivia-header">
      {home ? (
        <Link href="/learn" className="trivia-wordmark">
          Buzzer<span>!</span>
        </Link>
      ) : (
        <Link href="/play" className="trivia-back" aria-label="Home">
          <ArrowLeft size={20} />
        </Link>
      )}
      {!home && (
        <Link href="/learn" className="trivia-wordmark">
          Buzzer<span>!</span>
        </Link>
      )}
      <Link href="/account" className="trivia-profile" aria-label="My Profile">
        <UserRound size={21} />
      </Link>
    </header>
  );
}
