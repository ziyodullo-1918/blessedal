import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { DeptTasks } from "@/components/factory/dept-tasks";

export const Route = createFileRoute("/factory/stretching/tasks")({
  component: () => <RequireAuth><DeptTasks department="stretching" /></RequireAuth>,
});
