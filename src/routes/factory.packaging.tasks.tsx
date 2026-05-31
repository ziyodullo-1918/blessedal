import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { DeptTasks } from "@/components/factory/dept-tasks";

export const Route = createFileRoute("/factory/packaging/tasks")({
  component: () => <RequireAuth><DeptTasks department="packaging" /></RequireAuth>,
});
