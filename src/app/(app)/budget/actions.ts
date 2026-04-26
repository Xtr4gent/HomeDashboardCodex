"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ExpenseCategory } from "@/generated/prisma/enums";
import { requireAdminHousehold } from "@/lib/auth";
import { addMonths, parseDateInput, todayDate } from "@/lib/dates";
import { centsFromFormValue } from "@/lib/money";
import { prisma } from "@/lib/prisma";

const expenseSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(80),
  category: z.nativeEnum(ExpenseCategory),
  customCategory: z.string().trim().max(40).optional(),
  amountCents: z.number().int().positive(),
  dueDate: z.date(),
  isRecurring: z.boolean(),
  notes: z.string().trim().max(500).optional()
});

function expensePayload(formData: FormData) {
  const amountCents = centsFromFormValue(formData.get("amount"));
  const dueDate = parseDateInput(formData.get("dueDate"));

  return expenseSchema.parse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    category: formData.get("category"),
    customCategory: formData.get("customCategory") || undefined,
    amountCents,
    dueDate,
    isRecurring: formData.get("isRecurring") === "on",
    notes: formData.get("notes") || undefined
  });
}

function refreshBudgetPage(): never {
  revalidatePath("/");
  revalidatePath("/budget");
  redirect("/budget");
}

export async function createExpenseAction(formData: FormData) {
  const { user, household } = await requireAdminHousehold();
  const payload = expensePayload(formData);

  await prisma.budgetExpense.create({
    data: {
      householdId: household.id,
      createdById: user.id,
      name: payload.name,
      category: payload.category,
      customCategory: payload.customCategory,
      amountCents: payload.amountCents,
      dueDate: payload.dueDate,
      isRecurring: payload.isRecurring,
      notes: payload.notes
    }
  });

  refreshBudgetPage();
}

export async function updateExpenseAction(formData: FormData) {
  const { household } = await requireAdminHousehold();
  const payload = expensePayload(formData);

  if (!payload.id) {
    throw new Error("Expense id is required.");
  }

  const result = await prisma.budgetExpense.updateMany({
    where: { id: payload.id, householdId: household.id },
    data: {
      name: payload.name,
      category: payload.category,
      customCategory: payload.customCategory,
      amountCents: payload.amountCents,
      dueDate: payload.dueDate,
      isRecurring: payload.isRecurring,
      notes: payload.notes
    }
  });

  if (result.count === 0) {
    throw new Error("Expense not found.");
  }

  refreshBudgetPage();
}

export async function deleteExpenseAction(formData: FormData) {
  const { household } = await requireAdminHousehold();
  const id = z.string().min(1).parse(formData.get("id"));

  const result = await prisma.budgetExpense.deleteMany({ where: { id, householdId: household.id } });

  if (result.count === 0) {
    throw new Error("Expense not found.");
  }

  refreshBudgetPage();
}

export async function toggleExpensePaidAction(formData: FormData) {
  const { user, household } = await requireAdminHousehold();
  const id = z.string().min(1).parse(formData.get("id"));
  const expense = await prisma.budgetExpense.findFirst({
    where: { id, householdId: household.id }
  });

  if (!expense) {
    throw new Error("Expense not found.");
  }

  const nextPaidState = !expense.isPaid;
  const paidDate = nextPaidState ? todayDate() : null;

  await prisma.budgetExpense.update({
    where: { id: expense.id },
    data: { isPaid: nextPaidState, paidDate }
  });

  if (nextPaidState && expense.isRecurring) {
    const nextDueDate = addMonths(expense.dueDate, 1);
    const duplicate = await prisma.budgetExpense.findFirst({
      where: {
        householdId: household.id,
        name: expense.name,
        category: expense.category,
        dueDate: nextDueDate
      }
    });

    if (!duplicate) {
      await prisma.budgetExpense.create({
        data: {
          householdId: household.id,
          createdById: user.id,
          name: expense.name,
          category: expense.category,
          customCategory: expense.customCategory,
          amountCents: expense.amountCents,
          dueDate: nextDueDate,
          isRecurring: true,
          notes: expense.notes
        }
      });
    }
  }

  refreshBudgetPage();
}
