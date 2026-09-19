import { Code2 } from "lucide-react";
import { API_CONTRACT } from "@/lib/api/contract.ts";

export default function ApiDocsPage() {
  const domains = [...new Set(API_CONTRACT.map((route) => route.domain))];
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-3">
        <Code2 className="h-6 w-6" /> API contract
      </h1>
      <p className="text-sm text-muted-foreground">
        Proposed routes for the separate backend repository. Set the full API
        root in Settings (for example http://localhost:8001/api/v1). All paths
        below are relative to that root.
      </p>
      <p className="text-sm text-muted-foreground">
        These declarations do not indicate that a server is running. Create and
        update requests return the saved record; deletes and marking all
        notifications read return 204. Lists return arrays, except the paginated
        project list. Full conventions and payload types are described in
        docs/backend-api.md.
      </p>
      {domains.map((domain) => (
        <section key={domain} className="space-y-2">
          <h2 className="text-lg font-semibold capitalize">{domain}</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3">Method</th>
                  <th className="p-3">Path</th>
                  <th className="p-3">Function</th>
                  <th className="p-3">Response</th>
                </tr>
              </thead>
              <tbody>
                {API_CONTRACT.filter((route) => route.domain === domain).map(
                  (route) => (
                    <tr
                      key={route.method + route.path}
                      className="border-t border-border"
                    >
                      <td className="p-3 font-semibold">{route.method}</td>
                      <td className="p-3">
                        <code>{route.path}</code>
                      </td>
                      <td className="p-3">
                        <code>{route.function}</code>
                      </td>
                      <td className="p-3">
                        <code>{route.response}</code>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
