import { prisma } from "@/server/prisma";
import { getUser } from "@/server/auth";
import { bus, type QueueEvent } from "@/server/events";
import { DOCUMENT_STATUS } from "@/server/enums";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function pendingCount(): Promise<number> {
  return prisma.document.count({ where: { status: DOCUMENT_STATUS.PENDING_VALIDATION, deletedAt: null } });
}

// GET /api/dashboard/queue — Server-Sent Events stream of the pending count
export async function GET() {
  if (!(await getUser())) {
    return new Response("Non authentifié.", { status: 401 });
  }

  const encoder = new TextEncoder();
  let keepAlive: ReturnType<typeof setInterval>;
  let onQueue: (e: QueueEvent) => void;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (count: number) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ pendingCount: count })}\n\n`));

      send(await pendingCount());

      onQueue = (e) => send(e.pendingCount);
      bus.on("queue", onQueue);

      keepAlive = setInterval(() => controller.enqueue(encoder.encode(": ping\n\n")), 25000);
    },
    cancel() {
      clearInterval(keepAlive);
      bus.off("queue", onQueue);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
