import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { SYSCOHADA_LIST, matchDescription, tvaFromTTC, tvaRate } from "@clever/fiscal-engine";
import {
  ROLES,
  CLIENT_TYPES,
  SUBSCRIPTION_TIERS,
  DOCUMENT_SOURCES,
  DOCUMENT_STATUS,
} from "../src/server/enums";

const prisma = new PrismaClient();

const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function seedSysohada() {
  for (const a of SYSCOHADA_LIST) {
    await prisma.sysohadaAccount.upsert({
      where: { code: a.code },
      create: {
        code: a.code,
        label: a.label,
        class: a.class,
        parent: a.parent ?? null,
        keywords: JSON.stringify(a.keywords ?? []),
      },
      update: { label: a.label, class: a.class, parent: a.parent ?? null, keywords: JSON.stringify(a.keywords ?? []) },
    });
  }
  console.log(`  ✓ ${SYSCOHADA_LIST.length} comptes SYSCOHADA`);
}

async function main() {
  console.log("🌱 Seed CLEVER (démo locale)…");

  await seedSysohada();

  // ── Client accounts ──
  const individual = await prisma.clientAccount.upsert({
    where: { email: "jean.dupont@example.cm" },
    create: {
      name: "Jean Dupont",
      email: "jean.dupont@example.cm",
      type: CLIENT_TYPES.INDIVIDUAL,
      phone: "+237690000001",
      country: "CM",
      subscriptionTier: SUBSCRIPTION_TIERS.DECLARANT_SOLO,
      monthResetAt: monthStart,
    },
    update: {},
  });

  const company = await prisma.clientAccount.upsert({
    where: { email: "contact@saheltech.cm" },
    create: {
      name: "SARL Sahel Tech",
      email: "contact@saheltech.cm",
      type: CLIENT_TYPES.COMPANY,
      phone: "+237690000002",
      country: "CM",
      subscriptionTier: SUBSCRIPTION_TIERS.COMPTABLE_PRO,
      monthResetAt: monthStart,
    },
    update: {},
  });

  const extraCompany = await prisma.clientAccount.upsert({
    where: { email: "finance@groupelogistique.cm" },
    create: {
      name: "Groupe Logistique CM",
      email: "finance@groupelogistique.cm",
      type: CLIENT_TYPES.COMPANY,
      phone: "+237690000003",
      country: "CM",
      subscriptionTier: SUBSCRIPTION_TIERS.GRAND_COMPTE,
      monthResetAt: monthStart,
    },
    update: {},
  });

  // ── Users (one per role) ──
  const users: Array<{ email: string; name: string; role: string; pw: string; clientAccountId?: string }> = [
    { email: "manager@clever.cm", name: "Awa Ndiaye", role: ROLES.MANAGER_N2, pw: "Manager@1234" },
    { email: "hr@clever.cm", name: "Paul Mbarga", role: ROLES.HR, pw: "Hr@1234" },
    { email: "employee@clever.cm", name: "Sandrine Kana", role: ROLES.EMPLOYEE, pw: "Employee@1234" },
    { email: "trainee@clever.cm", name: "Yann Foko", role: ROLES.TRAINEE, pw: "Trainee@1234" },
    {
      email: "particulier@clever.cm",
      name: "Jean Dupont",
      role: ROLES.CLIENT_INDIVIDUAL,
      pw: "Client@1234",
      clientAccountId: individual.id,
    },
    {
      email: "entreprise@clever.cm",
      name: "SARL Sahel Tech",
      role: ROLES.CLIENT_COMPANY,
      pw: "Client@1234",
      clientAccountId: company.id,
    },
  ];

  let manager: { id: string } | null = null;
  for (const u of users) {
    const created = await prisma.user.upsert({
      where: { email: u.email },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        password: await hash(u.pw),
        clientAccountId: u.clientAccountId,
        onboardingCompleted: true, // comptes de démo : pas d'onboarding
      },
      update: { name: u.name, role: u.role, clientAccountId: u.clientAccountId, onboardingCompleted: true },
    });
    if (u.role === ROLES.MANAGER_N2) manager = created;
  }

  // Assign staff to client folders
  if (manager) {
    await prisma.clientAccount.updateMany({
      where: { id: { in: [individual.id, company.id, extraCompany.id] }, assignedStaffId: null },
      data: { assignedStaffId: manager.id },
    });
  }

  // ── Sample pending documents for the validation queue ──
  const samples = [
    { client: individual.id, vendor: "Total Energies Bonanjo", description: "essence station total carburant", amount: 25000, source: DOCUMENT_SOURCES.WHATSAPP, confident: false },
    { client: company.id, vendor: "Orange Cameroun", description: "facture orange internet forfait", amount: 45000, source: DOCUMENT_SOURCES.WHATSAPP, confident: false },
    { client: company.id, vendor: "Restaurant Le Foufou", description: "repas client restaurant déjeuner", amount: 32000, source: DOCUMENT_SOURCES.PORTAL, confident: false },
    { client: extraCompany.id, vendor: "Papeterie Centrale", description: "achat papier stylos fournitures de bureau", amount: 18500, source: DOCUMENT_SOURCES.WHATSAPP, confident: false },
    // Confiance 100 % → éligibles à l'« Approuver tout » en lot.
    { client: company.id, vendor: "Eneo Cameroun", description: "facture electricite eneo", amount: 60000, source: DOCUMENT_SOURCES.WHATSAPP, confident: true },
    { client: individual.id, vendor: "Camwater", description: "facture eau camwater", amount: 12000, source: DOCUMENT_SOURCES.PORTAL, confident: true },
  ];

  const existingDocs = await prisma.document.count();
  if (existingDocs === 0) {
    for (const s of samples) {
      const m = matchDescription(s.description);
      await prisma.document.create({
        data: {
          clientId: s.client,
          source: s.source,
          status: DOCUMENT_STATUS.PENDING_VALIDATION,
          filePath: "demo-receipt.png",
          fileName: "recu.png",
          mimeType: "image/png",
          fileSize: 84211,
          vendor: s.vendor,
          amount: s.amount,
          currency: "XAF",
          date: new Date(),
          vatAmount: tvaFromTTC(s.amount, "CM"),
          vatRate: tvaRate("CM"),
          description: s.description,
          sysohadaCode: m.code,
          sysohadaLabel: m.label,
          ocrConfidence: s.confident ? 1 : m.confidence,
          needsReview: s.confident ? false : m.needsReview,
        },
      });
    }
    console.log(`  ✓ ${samples.length} documents en attente de validation`);
  }

  // ── Seed a short chat thread (client ↔ assigned staff) for the demo ──
  const employee = await prisma.user.findUnique({ where: { email: "employee@clever.cm" } });
  const clientUser = await prisma.user.findUnique({ where: { email: "particulier@clever.cm" } });
  if (employee && clientUser && (await prisma.chatMessage.count({ where: { clientId: individual.id } })) === 0) {
    await prisma.chatMessage.createMany({
      data: [
        {
          clientId: individual.id,
          senderId: employee.id,
          fromStaff: true,
          content: "Bonjour 👋 Je suis Sandrine, votre collaboratrice CLEVER. N'hésitez pas si vous avez une question.",
          isRead: true,
        },
        {
          clientId: individual.id,
          senderId: clientUser.id,
          fromStaff: false,
          content: "Bonjour Sandrine, j'ai envoyé une facture Total hier — est-elle bien prise en compte ?",
          isRead: true,
        },
        {
          clientId: individual.id,
          senderId: employee.id,
          fromStaff: true,
          content: "Oui, elle est dans la file de validation. Vous recevrez une confirmation dès l'enregistrement.",
          isRead: false,
        },
      ],
    });
    console.log("  ✓ fil de discussion de démonstration");
  }

  console.log("✅ Seed terminé.");
  console.log("   Comptes démo (mot de passe entre parenthèses) :");
  console.log("   • manager@clever.cm (Manager@1234)");
  console.log("   • hr@clever.cm (Hr@1234)");
  console.log("   • employee@clever.cm (Employee@1234)");
  console.log("   • trainee@clever.cm (Trainee@1234)");
  console.log("   • particulier@clever.cm (Client@1234)");
  console.log("   • entreprise@clever.cm (Client@1234)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
