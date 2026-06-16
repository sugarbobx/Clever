import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "@/server/prisma";
import { requireAuth } from "@/server/auth";
import { handle, ApiError } from "@/server/http";
import { UPLOAD_DIR_ABS } from "@/server/upload";
import { CLIENT_ROLES } from "@/server/enums";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/documents/:id/file — stream the uploaded file from local disk
export const GET = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { role, clientAccountId } = await requireAuth(req);
  const { id } = await params;
  const doc = await prisma.document.findFirst({ where: { id, deletedAt: null } });
  if (!doc) throw new ApiError(404, "Introuvable.");
  if (CLIENT_ROLES.includes(role) && doc.clientId !== clientAccountId) {
    throw new ApiError(403, "Accès refusé.");
  }

  const abs = path.resolve(UPLOAD_DIR_ABS, path.basename(doc.filePath));
  try {
    const buf = await fs.readFile(abs);
    return new Response(buf, {
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${doc.fileName}"`,
      },
    });
  } catch {
    // Demo documents reference a placeholder file that isn't on disk.
    throw new ApiError(404, "Fichier indisponible (démo).");
  }
});
