import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useProjectsMutation<T>(write: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: write,
    retry: false,
    onSuccess: async () => {
      // Includes all Projects tabs, plus other screens that derive project data.
      await Promise.all(
        ["projects", "dashboard", "intelligence"].map((domain) =>
          client.invalidateQueries({ queryKey: [domain] }),
        ),
      );
    },
  });
}
