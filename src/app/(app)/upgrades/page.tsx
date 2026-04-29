import Link from "next/link";
import { UpgradeStatus } from "@/generated/prisma/enums";
import { ConfirmButton } from "@/components/ConfirmButton";
import { EmptyState } from "@/components/EmptyState";
import { MetricCard } from "@/components/MetricCard";
import { PaginationControls } from "@/components/PaginationControls";
import { StatusPill } from "@/components/StatusPill";
import { createUpgradeAction, deleteUpgradeAction, updateUpgradeAction } from "@/app/(app)/upgrades/actions";
import { formatDate, toDateInputValue } from "@/lib/dates";
import { dollarsFromCents, formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireAdminHousehold } from "@/lib/auth";

const statusLabels: Record<UpgradeStatus, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed"
};

const pageSize = 5;

type UpgradePageProps = {
  searchParams: Promise<{
    activePage?: string;
    completedPage?: string;
    status?: string;
    room?: string;
  }>;
};

export default async function UpgradesPage({ searchParams }: UpgradePageProps) {
  const { household } = await requireAdminHousehold();
  const params = await searchParams;
  const status = Object.values(UpgradeStatus).includes(params.status as UpgradeStatus)
    ? (params.status as UpgradeStatus)
    : undefined;
  const room = params.room || undefined;

  const allProjects = await prisma.upgradeProject.findMany({
    where: { householdId: household.id },
    orderBy: [{ status: "asc" }, { startDate: "asc" }, { name: "asc" }]
  });

  const rooms = [...new Set(allProjects.map((project) => project.room))].sort();
  const projects = allProjects.filter((project) => (!status || project.status === status) && (!room || project.room === room));
  const active = projects.filter((project) => project.status !== UpgradeStatus.COMPLETED);
  const completed = projects.filter((project) => project.status === UpgradeStatus.COMPLETED);
  const activePage = boundedPage(params.activePage, active.length);
  const completedPage = boundedPage(params.completedPage, completed.length);
  const estimatedTotal = allProjects.reduce((sum, project) => sum + (project.estimatedCents || 0), 0);
  const actualTotal = allProjects.reduce((sum, project) => sum + (project.actualCents || 0), 0);
  const variance = actualTotal - estimatedTotal;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Improvements</p>
          <h1>Upgrades</h1>
        </div>
      </header>

      <section className="metric-grid">
        <MetricCard label="Estimated" value={formatMoney(estimatedTotal)} detail="Planned investment" />
        <MetricCard label="Actual" value={formatMoney(actualTotal)} detail="Recorded spending" tone="blue" />
        <MetricCard label="Variance" value={formatMoney(variance)} detail="Actual minus estimated" tone={variance > 0 ? "warn" : "good"} />
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-heading">
            <h2>Add upgrade</h2>
          </div>
          <UpgradeForm action={createUpgradeAction} />
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h2>Filters</h2>
          </div>
          <div className="filter-row">
            <Link className={!status && !room ? "filter-chip active" : "filter-chip"} href="/upgrades">All</Link>
            {Object.entries(statusLabels).map(([value, label]) => (
              <Link className={status === value ? "filter-chip active" : "filter-chip"} href={`/upgrades?status=${value}`} key={value}>
                {label}
              </Link>
            ))}
          </div>
          <div className="filter-row">
            {rooms.map((roomName) => (
              <Link className={room === roomName ? "filter-chip active" : "filter-chip"} href={`/upgrades?room=${encodeURIComponent(roomName)}`} key={roomName}>
                {roomName}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ProjectSection
        currentPage={activePage}
        pageParam="activePage"
        projects={active}
        query={{ completedPage: params.completedPage, room, status }}
        title="Active projects"
      />
      <ProjectSection
        completed
        currentPage={completedPage}
        pageParam="completedPage"
        projects={completed}
        query={{ activePage: params.activePage, room, status }}
        title="Completed projects"
      />
    </div>
  );
}

type ProjectSectionProps = {
  title: string;
  completed?: boolean;
  currentPage: number;
  pageParam: string;
  query: Record<string, string | undefined>;
  projects: Array<{
    id: string;
    name: string;
    description: string | null;
    room: string;
    status: UpgradeStatus;
    estimatedCents: number | null;
    actualCents: number | null;
    startDate: Date | null;
    completionDate: Date | null;
    notes: string | null;
    links: string | null;
  }>;
};

function ProjectSection({ title, projects, completed, currentPage, pageParam, query }: ProjectSectionProps) {
  const pagedProjects = paginate(projects, currentPage);

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{title}</h2>
      </div>
      {projects.length ? (
        <div className="record-list">
          {pagedProjects.map((project) => (
            <article className="record-card" key={project.id}>
              <div className="record-main">
                <div>
                  <strong>{project.name}</strong>
                  <span>{project.room} - {project.description || "No description yet"}</span>
                </div>
                <div className="record-meta">
                  <strong>{formatMoney(project.actualCents ?? project.estimatedCents)}</strong>
                  <StatusPill tone={project.status === UpgradeStatus.COMPLETED ? "good" : project.status === UpgradeStatus.IN_PROGRESS ? "blue" : "neutral"}>
                    {statusLabels[project.status]}
                  </StatusPill>
                </div>
              </div>
              <p className="muted-line">
                Estimate {formatMoney(project.estimatedCents)} - Actual {formatMoney(project.actualCents)} - {formatDate(project.startDate)} to {formatDate(project.completionDate)}
              </p>
              <div className="record-actions">
                <details>
                  <summary className="secondary-button">Edit</summary>
                  <UpgradeForm action={updateUpgradeAction} project={project} />
                </details>
                <form action={deleteUpgradeAction}>
                  <input type="hidden" name="id" value={project.id} />
                  <ConfirmButton className="danger-button" message={`Delete ${project.name}?`}>Delete</ConfirmButton>
                </form>
              </div>
            </article>
          ))}
          <PaginationControls
            basePath="/upgrades"
            currentPage={currentPage}
            pageParam={pageParam}
            pageSize={pageSize}
            query={query}
            totalItems={projects.length}
            totalPages={pageCount(projects.length)}
          />
        </div>
      ) : (
        <EmptyState
          title={completed ? "No completed projects yet" : "No active projects"}
          description={completed ? "Finished upgrades will collect here." : "Add a planned or in-progress upgrade to track costs and notes."}
        />
      )}
    </section>
  );
}

function pageCount(totalItems: number) {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

function boundedPage(value: string | undefined, totalItems: number) {
  const parsed = Number.parseInt(value || "1", 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  return Math.min(page, pageCount(totalItems));
}

function paginate<T>(items: T[], page: number) {
  return items.slice((page - 1) * pageSize, page * pageSize);
}

type UpgradeFormProps = {
  action: (formData: FormData) => Promise<void>;
  project?: ProjectSectionProps["projects"][number];
};

function UpgradeForm({ action, project }: UpgradeFormProps) {
  return (
    <form action={action} className="grid-form">
      {project ? <input type="hidden" name="id" value={project.id} /> : null}
      <label>
        Project name
        <input name="name" defaultValue={project?.name} placeholder="Paint the guest room" required maxLength={100} />
      </label>
      <label>
        Room or area
        <input name="room" defaultValue={project?.room} placeholder="Kitchen" required maxLength={60} />
      </label>
      <label>
        Status
        <select name="status" defaultValue={project?.status || UpgradeStatus.PLANNED}>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option value={value} key={value}>{label}</option>
          ))}
        </select>
      </label>
      <label>
        Estimated cost
        <input name="estimatedCost" type="number" min="0.01" step="0.01" defaultValue={dollarsFromCents(project?.estimatedCents)} />
      </label>
      <label>
        Actual cost
        <input name="actualCost" type="number" min="0.01" step="0.01" defaultValue={dollarsFromCents(project?.actualCents)} />
      </label>
      <label>
        Start date
        <input name="startDate" type="date" defaultValue={toDateInputValue(project?.startDate)} />
      </label>
      <label>
        Completion date
        <input name="completionDate" type="date" defaultValue={toDateInputValue(project?.completionDate)} />
      </label>
      <label className="full-span">
        Description
        <textarea name="description" defaultValue={project?.description || ""} rows={3} maxLength={800} />
      </label>
      <label className="full-span">
        Notes
        <textarea name="notes" defaultValue={project?.notes || ""} rows={3} maxLength={1200} />
      </label>
      <label className="full-span">
        Links/photos placeholder
        <textarea name="links" defaultValue={project?.links || ""} rows={2} maxLength={800} placeholder="Paste links for quotes, inspiration, or future photos." />
      </label>
      <button className="primary-button">{project ? "Save upgrade" : "Add upgrade"}</button>
    </form>
  );
}
