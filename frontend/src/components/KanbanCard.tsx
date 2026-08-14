import React from "react";
import { User } from "lucide-react";
import type { CrossProjectTask, StatusInfo } from "../types";
import { cn } from "../lib/utils";

interface KanbanCardProps {
  task: CrossProjectTask;
  allStatuses: StatusInfo[];
  onStatusChange: (taskId: string, newStatusId: string) => void;
  onCardClick?: (task: CrossProjectTask) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  allStatuses,
  onStatusChange,
  onCardClick,
}) => {
  const getPriorityMeta = (priority: string) => {
    const p = (priority || "medium").toLowerCase();
    switch (p) {
      case "urgent":
        return { color: "#ef4444", label: "Urgent" };
      case "high":
        return { color: "#f97316", label: "High" };
      case "low":
        return { color: "#64748b", label: "Low" };
      case "medium":
      default:
        return { color: "#3b82f6", label: "Medium" };
    }
  };

  const priorityMeta = getPriorityMeta(task.priority);
  const taskKey = task.project_prefix
    ? `${task.project_prefix}-${task.task_number}`
    : `#${task.task_number}`;

  return (
    <div
      onClick={() => onCardClick?.(task)}
      className={cn(
        "group relative rounded-xl border border-border/30 bg-card p-3 shadow-xs cursor-pointer transition-all duration-150 select-none",
        "hover:border-border/50 hover:shadow-sm"
      )}
    >
      {/* Task Key (e.g. PROJ-123) matching PACA native format */}
      <div className="mb-1 flex items-center justify-between gap-1.5">
        <span className="font-[JetBrains_Mono,monospace] text-xs font-semibold text-muted-foreground/50 tracking-wide">
          {taskKey}
        </span>
      </div>

      {/* Task Title */}
      <span className="text-sm font-medium leading-snug text-foreground line-clamp-2">
        {task.title}
      </span>

      {/* Field Chips (Priority + Assignee + Quick Status) */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 pt-1">
        <div className="flex items-center gap-2">
          {/* Priority indicator */}
          <span
            className="inline-flex items-center gap-1 text-xs font-medium shrink-0"
            style={{ color: priorityMeta.color }}
          >
            <span
              className="size-1.5 rounded-full shrink-0"
              style={{ background: priorityMeta.color }}
            />
            {priorityMeta.label}
          </span>

          {/* Quick status dropdown */}
          <div onClick={(e) => e.stopPropagation()}>
            <select
              value={task.status_id || ""}
              onChange={(e) => onStatusChange(task.id, e.target.value)}
              className="h-5 text-[11px] px-1 py-0 bg-muted/40 border border-border/30 rounded text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer transition-colors max-w-[120px] truncate"
              title="Change status"
            >
              {allStatuses
                .filter((s) => s.project_id === task.project_id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              {allStatuses.length === 0 && (
                <option value={task.status_id || ""}>
                  {task.status_name || "Status"}
                </option>
              )}
            </select>
          </div>
        </div>

        {/* Assignee Avatar */}
        <div
          title={task.assignee_name || "Unassigned"}
          className={cn(
            "flex size-5 items-center justify-center rounded-full text-[10px] font-bold ring-1 ring-border/25 shrink-0",
            task.assignee_name
              ? "bg-linear-to-br from-primary/20 to-primary/15 text-primary"
              : "bg-linear-to-br from-muted/80 to-muted/40 text-muted-foreground"
          )}
        >
          {task.assignee_name ? (
            task.assignee_name.slice(0, 1).toUpperCase()
          ) : (
            <User className="size-2.5" />
          )}
        </div>
      </div>
    </div>
  );
};
