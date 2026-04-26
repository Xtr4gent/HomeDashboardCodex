import Link from "next/link";
import { ArrowRight, CircleDollarSign, Hammer, Wrench } from "lucide-react";
import { HouseholdRole } from "@/generated/prisma/enums";
import { EmptyState } from "@/components/EmptyState";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { getDashboardData } from "@/lib/dashboard";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { requireHousehold } from "@/lib/auth";

export default async function DashboardPage() {
  const { household, membership } = await requireHousehold();
  const data = await getDashboardData(household.id);
  const isAdmin = membership.role === HouseholdRole.OWNER;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{isAdmin ? "Today at home" : "Home overview"}</p>
          <h1>{isAdmin ? "Dashboard" : "Overview"}</h1>
        </div>
      </header>

      <section className="metric-grid">
        <MetricCard label="Monthly home costs" value={formatMoney(data.monthlyTotal)} detail="Due this month" />
        <MetricCard label="Paid" value={formatMoney(data.paidTotal)} detail="Cleared for the month" tone="good" />
        <MetricCard label="Unpaid" value={formatMoney(data.unpaidTotal)} detail="Still open" tone={data.unpaidTotal > 0 ? "warn" : "good"} />
        <MetricCard label="Overdue tasks" value={String(data.overdueMaintenance.length)} detail="Maintenance needs attention" tone={data.overdueMaintenance.length ? "danger" : "good"} />
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <CircleDollarSign size={18} />
              <h2>Budget snapshot</h2>
            </div>
            {isAdmin ? <Link href="/budget" className="text-link">Review <ArrowRight size={15} /></Link> : <span className="text-link muted-action">View only</span>}
          </div>
          {data.monthExpenses.length ? (
            <div className="compact-list">
              {data.monthExpenses.slice(0, 5).map((expense) => (
                <div className="compact-row" key={expense.id}>
                  <div>
                    <strong>{expense.name}</strong>
                    <span>{formatDate(expense.dueDate)}</span>
                  </div>
                  <div className="row-end">
                    <strong>{formatMoney(expense.amountCents)}</strong>
                    <StatusPill tone={expense.isPaid ? "good" : "warn"}>{expense.isPaid ? "Paid" : "Unpaid"}</StatusPill>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No expenses this month" description="Add monthly costs to start tracking your home budget." />
          )}
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <Wrench size={18} />
              <h2>Upcoming maintenance</h2>
            </div>
            {isAdmin ? <Link href="/maintenance" className="text-link">Open <ArrowRight size={15} /></Link> : <span className="text-link muted-action">View only</span>}
          </div>
          {[...data.overdueMaintenance, ...data.upcomingMaintenance].length ? (
            <div className="compact-list">
              {[...data.overdueMaintenance, ...data.upcomingMaintenance].slice(0, 6).map((task) => (
                <div className="compact-row" key={task.id}>
                  <div>
                    <strong>{task.name}</strong>
                    <span>{task.category} - {formatDate(task.nextDueDate)}</span>
                  </div>
                  <StatusPill tone={task.status === "OVERDUE" ? "danger" : task.status === "DUE_SOON" ? "warn" : "neutral"}>
                    {task.status.replace("_", " ").toLowerCase()}
                  </StatusPill>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Nothing pressing" description="Maintenance tasks will appear here as due dates get closer." />
          )}
        </div>

        <div className="panel wide-panel">
          <div className="panel-heading">
            <div>
              <Hammer size={18} />
              <h2>Active upgrades</h2>
            </div>
            {isAdmin ? <Link href="/upgrades" className="text-link">Manage <ArrowRight size={15} /></Link> : <span className="text-link muted-action">View only</span>}
          </div>
          {data.activeUpgrades.length ? (
            <div className="project-strip">
              {data.activeUpgrades.map((project) => (
                <article key={project.id} className="project-card">
                  <span>{project.room}</span>
                  <strong>{project.name}</strong>
                  <p>{project.description || "No description yet."}</p>
                  <div>
                    <StatusPill tone={project.status === "IN_PROGRESS" ? "blue" : "neutral"}>
                      {project.status.replace("_", " ").toLowerCase()}
                    </StatusPill>
                    <strong>{formatMoney(project.actualCents ?? project.estimatedCents)}</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No active upgrades" description="Planned and in-progress projects will show up here." />
          )}
        </div>
      </section>
    </div>
  );
}
