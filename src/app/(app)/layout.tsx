import { AppShell } from "@/components/AppShell";
import { requireHousehold } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireHousehold();
  const { user, household } = auth;

  return (
    <AppShell user={user} householdName={household.name} role={auth.membership.role}>
      {children}
    </AppShell>
  );
}
