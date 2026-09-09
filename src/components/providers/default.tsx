import { QueryClientProvider } from "./query-client.tsx";
import { ThemeProvider } from "./theme.tsx";
import { SettingsProvider } from "./settings.tsx";
import { Toaster } from "../ui/sonner.tsx";
import { TooltipProvider } from "../ui/tooltip.tsx";

export function DefaultProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider forcedTheme="dark" enableSystem={false}>
      <SettingsProvider>
        <QueryClientProvider>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
