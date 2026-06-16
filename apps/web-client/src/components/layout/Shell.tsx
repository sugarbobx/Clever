"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { useAuth, homeForRole } from "@/stores/auth.store";
import { STAFF_NAV, CLIENT_NAV, type NavItem } from "@/lib/nav";
import { ROLE_LABELS, STAFF_ROLES, CLIENT_ROLES } from "@/lib/types";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { ProfileButton } from "@/components/layout/ProfileButton";
import { cn } from "@/lib/format";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 px-2 py-1">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-extrabold text-white">C</span>
      <span className="text-lg font-extrabold tracking-tight text-white">CLEVER</span>
    </Link>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = (Icons[item.icon as keyof typeof Icons] as React.ComponentType<{ size?: number }>) ?? Icons.Circle;
  const content = (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-primary/15 text-primary" : "text-slate-300 hover:bg-surface-2",
        item.soon && "cursor-not-allowed opacity-50"
      )}
    >
      <Icon size={18} />
      <span className="flex-1">{item.label}</span>
      {item.soon && <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted">bientôt</span>}
    </div>
  );
  if (item.soon) return content;
  return (
    <Link href={item.href} prefetch={false}>
      {content}
    </Link>
  );
}

export function Shell({ area, children }: { area: "staff" | "client"; children: React.ReactNode }) {
  const { user, loading, loadMe, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!user) loadMe();
  }, [user, loadMe]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const isStaff = STAFF_ROLES.includes(user.role);
    if (area === "staff" && !isStaff) router.replace(homeForRole(user.role));
    if (area === "client" && !CLIENT_ROLES.includes(user.role)) router.replace(homeForRole(user.role));
  }, [user, loading, area, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        <Icons.Loader2 className="animate-spin" />
      </div>
    );
  }

  const nav = (area === "staff" ? STAFF_NAV : CLIENT_NAV).filter((i) => i.roles.includes(user.role));

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface/60 p-3 md:flex">
        <Logo />
        <nav className="mt-6 flex flex-col gap-1">
          {nav.map((item) => (
            <NavLink key={item.href} item={item} active={pathname === item.href || pathname.startsWith(item.href + "/")} />
          ))}
        </nav>
        <div className="mt-auto rounded-lg border border-border bg-surface p-3">
          <p className="truncate text-sm font-semibold text-slate-100">{user.name}</p>
          <p className="text-xs text-muted">{ROLE_LABELS[user.role]}</p>
          <button
            onClick={async () => {
              await logout();
              router.replace("/login");
            }}
            className="btn-ghost mt-3 w-full !py-1.5 text-xs"
          >
            <Icons.LogOut size={14} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface/40 px-3 py-2 md:px-6 md:py-3">
          <div className="md:hidden">
            <Logo />
          </div>
          <div className="hidden text-sm text-muted md:block">
            Bienvenue&nbsp;👋
          </div>
          <div className="flex items-center gap-3">
            <NotificationCenter area={area} />
            <ProfileButton />
          </div>
        </header>
        {/* Mobile navigation (sidebar is hidden below md) */}
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-surface/40 px-3 py-2 md:hidden">
          {nav.map((item) => {
            const Icon = (Icons[item.icon as keyof typeof Icons] as React.ComponentType<{ size?: number }>) ?? Icons.Circle;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const cls = cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
              active ? "bg-primary/15 text-primary" : "text-slate-300",
              item.soon && "opacity-50"
            );
            return item.soon ? (
              <span key={item.href} className={cls}>
                <Icon size={15} /> {item.label}
              </span>
            ) : (
              <Link key={item.href} href={item.href} prefetch={false} className={cls}>
                <Icon size={15} /> {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
