import { AppShell } from "@/components/AppShell";
import { requireHousehold } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, household } = await requireHousehold();

  return <AppShell user={user} householdName={household.name}>{children}</AppShell>;
}
