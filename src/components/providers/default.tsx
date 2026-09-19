import { QueryClientProvider } from "./query-client.tsx";
import { ThemeProvider } from "./theme.tsx";
import { SettingsProvider } from "./settings.tsx";
import { Toaster } from "../ui/sonner.tsx";
import { TooltipProvider } from "../ui/tooltip.tsx";
import { AuthProvider } from "./auth.tsx";

export function DefaultProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider forcedTheme="dark" enableSystem={false}>
      <SettingsProvider>
        <QueryClientProvider>
          <AuthProvider>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
