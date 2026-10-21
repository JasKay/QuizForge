export function sameOrigin(url: string, origin: string | null) {
  if (!origin) return false;
  try {
    return new URL(url).origin === new URL(origin).origin;
  } catch {
    return false;
  }
}
export function validCode(value: unknown) {
  return (
    typeof value === "string" &&
    /^[A-F0-9]{8}$/.test(value.trim().toUpperCase())
  );
}
export function roomCode(value: unknown) {
  if (!validCode(value)) throw Error("Enter the 8-character room code.");
  return (value as string).trim().toUpperCase();
}

// Next.js may normalize a loopback/internal URL. The browser-visible Host
// remains the authority; browsers cannot forge it in a cross-site fetch.
export function sameRequestOrigin(
  url: string,
  host: string | null,
  origin: string | null,
) {
  try {
    const target = new URL(url);
    if (host) {
      if (!/^[a-z0-9.\-:\[\]]+$/i.test(host)) return false;
      target.host = host;
    }
    return sameOrigin(target.href, origin);
  } catch {
    return false;
  }
}
