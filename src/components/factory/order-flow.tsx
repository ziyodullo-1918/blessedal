import { DEPT_FLOW, DEPT_LABEL, STATUS_COLOR, STATUS_LABEL, type FactoryStage } from "@/lib/factory/data";
import { cn } from "@/lib/utils";
import { Check, Circle, Loader2 } from "lucide-react";

export function OrderFlow({ stages }: { stages: FactoryStage[] }) {
  const byDept = new Map(stages.map((s) => [s.department, s]));
  return (
    <div className="flex flex-wrap items-center gap-2">
      {DEPT_FLOW.map((dept, i) => {
        const s = byDept.get(dept);
        const status = s?.status ?? "pending";
        return (
          <div key={dept} className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium",
                STATUS_COLOR[status],
              )}
            >
              {status === "completed" ? <Check className="size-3" /> :
                status === "in_progress" || status === "partial" ? <Loader2 className="size-3 animate-spin" /> :
                <Circle className="size-3" />}
              <span>{DEPT_LABEL[dept]}</span>
              {s && s.planned_quantity > 0 && (
                <span className="opacity-70">
                  {s.completed_quantity}/{s.planned_quantity}
                </span>
              )}
            </div>
            {i < DEPT_FLOW.length - 1 && <div className="text-muted-foreground">→</div>}
          </div>
        );
      })}
    </div>
  );
}

export function StatusBadge({ status }: { status: keyof typeof STATUS_LABEL }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", STATUS_COLOR[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}
