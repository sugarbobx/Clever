import { EventEmitter } from "node:events";

/**
 * In-process event bus for real-time SSE updates (no Redis in the local MVP).
 * Server-backed phase: replace with Redis pub/sub or a Bull queue event stream.
 */
export const bus = new EventEmitter();
bus.setMaxListeners(50);

export type QueueEvent = { type: "queue:changed"; pendingCount: number };

export function emitQueueChanged(pendingCount: number) {
  bus.emit("queue", { type: "queue:changed", pendingCount } satisfies QueueEvent);
}
