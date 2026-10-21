"use client";
import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
export function GameHeader(_: { name?: string; xp?: number }) {
  useEffect(() => {
    const resize = () =>
      document.documentElement.style.setProperty(
        "--app-height",
        (window.visualViewport?.height || window.innerHeight) + "px",
      );
    resize();
    window.visualViewport?.addEventListener("resize", resize);
    return () => window.visualViewport?.removeEventListener("resize", resize);
  }, []);
  const path = usePathname(),
    home = path === "/" || path === "/dashboard";
  return (
    <header className="trivia-header">
      {home ? (
        <Link href="/" className="trivia-wordmark">
          Trivia<span>.</span>
        </Link>
      ) : (
        <Link href="/dashboard" className="trivia-back" aria-label="Home">
          <ArrowLeft size={20} />
        </Link>
      )}
      {!home && (
        <Link href="/" className="trivia-wordmark">
          Trivia<span>.</span>
        </Link>
      )}
      <Link href="/profile" className="trivia-profile" aria-label="My Profile">
        <UserRound size={21} />
      </Link>
    </header>
  );
}
