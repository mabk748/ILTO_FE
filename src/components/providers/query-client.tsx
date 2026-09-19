import {
  QueryClient,
  QueryClientProvider as ReactQueryClientProvider,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSettings } from "./settings-context.ts";
import { ApiError } from "@/lib/api/errors.ts";

export function QueryClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { settings } = useSettings();
  const backend =
    settings.apiBaseUrl.trim() ||
    import.meta.env.VITE_API_BASE_URL?.trim() ||
    "";
  return <BackendQueries key={backend}>{children}</BackendQueries>;
}

function BackendQueries({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (count, error) => {
              if (
                error instanceof ApiError &&
                (error.code === "configuration" ||
                  error.code === "aborted" ||
                  error.code === "invalid_response" ||
                  (error.code === "http" && (error.status ?? 500) < 500))
              )
                return false;
              return count < 1;
            },
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
          mutations: { retry: false },
        },
      }),
  );

  useEffect(
    () => () => {
      void queryClient.cancelQueries();
      queryClient.clear();
    },
    [queryClient],
  );

  return (
    <ReactQueryClientProvider client={queryClient}>
      {children}
    </ReactQueryClientProvider>
  );
}
