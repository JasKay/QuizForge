import "server-only";
import { getAuth } from "@/lib/auth";
import { sameRequestOrigin } from "@/lib/room-security";

export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function requireUser(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session)
    throw new AppError(
      "Sign in to save progress and play with your team.",
      401,
    );
  return session.user;
}
export async function readAction(request: Request) {
  if (
    !sameRequestOrigin(
      request.url,
      request.headers.get("host"),
      request.headers.get("origin"),
    )
  )
    throw new AppError("Open Buzzer! and try again.", 403);
  if (Number(request.headers.get("content-length") || 0) > 8192)
    throw new AppError("That request is too large.", 413);
  const raw = await request.text();
  if (raw.length > 8192) throw new AppError("That request is too large.", 413);
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw Error();
    return value as Record<string, unknown>;
  } catch {
    throw new AppError("Please check the form and try again.");
  }
}
export function text(value: unknown, min = 1, max = 80) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw new AppError("Please enter a valid value.");
  return value.trim();
}
export function apiError(error: unknown) {
  if (error instanceof AppError)
    return Response.json({ error: error.message }, { status: error.status });
  console.error("Buzzer request failed", {
    code: (error as { code?: string })?.code || "unavailable",
  });
  return Response.json(
    { error: "We couldn’t complete that right now. Please try again." },
    { status: 503 },
  );
}
export const privateHeaders = { "Cache-Control": "private, no-store" };
