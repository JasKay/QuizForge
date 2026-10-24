"use client";
import { usePathname } from "next/navigation";
import BuzzerApp from "./buzzer-app";
import Workspace from "./workspace";
import { useAppViewport } from "./viewport-pages";
export default function BuzzerRouter() {
  useAppViewport();
  const path = usePathname();
  return [
    "/",
    "/welcome",
    "/learn",
    "/play",
    "/teams",
    "/login",
    "/signup",
    "/account",
    "/dashboard",
  ].includes(path) ? (
    <BuzzerApp />
  ) : (
    <Workspace />
  );
}
