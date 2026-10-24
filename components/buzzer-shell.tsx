"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CirclePlay, UsersRound, UserRound } from "lucide-react";
import { isValidElement } from "react";
import { flattenScreens, ViewportPages } from "./viewport-pages";

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
  const all = flattenScreens(children),
    overlays = all.filter(
      (child) =>
        isValidElement<{
          screenOverlay?: boolean;
          "data-screen-overlay"?: boolean;
        }>(child) &&
        (child.props.screenOverlay || child.props["data-screen-overlay"]),
    ),
    content = all.filter((child) => !overlays.includes(child));
  return (
    <div className="buzzer-app" data-section={path}>
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
        <main className="bz-main">
          <ViewportPages key={path} resetKey={path}>
            {content}
          </ViewportPages>
        </main>
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
        {overlays}
      </div>
    </div>
  );
}
