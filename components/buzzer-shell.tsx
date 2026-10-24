"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CirclePlay, UsersRound, UserRound } from "lucide-react";

export function BuzzerLogo() {
  return (
    <span className="bz-logo">
      Buzzer<b>!</b>
    </span>
  );
}
export function BuzzerShell({
  children,
  name,
}: {
  children: React.ReactNode;
  name?: string;
}) {
  const path = usePathname();
  return (
    <div className="buzzer-app">
      <div className="bz-layout">
        <header className="bz-header">
          <Link href="/learn" aria-label="Buzzer! home">
            <BuzzerLogo />
          </Link>
          <Link href="/account" className="bz-avatar" aria-label="Your account">
            {name ? (
              name
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()
            ) : (
              <UserRound size={18} />
            )}
          </Link>
        </header>
        <main className="bz-main">{children}</main>
        <nav className="bz-nav" aria-label="Main navigation">
          {[
            { href: "/learn", label: "Learn", Icon: BookOpen },
            { href: "/play", label: "Play", Icon: CirclePlay },
            { href: "/teams", label: "Teams", Icon: UsersRound },
          ].map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={
                path === href || (path === "/" && href === "/learn")
                  ? "page"
                  : undefined
              }
            >
              <Icon size={22} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
