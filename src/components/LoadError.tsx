import { Button } from "@/components/ui/button.tsx";
import {
  ErrorState,
  ErrorStateContent,
  ErrorStateDescription,
  ErrorStateHeader,
  ErrorStateMedia,
  ErrorStateTitle,
} from "@/components/ui/error-state.tsx";

interface LoadErrorProps {
  error: unknown;
  onRetry: () => void;
  title?: string;
}

export default function LoadError({
  error,
  onRetry,
  title = "Could not load this section",
}: LoadErrorProps) {
  return (
    <ErrorState>
      <ErrorStateMedia />
      <ErrorStateHeader>
        <ErrorStateTitle>{title}</ErrorStateTitle>
        <ErrorStateDescription>
          {error instanceof Error ? error.message : "The data request failed."}
        </ErrorStateDescription>
      </ErrorStateHeader>
      <ErrorStateContent>
        <Button onClick={onRetry}>Try again</Button>
      </ErrorStateContent>
    </ErrorState>
  );
}
