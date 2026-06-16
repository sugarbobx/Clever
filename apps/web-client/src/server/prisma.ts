import { PrismaClient } from "@prisma/client";
import { isDev } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __cleverPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__cleverPrisma ??
  new PrismaClient({ log: isDev ? ["warn", "error"] : ["error"] });

if (isDev) global.__cleverPrisma = prisma;
