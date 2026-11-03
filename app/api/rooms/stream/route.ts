import { NextRequest } from "next/server";
import { GET as getRoom } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Short-lived SSE stream. Every snapshot is generated with the same cookie and
// authorization checks as GET /api/rooms. Clients reconnect automatically.
// This is server-streamed polling, not a database LISTEN/NOTIFY subscription.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code || !/^[A-F0-9]{8}$/i.test(code)) {
    return Response.json({ error: "Invalid room code" }, { status: 400 });
  }
  const first = await getRoom(request);
  if (!first.ok) return first;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let last = "";
      let closed = false;
      const emit = (payload: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(payload)); }
        catch { closed = true; }
      };
      const stop = () => {
        if (closed) return;
        closed = true;
        try { controller.close(); } catch {}
      };
      request.signal.addEventListener("abort", stop, { once: true });
      const until = Date.now() + 20000;
      try {
        let response: Response = first;
        while (!closed && !request.signal.aborted && Date.now() < until) {
          if (!response.ok) { emit("event: reconnect\\ndata: {}\\n\\n"); break; }
          const data = await response.json();
          const version = String(data.room?.version ?? "") + ":" + String(data.room?.server_time ?? "").slice(0, 0);
          if (version !== last) {
            last = version;
            emit("event: room\\ndata: " + JSON.stringify(data.room) + "\\n\\n");
          } else emit(": heartbeat\\n\\n");
          await new Promise((resolve) => setTimeout(resolve, 550));
          if (closed || request.signal.aborted) break;
          response = await getRoom(request);
        }
      } catch { emit("event: reconnect\\ndata: {}\\n\\n"); }
      finally { stop(); }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform, private",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
