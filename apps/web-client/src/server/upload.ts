import path from "node:path";
import fs from "node:fs/promises";
import { env } from "./env";
import { ApiError } from "./http";

/** Uploads live under the app root (process.cwd() === apps/web-client). */
export const UPLOAD_DIR_ABS = path.resolve(process.cwd(), env.UPLOAD_DIR);

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export interface SavedUpload {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
}

/** Validate (MIME + size) and persist a multipart File to local disk. */
export async function saveUpload(file: File): Promise<SavedUpload> {
  if (!ALLOWED.has(file.type)) {
    throw new ApiError(400, "Type de fichier non autorisé (JPG, PNG, WEBP, PDF).");
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > env.MAX_FILE_SIZE_MB * 1024 * 1024) {
    throw new ApiError(400, `Fichier trop volumineux (max ${env.MAX_FILE_SIZE_MB} Mo).`);
  }
  await fs.mkdir(UPLOAD_DIR_ABS, { recursive: true });
  const ext = path.extname(file.name) || "";
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR_ABS, filename), buf);
  return { filename, originalName: file.name, mimeType: file.type, size: buf.length };
}
