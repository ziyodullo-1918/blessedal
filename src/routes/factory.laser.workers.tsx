import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { DeptWorkers } from "@/components/factory/dept-workers";

export const Route = createFileRoute("/factory/laser/workers")({
  component: () => <RequireAuth><DeptWorkers department="laser" title="Lazer — Ishchilar" /></RequireAuth>,
});
