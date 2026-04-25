import { ExpenseCategory } from "@/generated/prisma/enums";
import { ConfirmButton } from "@/components/ConfirmButton";
import { EmptyState } from "@/components/EmptyState";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { createExpenseAction, deleteExpenseAction, toggleExpensePaidAction, updateExpenseAction } from "@/app/(app)/budget/actions";
import { formatDate, toDateInputValue, todayDate } from "@/lib/dates";
import { dollarsFromCents, formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";

const categoryLabels: Record<ExpenseCategory, string> = {
  MORTGAGE: "Mortgage",
  UTILITIES: "Utilities",
  INTERNET: "Internet",
  INSURANCE: "Insurance",
  PROPERTY_TAX: "Property tax",
  REPAIRS: "Repairs",
  SUBSCRIPTIONS: "Subscriptions/services",
  CUSTOM: "Custom"
};

export default async function BudgetPage() {
  const { household } = await requireHousehold();
  const today = todayDate();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
  const sixMonthsAgo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));

  const expenses = await prisma.budgetExpense.findMany({
    where: { householdId: household.id },
    orderBy: [{ dueDate: "asc" }, { name: "asc" }]
  });

  const currentMonth = expenses.filter((expense) => expense.dueDate >= monthStart && expense.dueDate < nextMonthStart);
  const monthlyTotal = currentMonth.reduce((sum, expense) => sum + expense.amountCents, 0);
  const paidTotal = currentMonth.filter((expense) => expense.isPaid).reduce((sum, expense) => sum + expense.amountCents, 0);
  const unpaidTotal = monthlyTotal - paidTotal;
  const paidExpensesForHistory = expenses.filter((expense) => expense.isPaid);
  const history = paidExpensesForHistory
    .filter((expense) => (expense.paidDate ?? expense.dueDate) >= sixMonthsAgo)
    .reduce<Record<string, number>>((months, expense) => {
      const key = (expense.paidDate ?? expense.dueDate).toISOString().slice(0, 7);
      months[key] = (months[key] || 0) + expense.amountCents;
      return months;
    }, {});
  const maxHistory = Math.max(...Object.values(history), 1);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Home budget</p>
          <h1>Budget</h1>
        </div>
      </header>

      <section className="metric-grid">
        <MetricCard label="This month" value={formatMoney(monthlyTotal)} detail={`${currentMonth.length} expenses`} />
        <MetricCard label="Paid" value={formatMoney(paidTotal)} detail="Completed payments" tone="good" />
        <MetricCard label="Unpaid" value={formatMoney(unpaidTotal)} detail="Remaining this month" tone={unpaidTotal > 0 ? "warn" : "good"} />
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-heading">
            <h2>Add monthly expense</h2>
          </div>
          <ExpenseForm action={createExpenseAction} />
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h2>Spending history</h2>
          </div>
          {Object.keys(history).length ? (
            <div className="bar-chart" aria-label="Historical monthly spending">
              {Object.entries(history).map(([month, amount]) => (
                <div className="bar-row" key={month}>
                  <span>{month}</span>
                  <div><i style={{ width: `${Math.max((amount / maxHistory) * 100, 6)}%` }} /></div>
                  <strong>{formatMoney(amount)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No spending history" description="Historical totals appear once expenses are marked paid." />
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Expenses</h2>
        </div>
        {expenses.length ? (
          <div className="record-list">
            {expenses.map((expense) => (
              <article className="record-card" key={expense.id}>
                <div className="record-main">
                  <div>
                    <strong>{expense.name}</strong>
                    <span>{categoryLabels[expense.category]} - Due {formatDate(expense.dueDate)}</span>
                  </div>
                  <div className="record-meta">
                    <strong>{formatMoney(expense.amountCents)}</strong>
                    <StatusPill tone={expense.isPaid ? "good" : "warn"}>{expense.isPaid ? "Paid" : "Unpaid"}</StatusPill>
                  </div>
                </div>

                <div className="record-actions">
                  <form action={toggleExpensePaidAction}>
                    <input type="hidden" name="id" value={expense.id} />
                    <button className="secondary-button">{expense.isPaid ? "Mark unpaid" : "Mark paid"}</button>
                  </form>
                  <details>
                    <summary className="secondary-button">Edit</summary>
                    <ExpenseForm action={updateExpenseAction} expense={expense} />
                  </details>
                  <form action={deleteExpenseAction}>
                    <input type="hidden" name="id" value={expense.id} />
                    <ConfirmButton className="danger-button" message={`Delete ${expense.name}?`}>Delete</ConfirmButton>
                  </form>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No expenses yet" description="Add the first mortgage, utility, or service cost to begin." />
        )}
      </section>
    </div>
  );
}

type ExpenseFormProps = {
  action: (formData: FormData) => Promise<void>;
  expense?: {
    id: string;
    name: string;
    category: ExpenseCategory;
    customCategory: string | null;
    amountCents: number;
    dueDate: Date;
    isRecurring: boolean;
    notes: string | null;
  };
};

function ExpenseForm({ action, expense }: ExpenseFormProps) {
  return (
    <form action={action} className="grid-form">
      {expense ? <input type="hidden" name="id" value={expense.id} /> : null}
      <label>
        Name
        <input name="name" defaultValue={expense?.name} placeholder="Mortgage payment" required maxLength={80} />
      </label>
      <label>
        Category
        <select name="category" defaultValue={expense?.category || ExpenseCategory.MORTGAGE}>
          {Object.entries(categoryLabels).map(([value, label]) => (
            <option value={value} key={value}>{label}</option>
          ))}
        </select>
      </label>
      <label>
        Custom category
        <input name="customCategory" defaultValue={expense?.customCategory || ""} placeholder="Optional" maxLength={40} />
      </label>
      <label>
        Amount
        <input name="amount" type="number" min="0.01" step="0.01" defaultValue={dollarsFromCents(expense?.amountCents)} required />
      </label>
      <label>
        Due date
        <input name="dueDate" type="date" defaultValue={toDateInputValue(expense?.dueDate)} required />
      </label>
      <label className="checkbox-label">
        <input name="isRecurring" type="checkbox" defaultChecked={expense?.isRecurring} />
        Recurring monthly
      </label>
      <label className="full-span">
        Notes
        <textarea name="notes" defaultValue={expense?.notes || ""} rows={3} maxLength={500} />
      </label>
      <button className="primary-button">{expense ? "Save expense" : "Add expense"}</button>
    </form>
  );
}
