import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { DeptWorkers } from "@/components/factory/dept-workers";

export const Route = createFileRoute("/factory/sewing/workers")({
  component: () => <RequireAuth><DeptWorkers department="sewing" title="Tikuv — Ishchilar" /></RequireAuth>,
});
