import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  ExpenseCategory,
  HouseholdRole,
  MaintenanceFrequency,
  MaintenancePriority,
  MaintenanceStatus,
  UpgradeStatus
} from "../src/generated/prisma/enums";

const prisma = new PrismaClient({
  adapter: new PrismaPg(
    {
      connectionString: process.env.DATABASE_URL
    },
    {
      schema: process.env.DATABASE_SCHEMA || "public"
    }
  )
});

function requiredSeedValue(name: string, fallback: string): string {
  const value = process.env[name];

  if (value) {
    return value;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} is required when seeding production.`);
  }

  return fallback;
}

function utcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

async function main() {
  const rounds = Number(process.env.BCRYPT_ROUNDS || "12");
  const gabePassword = requiredSeedValue("SEED_USER_1_PASSWORD", "change-me-gabe");
  const alessandraPassword = requiredSeedValue("SEED_USER_2_PASSWORD", "change-me-alessandra");

  const gabe = await prisma.user.upsert({
    where: { email: requiredSeedValue("SEED_USER_1_EMAIL", "gabe@example.com").toLowerCase() },
    update: {
      username: requiredSeedValue("SEED_USER_1_USERNAME", "Gabe").toLowerCase(),
      name: process.env.SEED_USER_1_NAME || "Gabe",
      passwordHash: await bcrypt.hash(gabePassword, rounds),
      avatarColor: "#2563eb"
    },
    create: {
      email: requiredSeedValue("SEED_USER_1_EMAIL", "gabe@example.com").toLowerCase(),
      username: requiredSeedValue("SEED_USER_1_USERNAME", "Gabe").toLowerCase(),
      name: process.env.SEED_USER_1_NAME || "Gabe",
      passwordHash: await bcrypt.hash(gabePassword, rounds),
      avatarColor: "#2563eb"
    }
  });

  const alessandra = await prisma.user.upsert({
    where: { email: requiredSeedValue("SEED_USER_2_EMAIL", "alessandra@example.com").toLowerCase() },
    update: {
      username: requiredSeedValue("SEED_USER_2_USERNAME", "Alessandra").toLowerCase(),
      name: process.env.SEED_USER_2_NAME || "Alessandra",
      passwordHash: await bcrypt.hash(alessandraPassword, rounds),
      avatarColor: "#0f8b6f"
    },
    create: {
      email: requiredSeedValue("SEED_USER_2_EMAIL", "alessandra@example.com").toLowerCase(),
      username: requiredSeedValue("SEED_USER_2_USERNAME", "Alessandra").toLowerCase(),
      name: process.env.SEED_USER_2_NAME || "Alessandra",
      passwordHash: await bcrypt.hash(alessandraPassword, rounds),
      avatarColor: "#0f8b6f"
    }
  });

  const household = await prisma.household.upsert({
    where: { id: "home-dashboard-household" },
    update: { name: "Gabe & Alessandra's Home" },
    create: {
      id: "home-dashboard-household",
      name: "Gabe & Alessandra's Home"
    }
  });

  await prisma.householdMember.upsert({
    where: { householdId_userId: { householdId: household.id, userId: gabe.id } },
    update: { role: HouseholdRole.OWNER },
    create: { householdId: household.id, userId: gabe.id, role: HouseholdRole.OWNER }
  });

  await prisma.householdMember.upsert({
    where: { householdId_userId: { householdId: household.id, userId: alessandra.id } },
    update: { role: HouseholdRole.OWNER },
    create: { householdId: household.id, userId: alessandra.id, role: HouseholdRole.OWNER }
  });

  const existingExpenses = await prisma.budgetExpense.count({ where: { householdId: household.id } });

  if (existingExpenses === 0) {
    await prisma.budgetExpense.createMany({
      data: [
        {
          householdId: household.id,
          createdById: gabe.id,
          name: "Mortgage payment",
          category: ExpenseCategory.MORTGAGE,
          amountCents: 245000,
          dueDate: utcDate("2026-04-01"),
          isPaid: true,
          paidDate: utcDate("2026-04-01"),
          isRecurring: true
        },
        {
          householdId: household.id,
          createdById: alessandra.id,
          name: "Utilities",
          category: ExpenseCategory.UTILITIES,
          amountCents: 28500,
          dueDate: utcDate("2026-04-18"),
          isPaid: false,
          isRecurring: true
        },
        {
          householdId: household.id,
          createdById: gabe.id,
          name: "Internet",
          category: ExpenseCategory.INTERNET,
          amountCents: 8900,
          dueDate: utcDate("2026-04-22"),
          isPaid: false,
          isRecurring: true
        }
      ]
    });
  }

  const existingUpgrades = await prisma.upgradeProject.count({ where: { householdId: household.id } });

  if (existingUpgrades === 0) {
    await prisma.upgradeProject.createMany({
      data: [
        {
          householdId: household.id,
          createdById: alessandra.id,
          name: "Paint primary bedroom",
          description: "Choose colors, buy supplies, and paint before new furniture arrives.",
          room: "Primary bedroom",
          status: UpgradeStatus.IN_PROGRESS,
          estimatedCents: 65000,
          actualCents: 42000,
          startDate: utcDate("2026-04-10"),
          notes: "Test swatches are on the north wall."
        },
        {
          householdId: household.id,
          createdById: gabe.id,
          name: "Garage storage wall",
          description: "Install rail system and shelves for tools and seasonal bins.",
          room: "Garage",
          status: UpgradeStatus.PLANNED,
          estimatedCents: 90000
        }
      ]
    });
  }

  const existingMaintenance = await prisma.maintenanceTask.count({ where: { householdId: household.id } });

  if (existingMaintenance === 0) {
    await prisma.maintenanceTask.createMany({
      data: [
        {
          householdId: household.id,
          createdById: gabe.id,
          name: "Replace HVAC filter",
          category: "HVAC",
          frequency: MaintenanceFrequency.QUARTERLY,
          lastCompletedDate: utcDate("2026-01-15"),
          nextDueDate: utcDate("2026-04-15"),
          priority: MaintenancePriority.HIGH,
          status: MaintenanceStatus.OVERDUE
        },
        {
          householdId: household.id,
          createdById: alessandra.id,
          name: "Test smoke detectors",
          category: "Safety",
          frequency: MaintenanceFrequency.MONTHLY,
          lastCompletedDate: utcDate("2026-04-01"),
          nextDueDate: utcDate("2026-05-01"),
          priority: MaintenancePriority.MEDIUM,
          status: MaintenanceStatus.UPCOMING
        },
        {
          householdId: household.id,
          createdById: gabe.id,
          name: "Clean dryer vent",
          category: "Laundry",
          frequency: MaintenanceFrequency.SEMI_ANNUALLY,
          nextDueDate: utcDate("2026-05-20"),
          priority: MaintenancePriority.MEDIUM,
          status: MaintenanceStatus.UPCOMING
        }
      ]
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
