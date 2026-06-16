import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOpts,
  refreshCookieOpts,
  signAccessToken,
  signRefreshToken,
  type JwtPayload,
} from "@/server/jwt";
import { ApiError, handle } from "@/server/http";
import { ROLES, CLIENT_TYPES, SUBSCRIPTION_TIERS, type Role } from "@/server/enums";

export const dynamic = "force-dynamic";

// Self-service réservé aux clients. EMPLOYEE/TRAINEE sont créés par le manager
// (flux d'invitation interne) ; MANAGER_N2 et HR aussi.
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(["CLIENT_INDIVIDUAL", "CLIENT_COMPANY"]),
});

// POST /api/auth/register — crée le compte client (réel) puis ouvre la session.
export const POST = handle(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, "Données d'inscription invalides.");
  const d = parsed.data;
  const email = d.email.toLowerCase();

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new ApiError(409, "Un compte avec cet email existe déjà.");
  const dupe = await prisma.clientAccount.findUnique({ where: { email } });
  if (dupe) throw new ApiError(409, "Un compte avec cet email existe déjà.");

  const name = `${d.firstName.trim()} ${d.lastName.trim()}`.trim();
  const passwordHash = await bcrypt.hash(d.password, 10);

  // Tout compte self-service est un client → rattaché à un ClientAccount (affiné à l'onboarding).
  const isCompany = d.role === ROLES.CLIENT_COMPANY;
  const acct = await prisma.clientAccount.create({
    data: {
      name,
      type: isCompany ? CLIENT_TYPES.COMPANY : CLIENT_TYPES.INDIVIDUAL,
      email,
      phone: d.phone,
      subscriptionTier: isCompany ? SUBSCRIPTION_TIERS.COMPTABLE_PRO : SUBSCRIPTION_TIERS.DECLARANT_SOLO,
      monthResetAt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    },
  });

  const user = await prisma.user.create({
    data: { email, password: passwordHash, role: d.role, name, clientAccountId: acct.id },
  });

  const payload: JwtPayload = {
    sub: user.id,
    role: user.role as Role,
    name: user.name,
    email: user.email,
    clientAccountId: user.clientAccountId,
  };
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, signAccessToken(payload), accessCookieOpts);
  jar.set(REFRESH_COOKIE, signRefreshToken({ sub: user.id }), refreshCookieOpts);

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        clientAccountId: user.clientAccountId,
        onboardingCompleted: user.onboardingCompleted,
      },
    },
    { status: 201 }
  );
});
