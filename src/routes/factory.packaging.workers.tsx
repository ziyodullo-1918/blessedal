import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { DeptWorkers } from "@/components/factory/dept-workers";

export const Route = createFileRoute("/factory/packaging/workers")({
  component: () => <RequireAuth><DeptWorkers department="packaging" title="Qadoq — Ishchilar" /></RequireAuth>,
});
