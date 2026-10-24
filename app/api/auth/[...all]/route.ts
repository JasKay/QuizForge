import { getAuth } from "@/lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handler(request: Request) {
  try {
    return await getAuth().handler(request);
  } catch {
    return Response.json(
      {
        message:
          "Accounts are temporarily unavailable. Please try again shortly.",
      },
      { status: 503 },
    );
  }
}
export { handler as GET, handler as POST };
