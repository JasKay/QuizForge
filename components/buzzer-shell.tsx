"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CirclePlay,
  UsersRound,
  UserRound,
  ChartNoAxesCombined,
  Bell,
} from "lucide-react";
import { isValidElement } from "react";
import { flattenScreens } from "./viewport-pages";

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
          <div style={{display:"flex",alignItems:"center",gap:10,marginLeft:"auto"}}><button type="button" aria-label="Install Buzzer and notification settings" title="Install Buzzer and reminders" onClick={()=>window.dispatchEvent(new Event("buzzer:open-install"))} style={{display:"grid",placeItems:"center",width:38,height:38,borderRadius:14,border:"1px solid #c5d7a0",background:"#d7fa52",color:"#191d1a",cursor:"pointer",position:"relative"}}><Bell size={20}/><span aria-hidden="true" style={{position:"absolute",right:5,top:5,width:7,height:7,background:"#f27d50",borderRadius:"50%"}}/></button>
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
          </Link></div>
        </header>
        <main className="bz-main">
          <div className="bz-content" key={path}>{content}</div>
        </main>
        <nav className="bz-nav" aria-label="Main navigation">
          {[
            { href: "/learn", label: "Learn", Icon: BookOpen },
            { href: "/play", label: "Play", Icon: CirclePlay },
            { href: "/mastery", label: "Mastery", Icon: ChartNoAxesCombined },
            { href: "/teams", label: "Teams", Icon: UsersRound },
          ].map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={
                path === href || (path === "/" && href === "/learn") || (href === "/play" && (path.startsWith("/rooms") || path.startsWith("/ultimate") || path.startsWith("/practice")))
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
