import {
  useEffect,
  useState,
  type ElementType,
  type ReactElement,
} from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Bell,
  BookOpen,
  Brain,
  Briefcase,
  CalendarDays,
  ChevronRight,
  Code2,
  Eye,
  EyeOff,
  FolderKanban,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Server,
  Settings,
  Shirt,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import { useFinancePreferences } from "@/components/providers/finance-preferences-context.ts";
import { useOwnerAuth } from "@/components/providers/owner-auth-context.ts";
import { useSettings } from "@/components/providers/settings-context.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { APP_VERSION } from "@/config/app-version.ts";
import { FINANCE_CURRENCIES } from "@/lib/finance.ts";
import type { DomainName, FinanceCurrency } from "@/lib/api/types.ts";
import { cn } from "@/lib/utils.ts";

interface NavigationItem {
  label: string;
  icon: ElementType;
  path: string;
  domain?: DomainName;
}

const SIDEBAR_COLLAPSED_STORAGE_KEY = "ilto_sidebar_collapsed";

const coreNavItems = [
  { label: "Horizon", icon: CalendarDays, path: "/horizon" },
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  {
    label: "Projects",
    icon: FolderKanban,
    path: "/projects",
    domain: "projects",
  },
] satisfies NavigationItem[];

const moduleNavItems = [
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

const systemNavItems = [
  { label: "Intelligence", icon: Brain, path: "/intelligence" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
  { label: "API Docs", icon: Code2, path: "/api-docs" },
] satisfies NavigationItem[];

const settingsItem = {
  label: "Settings",
  icon: Settings,
  path: "/settings",
} satisfies NavigationItem;

function loadSidebarPreference() {
  if (typeof window === "undefined") return false;

  try {
    return (
      window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true"
    );
  } catch {
    return false;
  }
}

function isPathActive(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function SidebarLink({
  label,
  icon: Icon,
  path,
  collapsed = false,
  onNavigate,
}: NavigationItem & { collapsed?: boolean; onNavigate?: () => void }) {
  const location = useLocation();
  const isActive = isPathActive(location.pathname, path);
  const link = (
    <NavLink
      to={path}
      onClick={onNavigate}
      aria-label={collapsed ? label : undefined}
      className={cn(
        "group relative flex min-h-10 items-center gap-3 rounded-lg border border-transparent px-3 text-sm font-medium transition-[color,background-color,border-color] focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none",
        collapsed && "justify-center px-0",
        isActive
          ? "border-sidebar-primary/20 bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/68 hover:bg-sidebar-accent/65 hover:text-sidebar-accent-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-2 left-0 w-0.5 rounded-full bg-sidebar-primary opacity-0 transition-opacity",
          isActive && "opacity-100",
        )}
      />
      <Icon
        className={cn(
          "size-[1.125rem] shrink-0 transition-colors",
          isActive && "text-sidebar-primary",
        )}
      />
      <span className={cn("truncate", collapsed && "sr-only")}>{label}</span>
    </NavLink>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function SidebarSection({
  label,
  items,
  collapsed,
}: {
  label: string;
  items: NavigationItem[];
  collapsed: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      <p
        className={cn(
          "px-3 pb-1 pt-2 text-[0.65rem] font-semibold tracking-[0.16em] text-sidebar-foreground/38 uppercase",
          collapsed && "sr-only",
        )}
      >
        {label}
      </p>
      {items.map((item) => (
        <SidebarLink key={item.path} {...item} collapsed={collapsed} />
      ))}
    </div>
  );
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      to="/horizon"
      aria-label="ILTO home"
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none",
        collapsed && "justify-center",
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 font-mono text-xs font-bold tracking-tight text-primary shadow-[inset_0_0_18px_color-mix(in_srgb,var(--primary)_8%,transparent)]">
        IL
      </span>
      <span className={cn("min-w-0", collapsed && "sr-only")}>
        <span className="block font-mono text-base font-bold tracking-[0.12em] text-sidebar-foreground">
          ILTO
        </span>
        <span className="block truncate text-[0.65rem] tracking-[0.12em] text-sidebar-foreground/46 uppercase">
          Personal OS · V{APP_VERSION}
        </span>
      </span>
    </Link>
  );
}

function RouteContext({ pathname }: { pathname: string }) {
  let title = "ILTO";
  let parent: { label: string; path: string } | undefined;

  if (pathname.startsWith("/projects/") && pathname !== "/projects") {
    title = "Project workspace";
    parent = { label: "Projects", path: "/projects" };
  } else if (pathname.startsWith("/learning/goals/")) {
    title = "Learning goal";
    parent = { label: "Learning", path: "/learning" };
  } else {
    const item = [...coreNavItems, ...moduleNavItems, ...systemNavItems].find(
      (candidate) => isPathActive(pathname, candidate.path),
    );
    title = item?.label ?? title;
  }

  return (
    <div className="min-w-0">
      <p className="truncate font-mono text-sm font-semibold tracking-wide text-foreground sm:text-base">
        {title}
      </p>
      <nav
        aria-label="Breadcrumb"
        className="hidden items-center gap-1 text-[0.68rem] text-muted-foreground sm:flex"
      >
        <Link to="/horizon" className="transition-colors hover:text-primary">
          ILTO
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        {parent && (
          <>
            <Link
              to={parent.path}
              className="transition-colors hover:text-primary"
            >
              {parent.label}
            </Link>
            <ChevronRight className="size-3" aria-hidden="true" />
          </>
        )}
        <span aria-current="page" className="truncate text-foreground/72">
          {title}
        </span>
      </nav>
    </div>
  );
}

function HeaderActionTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    loadSidebarPreference,
  );
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SIDEBAR_COLLAPSED_STORAGE_KEY,
        String(sidebarCollapsed),
      );
    } catch {
      // The preference is optional when storage is unavailable.
    }
  }, [sidebarCollapsed]);

  const visibleCoreItems = coreNavItems.filter(
    (item) => !item.domain || settings.domainVisibility[item.domain],
  );
  const visibleModuleItems = moduleNavItems.filter(
    (item) => !item.domain || settings.domainVisibility[item.domain],
  );
  const visibleNavItems = [...visibleCoreItems, ...visibleModuleItems];
  const bottomNavItems = visibleNavItems.slice(0, 4);
  const secondaryMobileItems = [
    ...visibleNavItems.slice(4),
    ...systemNavItems,
    settingsItem,
  ];
  const isMoreActive = secondaryMobileItems.some(({ path }) =>
    isPathActive(location.pathname, path),
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
    <div className="flex h-dvh min-h-0 overflow-hidden bg-background">
      <aside
        data-testid="desktop-sidebar"
        data-collapsed={sidebarCollapsed}
        className={cn(
          "relative hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex",
          sidebarCollapsed ? "w-[4.75rem]" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-[4.5rem] items-center border-b border-sidebar-border px-3",
            sidebarCollapsed ? "justify-center" : "justify-between",
          )}
        >
          <Brand collapsed={sidebarCollapsed} />
        </div>

        <nav
          aria-label="Primary navigation"
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 py-3"
        >
          <SidebarSection
            label="Workspace"
            items={visibleCoreItems}
            collapsed={sidebarCollapsed}
          />
          <SidebarSection
            label="Life modules"
            items={visibleModuleItems}
            collapsed={sidebarCollapsed}
          />
          <div className="border-t border-sidebar-border" />
          <SidebarSection
            label="System"
            items={systemNavItems}
            collapsed={sidebarCollapsed}
          />
        </nav>

        <div className="space-y-2 border-t border-sidebar-border p-2">
          <SidebarLink {...settingsItem} collapsed={sidebarCollapsed} />
          <div
            className={cn(
              "flex min-h-12 items-center rounded-lg border border-sidebar-border bg-background/25 p-2",
              sidebarCollapsed ? "flex-col justify-center gap-1" : "gap-2",
            )}
          >
            <UserRound className="size-4 shrink-0 text-sidebar-primary" />
            <div
              className={cn("min-w-0 flex-1", sidebarCollapsed && "sr-only")}
            >
              <p className="truncate text-xs font-semibold text-sidebar-foreground">
                {owner?.username}
              </p>
              <p className="text-[0.65rem] text-sidebar-foreground/45">
                Owner session
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Sign out"
              onClick={() => void logout()}
            >
              <LogOut />
            </Button>
          </div>
        </div>

        <HeaderActionTooltip
          label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            aria-expanded={!sidebarCollapsed}
            className="absolute -right-[1.125rem] top-[5.1rem] z-20 rounded-full border-sidebar-border bg-sidebar text-sidebar-foreground shadow-md hover:bg-sidebar-accent"
            onClick={() => setSidebarCollapsed((current) => !current)}
          >
            {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        </HeaderActionTooltip>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-40 flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-background/92 px-3 backdrop-blur-md sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open navigation menu"
              onClick={() => setMobileNavigationOpen(true)}
            >
              <Menu />
            </Button>
            <RouteContext pathname={location.pathname} />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <details className="relative hidden md:block">
              <summary className="flex h-9 cursor-pointer list-none items-center rounded-md border border-border bg-surface/55 px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                Finance: {currencyFilterLabel}
              </summary>
              <div className="absolute right-0 z-50 mt-2 w-56 space-y-3 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-xl">
                <fieldset className="space-y-2">
                  <legend className="text-xs font-semibold">
                    Display currencies
                  </legend>
                  <label className="flex min-h-8 items-center gap-2 text-xs">
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
                      className="flex min-h-8 items-center gap-2 text-xs"
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
                    className="h-9 w-full px-2 text-xs"
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

            <HeaderActionTooltip
              label={masked ? "Show financial data" : "Mask financial data"}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-pressed={masked}
                aria-label={
                  masked ? "Show financial data" : "Mask financial data"
                }
                onClick={() => setMasked(!masked)}
              >
                {masked ? <Eye /> : <EyeOff />}
              </Button>
            </HeaderActionTooltip>

            <HeaderActionTooltip label="Settings">
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="hidden sm:inline-flex"
              >
                <Link to="/settings" aria-label="Settings">
                  <Settings />
                </Link>
              </Button>
            </HeaderActionTooltip>

            <span className="hidden max-w-32 truncate text-xs text-muted-foreground xl:inline">
              {owner?.username}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden lg:inline-flex"
              onClick={() => void logout()}
            >
              <LogOut />
              Sign out
            </Button>
          </div>
        </header>

        <main className="app-content min-h-0 overflow-y-auto pb-[4.5rem] md:pb-0">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 flex min-h-16 items-stretch justify-around border-t border-sidebar-border bg-sidebar/96 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        {bottomNavItems.map(({ label, icon: Icon, path }) => {
          const isActive = isPathActive(location.pathname, path);
          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                "relative flex min-w-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[0.65rem] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              <span className="max-w-full truncate">{label}</span>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary"
                />
              )}
            </NavLink>
          );
        })}
        <button
          type="button"
          className={cn(
            "relative flex min-w-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[0.65rem] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            isMoreActive
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-label="Open more navigation links"
          onClick={() => setMobileNavigationOpen(true)}
        >
          <MoreHorizontal className="size-5" />
          <span>More</span>
        </button>
      </nav>

      <Sheet open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen}>
        <SheetContent side="left" className="w-[min(22rem,88vw)] p-0">
          <SheetHeader className="border-b border-sidebar-border px-4 py-4 text-left">
            <Brand />
            <SheetTitle className="sr-only">ILTO navigation</SheetTitle>
            <SheetDescription className="sr-only">
              Navigate between ILTO workspaces and account controls.
            </SheetDescription>
          </SheetHeader>
          <nav
            aria-label="Navigation drawer"
            className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3"
          >
            <div className="space-y-1">
              <p className="px-3 pb-1 pt-2 text-[0.65rem] font-semibold tracking-[0.16em] text-sidebar-foreground/38 uppercase">
                Workspace
              </p>
              {visibleCoreItems.map((item) => (
                <SidebarLink
                  key={item.path}
                  {...item}
                  onNavigate={() => setMobileNavigationOpen(false)}
                />
              ))}
            </div>
            <div className="space-y-1">
              <p className="px-3 pb-1 pt-2 text-[0.65rem] font-semibold tracking-[0.16em] text-sidebar-foreground/38 uppercase">
                Life modules
              </p>
              {visibleModuleItems.map((item) => (
                <SidebarLink
                  key={item.path}
                  {...item}
                  onNavigate={() => setMobileNavigationOpen(false)}
                />
              ))}
            </div>
            <div className="space-y-1 border-t border-sidebar-border pt-3">
              <p className="px-3 pb-1 pt-2 text-[0.65rem] font-semibold tracking-[0.16em] text-sidebar-foreground/38 uppercase">
                System
              </p>
              {[...systemNavItems, settingsItem].map((item) => (
                <SidebarLink
                  key={item.path}
                  {...item}
                  onNavigate={() => setMobileNavigationOpen(false)}
                />
              ))}
            </div>
          </nav>
          <div className="flex items-center gap-3 border-t border-sidebar-border p-4">
            <UserRound className="size-4 text-sidebar-primary" />
            <span className="min-w-0 flex-1 truncate text-sm text-sidebar-foreground">
              {owner?.username}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void logout()}
            >
              <LogOut />
              Sign out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
