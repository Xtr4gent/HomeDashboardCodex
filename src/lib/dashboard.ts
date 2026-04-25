import { MaintenanceStatus, UpgradeStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { todayDate } from "@/lib/dates";
import { syncMaintenanceStatuses } from "@/lib/maintenance";

export async function getDashboardData(householdId: string) {
  await syncMaintenanceStatuses(householdId);

  const today = todayDate();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));

  const [monthExpenses, activeUpgrades, upcomingMaintenance, overdueMaintenance, recentExpenses] =
    await Promise.all([
      prisma.budgetExpense.findMany({
        where: {
          householdId,
          dueDate: {
            gte: monthStart,
            lt: nextMonthStart
          }
        },
        orderBy: { dueDate: "asc" }
      }),
      prisma.upgradeProject.findMany({
        where: {
          householdId,
          status: { in: [UpgradeStatus.PLANNED, UpgradeStatus.IN_PROGRESS] }
        },
        orderBy: [{ status: "asc" }, { startDate: "asc" }],
        take: 5
      }),
      prisma.maintenanceTask.findMany({
        where: {
          householdId,
          status: { in: [MaintenanceStatus.UPCOMING, MaintenanceStatus.DUE_SOON] }
        },
        orderBy: [{ nextDueDate: "asc" }, { priority: "desc" }],
        take: 6
      }),
      prisma.maintenanceTask.findMany({
        where: { householdId, status: MaintenanceStatus.OVERDUE },
        orderBy: [{ nextDueDate: "asc" }],
        take: 6
      }),
      prisma.budgetExpense.findMany({
        where: { householdId },
        orderBy: { dueDate: "desc" },
        take: 6
      })
    ]);

  const monthlyTotal = monthExpenses.reduce((sum, expense) => sum + expense.amountCents, 0);
  const paidTotal = monthExpenses
    .filter((expense) => expense.isPaid)
    .reduce((sum, expense) => sum + expense.amountCents, 0);
  const unpaidTotal = monthlyTotal - paidTotal;

  return {
    monthExpenses,
    activeUpgrades,
    upcomingMaintenance,
    overdueMaintenance,
    recentExpenses,
    monthlyTotal,
    paidTotal,
    unpaidTotal
  };
}
