import { UserRound } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import { requireHousehold } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const { household } = await requireHousehold();
  const members = await prisma.householdMember.findMany({
    where: { householdId: household.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          avatarColor: true
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Private household</p>
          <h1>Settings</h1>
        </div>
      </header>

      <section className="settings-grid">
        <div className="panel">
          <div className="panel-heading">
            <h2>Household</h2>
          </div>
          <dl className="definition-list">
            <div>
              <dt>Name</dt>
              <dd>{household.name}</dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>{household.address || "Not set"}</dd>
            </div>
          </dl>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h2>People</h2>
          </div>
          <div className="member-list">
            {members.map((member) => (
              <article className="member-row" key={member.id}>
                <div className="avatar" style={{ backgroundColor: member.user.avatarColor }}>
                  <UserRound size={18} aria-hidden="true" />
                </div>
                <div>
                  <strong>{member.user.name}</strong>
                  <span>{member.user.username} - {member.user.email}</span>
                </div>
                <StatusPill tone={member.role === "OWNER" ? "blue" : "neutral"}>{member.role.toLowerCase()}</StatusPill>
              </article>
            ))}
          </div>
        </div>

        <div className="panel wide-panel">
          <div className="panel-heading">
            <h2>Deployment</h2>
          </div>
          <p className="settings-copy">
            Configure Railway with `DATABASE_URL`, seed passwords, and the session cookie settings from the README. Seed data is run manually so production deploys never reset household data.
          </p>
        </div>
      </section>
    </div>
  );
}
