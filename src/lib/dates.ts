import {
  MaintenanceFrequency,
  MaintenanceStatus
} from "@/generated/prisma/enums";

const DAY_MS = 24 * 60 * 60 * 1000;

export function todayDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function parseDateInput(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

export function toDateInputValue(date?: Date | null): string {
  if (!date) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function formatDate(date?: Date | null): string {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

export function addMonths(date: Date, months: number): Date {
  const day = date.getUTCDate();
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function nextDueFromFrequency(
  completedAt: Date,
  frequency: MaintenanceFrequency
): Date | null {
  switch (frequency) {
    case MaintenanceFrequency.ONE_TIME:
      return null;
    case MaintenanceFrequency.MONTHLY:
      return addMonths(completedAt, 1);
    case MaintenanceFrequency.QUARTERLY:
      return addMonths(completedAt, 3);
    case MaintenanceFrequency.SEMI_ANNUALLY:
      return addMonths(completedAt, 6);
    case MaintenanceFrequency.ANNUALLY:
      return addMonths(completedAt, 12);
  }
}

export function deriveMaintenanceStatus(
  nextDueDate: Date | null,
  frequency: MaintenanceFrequency,
  completed = false
): MaintenanceStatus {
  if (completed && frequency === MaintenanceFrequency.ONE_TIME) {
    return MaintenanceStatus.COMPLETED;
  }

  if (!nextDueDate) {
    return MaintenanceStatus.UPCOMING;
  }

  const today = todayDate();
  const diffDays = Math.floor((nextDueDate.getTime() - today.getTime()) / DAY_MS);

  if (diffDays < 0) {
    return MaintenanceStatus.OVERDUE;
  }

  if (diffDays <= 14) {
    return MaintenanceStatus.DUE_SOON;
  }

  return MaintenanceStatus.UPCOMING;
}
