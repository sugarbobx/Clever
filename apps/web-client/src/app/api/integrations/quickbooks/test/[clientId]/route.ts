import { NextResponse } from "next/server";
import axios from "axios";
import { prisma } from "@/server/prisma";
import { requireAuth, requireRoles } from "@/server/auth";
import { handle, ApiError } from "@/server/http";
import { ensureFreshToken } from "@/server/qboTokenGuard";
import { qboConfigured } from "@/server/env";
import { ROLES } from "@/server/enums";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/integrations/quickbooks/test/:clientId — verify the connection works.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ clientId: string }> }) => {
  const user = await requireAuth(req);
  requireRoles(user, ROLES.MANAGER_N2);
  const { clientId } = await params;

  const conn = await prisma.qboConnection.findUnique({ where: { clientId } });
  if (!conn) throw new ApiError(404, "Connexion QuickBooks introuvable.");

  // Demo connection (or no QBO credentials): report a mock success.
  if (conn.demo || !qboConfigured) {
    return NextResponse.json({ success: true, companyName: "Entreprise démo (sandbox)", demo: true });
  }

  try {
    const token = await ensureFreshToken(clientId);
    const baseUrl =
      conn.environment === "production"
        ? "https://quickbooks.api.intuit.com"
        : "https://sandbox-quickbooks.api.intuit.com";
    const res = await axios.get(`${baseUrl}/v3/company/${conn.realmId}/companyinfo/${conn.realmId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    return NextResponse.json({ success: true, companyName: res.data?.CompanyInfo?.CompanyName ?? "—", demo: false });
  } catch {
    await prisma.qboConnection.update({ where: { clientId }, data: { isActive: false } }).catch(() => {});
    throw new ApiError(400, "Connexion QuickBooks invalide — reconnexion nécessaire.");
  }
});
