import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/** Updates are visible after confirmation; refetch failure is separate from save failure. */
export function useApiMutation<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>,
  domains: string[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    retry: false,
    onSuccess: async () => {
      await Promise.all(
        [...domains, "dashboard", "intelligence"].map((domain) =>
          queryClient.invalidateQueries({ queryKey: [domain] }),
        ),
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not save changes.",
      );
    },
  });
}
