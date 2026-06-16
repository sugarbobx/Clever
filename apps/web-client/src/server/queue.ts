/**
 * OCR job dispatch. Dual-mode so the same call site works in both phases:
 *   - REDIS_URL set  → enqueue on a Bull queue (durable, retried worker),
 *   - REDIS_URL unset → process inline, fire-and-forget (local MVP, no Redis).
 * Bull is dynamically imported so it never connects to Redis at build time.
 */
import { env, queueEnabled } from "./env";
import { processReceipt, type OcrJob } from "./ocrWorker";
import { pushToQbo } from "./qboPushWorker";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ocrQueue: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let qboQueue: any = null;
let registered = false;
let qboRegistered = false;

async function getOcrQueue() {
  if (!queueEnabled) return null;
  if (ocrQueue) return ocrQueue;
  const { default: Bull } = await import("bull");
  ocrQueue = new Bull("ocr-queue", {
    redis: env.REDIS_URL,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  });
  if (!registered) {
    registered = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ocrQueue.process("process-receipt", async (job: any) => processReceipt(job.data as OcrJob));
    console.log("✅ OCR worker (Bull) enregistré");
  }
  return ocrQueue;
}

export async function enqueueOcr(data: OcrJob): Promise<void> {
  const q = await getOcrQueue();
  if (q) {
    await q.add("process-receipt", data);
  } else {
    // Inline: don't block the webhook response; let it run after we return 200.
    void processReceipt(data).catch((err) => console.error("[ocr inline] error", err));
  }
}

async function getQboQueue() {
  if (!queueEnabled) return null;
  if (qboQueue) return qboQueue;
  const { default: Bull } = await import("bull");
  qboQueue = new Bull("qbo-push-queue", {
    redis: env.REDIS_URL,
    defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 10000 } },
  });
  if (!qboRegistered) {
    qboRegistered = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    qboQueue.process("push-to-qbo", async (job: any) => pushToQbo(job.data.documentId as string));
    console.log("✅ QBO push worker (Bull) enregistré");
  }
  return qboQueue;
}

export async function enqueueQboPush(documentId: string): Promise<void> {
  const q = await getQboQueue();
  if (q) {
    await q.add("push-to-qbo", { documentId });
  } else {
    void pushToQbo(documentId).catch((err) => console.error("[qbo push inline] error", err));
  }
}
