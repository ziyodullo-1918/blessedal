import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { DeptWorkers } from "@/components/factory/dept-workers";

export const Route = createFileRoute("/factory/stretching/workers")({
  component: () => <RequireAuth><DeptWorkers department="stretching" title="Tortuv — Ishchilar" /></RequireAuth>,
});
