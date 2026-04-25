import {
  MaintenanceFrequency,
  MaintenanceStatus
} from "@/generated/prisma/enums";
import { deriveMaintenanceStatus } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

type MaintenanceStatusInput = {
  frequency: MaintenanceFrequency;
  nextDueDate: Date | null;
};

export function statusForMaintenanceTask(task: MaintenanceStatusInput): MaintenanceStatus {
  return deriveMaintenanceStatus(
    task.nextDueDate,
    task.frequency,
    task.frequency === MaintenanceFrequency.ONE_TIME && !task.nextDueDate
  );
}

export async function syncMaintenanceStatuses(householdId: string) {
  const tasks = await prisma.maintenanceTask.findMany({
    where: { householdId },
    select: {
      id: true,
      frequency: true,
      nextDueDate: true,
      status: true
    }
  });

  const updates = tasks
    .map((task) => ({
      id: task.id,
      status: statusForMaintenanceTask(task),
      previousStatus: task.status
    }))
    .filter((task) => task.status !== task.previousStatus);

  if (!updates.length) {
    return;
  }

  await Promise.all(
    updates.map((task) =>
      prisma.maintenanceTask.updateMany({
        where: { id: task.id, householdId },
        data: { status: task.status }
      })
    )
  );
}
