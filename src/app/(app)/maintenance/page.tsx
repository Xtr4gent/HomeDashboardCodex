import { MaintenanceFrequency, MaintenancePriority, MaintenanceStatus } from "@/generated/prisma/enums";
import { ConfirmButton } from "@/components/ConfirmButton";
import { EmptyState } from "@/components/EmptyState";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import {
  completeMaintenanceAction,
  createMaintenanceAction,
  deleteMaintenanceAction,
  updateMaintenanceAction
} from "@/app/(app)/maintenance/actions";
import { formatDate, toDateInputValue } from "@/lib/dates";
import { syncMaintenanceStatuses } from "@/lib/maintenance";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";

const frequencyLabels: Record<MaintenanceFrequency, string> = {
  ONE_TIME: "One-time",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  SEMI_ANNUALLY: "Semi-annually",
  ANNUALLY: "Annually"
};

const priorityLabels: Record<MaintenancePriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High"
};

const statusTone: Record<MaintenanceStatus, "neutral" | "good" | "warn" | "danger"> = {
  UPCOMING: "neutral",
  DUE_SOON: "warn",
  OVERDUE: "danger",
  COMPLETED: "good"
};

export default async function MaintenancePage() {
  const { household } = await requireHousehold();
  await syncMaintenanceStatuses(household.id);
  const tasks = await prisma.maintenanceTask.findMany({
    where: { householdId: household.id },
    orderBy: [{ status: "desc" }, { nextDueDate: "asc" }, { priority: "desc" }]
  });

  const overdue = tasks.filter((task) => task.status === MaintenanceStatus.OVERDUE);
  const dueSoon = tasks.filter((task) => task.status === MaintenanceStatus.DUE_SOON);
  const completed = tasks.filter((task) => task.status === MaintenanceStatus.COMPLETED);
  const active = tasks.filter((task) => task.status !== MaintenanceStatus.COMPLETED);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Care schedule</p>
          <h1>Maintenance</h1>
        </div>
      </header>

      <section className="metric-grid">
        <MetricCard label="Active tasks" value={String(active.length)} detail="Open maintenance items" />
        <MetricCard label="Due soon" value={String(dueSoon.length)} detail="Due in the next 14 days" tone={dueSoon.length ? "warn" : "good"} />
        <MetricCard label="Overdue" value={String(overdue.length)} detail="Needs attention" tone={overdue.length ? "danger" : "good"} />
        <MetricCard label="Completed" value={String(completed.length)} detail="Finished one-time tasks" tone="good" />
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-heading">
            <h2>Add maintenance task</h2>
          </div>
          <MaintenanceForm action={createMaintenanceAction} />
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h2>Attention</h2>
          </div>
          {[...overdue, ...dueSoon].length ? (
            <div className="compact-list">
              {[...overdue, ...dueSoon].map((task) => (
                <div className="compact-row" key={task.id}>
                  <div>
                    <strong>{task.name}</strong>
                    <span>{task.category} - Due {formatDate(task.nextDueDate)}</span>
                  </div>
                  <StatusPill tone={statusTone[task.status]}>{task.status.replace("_", " ").toLowerCase()}</StatusPill>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Nothing urgent" description="Due-soon and overdue maintenance will collect here." />
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Maintenance tasks</h2>
        </div>
        {tasks.length ? (
          <div className="record-list">
            {tasks.map((task) => (
              <article className="record-card" key={task.id}>
                <div className="record-main">
                  <div>
                    <strong>{task.name}</strong>
                    <span>{task.category} - {frequencyLabels[task.frequency]} - Next due {formatDate(task.nextDueDate)}</span>
                  </div>
                  <div className="record-meta">
                    <StatusPill tone={task.priority === MaintenancePriority.HIGH ? "danger" : task.priority === MaintenancePriority.MEDIUM ? "warn" : "neutral"}>
                      {priorityLabels[task.priority]}
                    </StatusPill>
                    <StatusPill tone={statusTone[task.status]}>{task.status.replace("_", " ").toLowerCase()}</StatusPill>
                  </div>
                </div>
                <p className="muted-line">
                  Last completed {formatDate(task.lastCompletedDate)} - {task.description || "No description yet"}
                </p>
                <div className="record-actions">
                  <form action={completeMaintenanceAction}>
                    <input type="hidden" name="id" value={task.id} />
                    <button className="secondary-button">Mark complete</button>
                  </form>
                  <details>
                    <summary className="secondary-button">Edit</summary>
                    <MaintenanceForm action={updateMaintenanceAction} task={task} />
                  </details>
                  <form action={deleteMaintenanceAction}>
                    <input type="hidden" name="id" value={task.id} />
                    <ConfirmButton className="danger-button" message={`Delete ${task.name}?`}>Delete</ConfirmButton>
                  </form>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No maintenance yet" description="Add filters, HVAC checks, smoke detector batteries, or seasonal tasks." />
        )}
      </section>
    </div>
  );
}

type MaintenanceFormProps = {
  action: (formData: FormData) => Promise<void>;
  task?: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    frequency: MaintenanceFrequency;
    lastCompletedDate: Date | null;
    nextDueDate: Date | null;
    priority: MaintenancePriority;
    notes: string | null;
  };
};

function MaintenanceForm({ action, task }: MaintenanceFormProps) {
  return (
    <form action={action} className="grid-form">
      {task ? <input type="hidden" name="id" value={task.id} /> : null}
      <label>
        Task name
        <input name="name" defaultValue={task?.name} placeholder="Replace HVAC filter" required maxLength={100} />
      </label>
      <label>
        Category
        <input name="category" defaultValue={task?.category} placeholder="HVAC" required maxLength={60} />
      </label>
      <label>
        Frequency
        <select name="frequency" defaultValue={task?.frequency || MaintenanceFrequency.QUARTERLY}>
          {Object.entries(frequencyLabels).map(([value, label]) => (
            <option value={value} key={value}>{label}</option>
          ))}
        </select>
      </label>
      <label>
        Priority
        <select name="priority" defaultValue={task?.priority || MaintenancePriority.MEDIUM}>
          {Object.entries(priorityLabels).map(([value, label]) => (
            <option value={value} key={value}>{label}</option>
          ))}
        </select>
      </label>
      <label>
        Last completed
        <input name="lastCompletedDate" type="date" defaultValue={toDateInputValue(task?.lastCompletedDate)} />
      </label>
      <label>
        Next due
        <input name="nextDueDate" type="date" defaultValue={toDateInputValue(task?.nextDueDate)} />
      </label>
      <label className="full-span">
        Description
        <textarea name="description" defaultValue={task?.description || ""} rows={3} maxLength={800} />
      </label>
      <label className="full-span">
        Notes
        <textarea name="notes" defaultValue={task?.notes || ""} rows={3} maxLength={1200} />
      </label>
      <button className="primary-button">{task ? "Save task" : "Add task"}</button>
    </form>
  );
}
