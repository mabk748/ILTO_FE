import { lazy, Suspense } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import RequireOwner from "./components/layout/RequireOwner.tsx";
import LoginPage from "./pages/auth/Login.tsx";
import AppLayout from "./components/layout/AppLayout.tsx";
import { Skeleton } from "./components/ui/skeleton.tsx";

const DashboardPage = lazy(() => import("./pages/dashboard/page.tsx"));
const ProjectsPage = lazy(() => import("./pages/projects/page.tsx"));
const InfrastructurePage = lazy(
  () => import("./pages/infrastructure/page.tsx"),
);
const HealthPage = lazy(() => import("./pages/health/page.tsx"));
const FinancesPage = lazy(() => import("./pages/finances/page.tsx"));
const LearningPage = lazy(() => import("./pages/learning/page.tsx"));
const WorkPage = lazy(() => import("./pages/work/page.tsx"));
const SocialPage = lazy(() => import("./pages/social/page.tsx"));
const AppearancePage = lazy(() => import("./pages/appearance/page.tsx"));
const LogisticsPage = lazy(() => import("./pages/logistics/page.tsx"));
const ApiDocsPage = lazy(() => import("./pages/api-docs/page.tsx"));
const NotificationsPage = lazy(() => import("./pages/notifications/page.tsx"));
const SettingsPage = lazy(() => import("./pages/settings/page.tsx"));
const IntelligencePage = lazy(() => import("./pages/intelligence/page.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

function PageFallback() {
  return (
    <div className="space-y-4 p-6" aria-label="Loading page">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/settings"
            element={
              <>
                <nav className="p-4">
                  <Link className="underline" to="/projects">
                    Back to ILTO / sign in
                  </Link>
                </nav>
                <SettingsPage />
              </>
            }
          />
          <Route element={<RequireOwner />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/infrastructure" element={<InfrastructurePage />} />
              <Route path="/health" element={<HealthPage />} />
              <Route path="/finances" element={<FinancesPage />} />
              <Route path="/learning" element={<LearningPage />} />
              <Route path="/work" element={<WorkPage />} />
              <Route path="/social" element={<SocialPage />} />
              <Route path="/appearance" element={<AppearancePage />} />
              <Route path="/logistics" element={<LogisticsPage />} />
              <Route path="/api-docs" element={<ApiDocsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/intelligence" element={<IntelligencePage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
