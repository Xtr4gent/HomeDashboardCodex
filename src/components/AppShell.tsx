import Link from "next/link";
import { LayoutDashboard, WalletCards, Hammer, Wrench, Settings, LogOut } from "lucide-react";
import { HouseholdRole } from "@/generated/prisma/enums";
import type { AuthUser } from "@/lib/auth";
import { logoutAction } from "@/app/(app)/actions";
import { ThemeToggle } from "@/components/ThemeToggle";

const adminNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/budget", label: "Budget", icon: WalletCards },
  { href: "/upgrades", label: "Upgrades", icon: Hammer },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/settings", label: "Settings", icon: Settings }
];

const memberNavItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/settings", label: "Settings", icon: Settings }
];

type AppShellProps = {
  user: AuthUser;
  householdName: string;
  role: HouseholdRole;
  children: React.ReactNode;
};

export function AppShell({ user, householdName, role, children }: AppShellProps) {
  const navItems = role === HouseholdRole.OWNER ? adminNavItems : memberNavItems;

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-block">
          <div className="brand-mark">HD</div>
          <div>
            <p className="eyebrow">Home Dashboard</p>
            <strong>{householdName}</strong>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link href={item.href} key={item.href} className="nav-link">
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="user-panel">
          <div className="avatar" style={{ backgroundColor: user.avatarColor }}>
            {user.name.slice(0, 1)}
          </div>
          <div>
            <strong>{user.name}</strong>
            <span>{role === HouseholdRole.OWNER ? "Admin" : "Overview"} - {user.username}</span>
          </div>
          <ThemeToggle />
          <form action={logoutAction}>
            <button className="icon-button" title="Sign out" aria-label="Sign out">
              <LogOut size={18} aria-hidden="true" />
            </button>
          </form>
        </div>
      </aside>

      <main className="main-content">{children}</main>

      <div className="mobile-theme-toggle">
        <ThemeToggle />
      </div>

      <nav className="mobile-tabs" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link href={item.href} key={item.href} className="mobile-tab">
              <Icon size={20} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
