import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireAuth, requireRoles } from "@/server/auth";
import { handle, ApiError } from "@/server/http";
import { audit } from "@/server/audit";
import { ROLES, CLIENT_TYPES, SUBSCRIPTION_TIERS } from "@/server/enums";

export const dynamic = "force-dynamic";

// GET /api/clients — list (manager + employee read-only)
export const GET = handle(async (req: Request) => {
  const user = await requireAuth(req);
  requireRoles(user, ROLES.MANAGER_N2, ROLES.EMPLOYEE);
  const clients = await prisma.clientAccount.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      assignedStaff: { select: { name: true } },
      qboConnection: { select: { isActive: true, demo: true, realmId: true } },
      _count: { select: { documents: true } },
    },
  });
  return NextResponse.json({ clients });
});

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  type: z.enum([CLIENT_TYPES.INDIVIDUAL, CLIENT_TYPES.COMPANY]),
  phone: z.string().optional(),
  country: z.string().default("CM"),
  subscriptionTier: z
    .enum([SUBSCRIPTION_TIERS.DECLARANT_SOLO, SUBSCRIPTION_TIERS.COMPTABLE_PRO, SUBSCRIPTION_TIERS.GRAND_COMPTE])
    .default(SUBSCRIPTION_TIERS.DECLARANT_SOLO),
  assignedStaffId: z.string().optional(),
});

// POST /api/clients — create (manager only)
export const POST = handle(async (req: Request) => {
  const user = await requireAuth(req);
  requireRoles(user, ROLES.MANAGER_N2);
  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, "Données invalides.");

  const exists = await prisma.clientAccount.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (exists) throw new ApiError(409, "Un client avec cet email existe déjà.");

  const client = await prisma.clientAccount.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      type: parsed.data.type,
      phone: parsed.data.phone,
      country: parsed.data.country,
      subscriptionTier: parsed.data.subscriptionTier,
      assignedStaffId: parsed.data.assignedStaffId,
      monthResetAt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    },
  });
  await audit({
    actorId: user.sub,
    actorName: user.name,
    action: "CLIENT_CREATED",
    entity: "ClientAccount",
    entityId: client.id,
    detail: client.name,
  });
  return NextResponse.json({ client }, { status: 201 });
});
