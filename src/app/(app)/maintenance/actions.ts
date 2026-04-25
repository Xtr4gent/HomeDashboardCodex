"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  MaintenanceFrequency,
  MaintenancePriority
} from "@/generated/prisma/enums";
import { requireHousehold } from "@/lib/auth";
import {
  nextDueFromFrequency,
  parseDateInput,
  todayDate
} from "@/lib/dates";
import { statusForMaintenanceTask } from "@/lib/maintenance";
import { prisma } from "@/lib/prisma";

const maintenanceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(800).optional(),
  category: z.string().trim().min(1).max(60),
  frequency: z.nativeEnum(MaintenanceFrequency),
  lastCompletedDate: z.date().nullable(),
  nextDueDate: z.date().nullable(),
  priority: z.nativeEnum(MaintenancePriority),
  notes: z.string().trim().max(1200).optional()
});

function maintenancePayload(formData: FormData) {
  return maintenanceSchema.parse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    category: formData.get("category"),
    frequency: formData.get("frequency"),
    lastCompletedDate: parseDateInput(formData.get("lastCompletedDate")),
    nextDueDate: parseDateInput(formData.get("nextDueDate")),
    priority: formData.get("priority"),
    notes: formData.get("notes") || undefined
  });
}

export async function createMaintenanceAction(formData: FormData) {
  const { user, household } = await requireHousehold();
  const payload = maintenancePayload(formData);
  const status = statusForMaintenanceTask(payload);

  await prisma.maintenanceTask.create({
    data: {
      householdId: household.id,
      createdById: user.id,
      ...payload,
      id: undefined,
      status
    }
  });

  revalidatePath("/");
  revalidatePath("/maintenance");
}

export async function updateMaintenanceAction(formData: FormData) {
  const { household } = await requireHousehold();
  const payload = maintenancePayload(formData);

  if (!payload.id) {
    throw new Error("Maintenance task id is required.");
  }

  const status = statusForMaintenanceTask(payload);

  await prisma.maintenanceTask.updateMany({
    where: { id: payload.id, householdId: household.id },
    data: {
      name: payload.name,
      description: payload.description,
      category: payload.category,
      frequency: payload.frequency,
      lastCompletedDate: payload.lastCompletedDate,
      nextDueDate: payload.nextDueDate,
      priority: payload.priority,
      notes: payload.notes,
      status
    }
  });

  revalidatePath("/");
  revalidatePath("/maintenance");
}

export async function deleteMaintenanceAction(formData: FormData) {
  const { household } = await requireHousehold();
  const id = z.string().min(1).parse(formData.get("id"));

  await prisma.maintenanceTask.deleteMany({ where: { id, householdId: household.id } });

  revalidatePath("/");
  revalidatePath("/maintenance");
}

export async function completeMaintenanceAction(formData: FormData) {
  const { household } = await requireHousehold();
  const id = z.string().min(1).parse(formData.get("id"));
  const task = await prisma.maintenanceTask.findFirst({
    where: { id, householdId: household.id }
  });

  if (!task) {
    throw new Error("Maintenance task not found.");
  }

  const completedAt = todayDate();
  const nextDueDate = nextDueFromFrequency(completedAt, task.frequency);
  const status = statusForMaintenanceTask({
    frequency: task.frequency,
    nextDueDate
  });

  await prisma.maintenanceTask.update({
    where: { id: task.id },
    data: {
      lastCompletedDate: completedAt,
      nextDueDate,
      status
    }
  });

  revalidatePath("/");
  revalidatePath("/maintenance");
}
