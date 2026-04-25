"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { UpgradeStatus } from "@/generated/prisma/enums";
import { requireHousehold } from "@/lib/auth";
import { parseDateInput } from "@/lib/dates";
import { centsFromFormValue } from "@/lib/money";
import { prisma } from "@/lib/prisma";

const upgradeSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(800).optional(),
  room: z.string().trim().min(1).max(60),
  status: z.nativeEnum(UpgradeStatus),
  estimatedCents: z.number().int().positive().optional(),
  actualCents: z.number().int().positive().optional(),
  startDate: z.date().nullable(),
  completionDate: z.date().nullable(),
  notes: z.string().trim().max(1200).optional(),
  links: z.string().trim().max(800).optional()
});

function upgradePayload(formData: FormData) {
  const estimatedCents = centsFromFormValue(formData.get("estimatedCost")) ?? undefined;
  const actualCents = centsFromFormValue(formData.get("actualCost")) ?? undefined;

  return upgradeSchema.parse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    room: formData.get("room"),
    status: formData.get("status"),
    estimatedCents,
    actualCents,
    startDate: parseDateInput(formData.get("startDate")),
    completionDate: parseDateInput(formData.get("completionDate")),
    notes: formData.get("notes") || undefined,
    links: formData.get("links") || undefined
  });
}

export async function createUpgradeAction(formData: FormData) {
  const { user, household } = await requireHousehold();
  const payload = upgradePayload(formData);

  await prisma.upgradeProject.create({
    data: {
      householdId: household.id,
      createdById: user.id,
      ...payload,
      id: undefined
    }
  });

  revalidatePath("/");
  revalidatePath("/upgrades");
}

export async function updateUpgradeAction(formData: FormData) {
  const { household } = await requireHousehold();
  const payload = upgradePayload(formData);

  if (!payload.id) {
    throw new Error("Upgrade id is required.");
  }

  await prisma.upgradeProject.updateMany({
    where: { id: payload.id, householdId: household.id },
    data: {
      name: payload.name,
      description: payload.description,
      room: payload.room,
      status: payload.status,
      estimatedCents: payload.estimatedCents,
      actualCents: payload.actualCents,
      startDate: payload.startDate,
      completionDate: payload.completionDate,
      notes: payload.notes,
      links: payload.links
    }
  });

  revalidatePath("/");
  revalidatePath("/upgrades");
}

export async function deleteUpgradeAction(formData: FormData) {
  const { household } = await requireHousehold();
  const id = z.string().min(1).parse(formData.get("id"));

  await prisma.upgradeProject.deleteMany({ where: { id, householdId: household.id } });

  revalidatePath("/");
  revalidatePath("/upgrades");
}
