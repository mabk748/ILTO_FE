import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Server,
  HeartPulse,
  TrendingUp,
  BookOpen,
  Briefcase,
  Users,
  Shirt,
  MapPin,
  Code2,
  Bell,
  Settings,
  Brain,
  MoreHorizontal,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { useOwnerAuth } from "@/components/providers/owner-auth-context.ts";
import { Button } from "@/components/ui/button.tsx";
import type { DomainName, FinanceCurrency } from "@/lib/api/types.ts";
import { useSettings } from "@/components/providers/settings-context.ts";
import { APP_VERSION } from "@/config/app-version.ts";
import { useFinancePreferences } from "@/components/providers/finance-preferences-context.ts";
import { FINANCE_CURRENCIES } from "@/lib/finance.ts";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet.tsx";

interface NavigationItem {
  label: string;
  icon: React.ElementType;
  path: string;
  domain?: DomainName;
}

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  {
    label: "Projects",
    icon: FolderKanban,
    path: "/projects",
    domain: "projects",
  },
  {
    label: "Infrastructure",
    icon: Server,
    path: "/infrastructure",
    domain: "infrastructure",
  },
  { label: "Health", icon: HeartPulse, path: "/health", domain: "health" },
  {
    label: "Finances",
    icon: TrendingUp,
    path: "/finances",
    domain: "finances",
  },
  { label: "Learning", icon: BookOpen, path: "/learning", domain: "learning" },
  { label: "Work", icon: Briefcase, path: "/work", domain: "work" },
  { label: "Social", icon: Users, path: "/social", domain: "social" },
  {
    label: "Appearance",
    icon: Shirt,
    path: "/appearance",
    domain: "appearance",
  },
  { label: "Logistics", icon: MapPin, path: "/logistics", domain: "logistics" },
] satisfies NavigationItem[];

const extraItems = [
  { label: "Intelligence", icon: Brain, path: "/intelligence" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
  { label: "API Docs", icon: Code2, path: "/api-docs" },
  { label: "Settings", icon: Settings, path: "/settings" },
] satisfies NavigationItem[];

function SidebarLink({
  label,
  icon: Icon,
  path,
}: {
  label: string;
  icon: React.ElementType;
  path: string;
}) {
  const location = useLocation();
  const isActive =
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  return (
    <NavLink
      to={path}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 cursor-pointer relative",
        "border-l-2",
        isActive
          ? "border-primary bg-sidebar-accent text-sidebar-primary-foreground"
          : "border-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function AppLayout() {
  const { owner, logout } = useOwnerAuth();
  const location = useLocation();
  const { settings } = useSettings();
  const {
    currency,
    selectedCurrencies,
    masked,
    setCurrency,
    setSelectedCurrencies,
    setMasked,
  } = useFinancePreferences();
  const visibleNavItems = navItems.filter(
    (item) => !item.domain || settings.domainVisibility[item.domain],
  );
  const bottomNavItems = visibleNavItems.slice(0, 4);
  const mobileMoreItems = [...visibleNavItems.slice(4), ...extraItems];
  const isMoreActive = mobileMoreItems.some(({ path }) =>
    location.pathname.startsWith(path),
  );
  const allCurrenciesSelected =
    selectedCurrencies.length === FINANCE_CURRENCIES.length;
  const currencyFilterLabel =
    selectedCurrencies.length === 0
      ? "No currencies"
      : allCurrenciesSelected
        ? "All currencies"
        : selectedCurrencies.join(", ");

  const toggleCurrency = (nextCurrency: FinanceCurrency) => {
    setSelectedCurrencies(
      selectedCurrencies.includes(nextCurrency)
        ? selectedCurrencies.filter((item) => item !== nextCurrency)
        : FINANCE_CURRENCIES.filter(
            (item) =>
              item === nextCurrency || selectedCurrencies.includes(item),
          ),
    );
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex flex-col w-56 border-r border-sidebar-border bg-sidebar shrink-0">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-sidebar-border">
          <span
            className="text-xl font-bold tracking-tight text-sidebar-foreground"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            ILTO
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
            V{APP_VERSION}
          </span>
        </div>

        {/* Primary nav */}
        <nav className="flex flex-col gap-0.5 px-2 pt-3 flex-1 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <SidebarLink key={item.path} {...item} />
          ))}

          <div className="my-2 border-t border-sidebar-border" />

          {extraItems.map((item) => (
            <SidebarLink key={item.path} {...item} />
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <header className="flex flex-wrap items-center justify-end gap-2 border-b px-4 py-2 text-sm">
          <details className="relative">
            <summary className="flex h-8 cursor-pointer list-none items-center rounded-md border border-border bg-background px-2 text-xs text-muted-foreground">
              Finance: {currencyFilterLabel}
            </summary>
            <div className="absolute right-0 z-50 mt-1 w-56 space-y-3 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md">
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold">
                  Display currencies
                </legend>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    aria-label="All finance currencies"
                    checked={allCurrenciesSelected}
                    onChange={() =>
                      setSelectedCurrencies(
                        allCurrenciesSelected ? [] : [...FINANCE_CURRENCIES],
                      )
                    }
                  />
                  All currencies
                </label>
                {FINANCE_CURRENCIES.map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCurrencies.includes(option)}
                      onChange={() => toggleCurrency(option)}
                    />
                    {option}
                  </label>
                ))}
              </fieldset>
              <label className="block space-y-1 text-xs">
                <span className="font-semibold">New-entry default</span>
                <select
                  aria-label="Default finance entry currency"
                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
                  value={currency}
                  onChange={(event) =>
                    setCurrency(event.target.value as FinanceCurrency)
                  }
                >
                  {FINANCE_CURRENCIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </details>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={masked}
            aria-label={masked ? "Show financial data" : "Mask financial data"}
            onClick={() => setMasked(!masked)}
          >
            {masked ? (
              <Eye className="h-4 w-4 sm:mr-1.5" />
            ) : (
              <EyeOff className="h-4 w-4 sm:mr-1.5" />
            )}
            <span className="hidden sm:inline">
              {masked ? "Show finances" : "Mask finances"}
            </span>
          </Button>
          <span>{owner?.username}</span>
          <Button variant="outline" size="sm" onClick={() => void logout()}>
            Sign out
          </Button>
        </header>
        <Outlet />
      </main>

      {/* Bottom nav — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 flex justify-around items-center border-t border-border bg-sidebar px-2 py-2 md:hidden z-50">
        {bottomNavItems.map(({ label, icon: Icon, path }) => {
          const isActive =
            path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(path);
          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-md cursor-pointer transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          );
        })}
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-md cursor-pointer transition-colors",
                isMoreActive ? "text-primary" : "text-muted-foreground",
              )}
              aria-label="Open more navigation links"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="pb-8">
            <SheetHeader>
              <SheetTitle>Navigate</SheetTitle>
            </SheetHeader>
            <nav className="grid grid-cols-2 gap-2 px-4">
              {mobileMoreItems.map(({ label, icon: Icon, path }) => (
                <SheetClose asChild key={path}>
                  <NavLink
                    to={path}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-md border border-border px-3 py-3 text-sm",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </NavLink>
                </SheetClose>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
