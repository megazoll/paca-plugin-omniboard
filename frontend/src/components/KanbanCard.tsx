import React, { useMemo } from "react";
import { User } from "lucide-react";
import type { ColumnConfig, CrossProjectTask, StatusInfo } from "../types";
import { cn } from "../lib/utils";
import { getTaskTypeIconComponent } from "./TaskTypeIcons";

interface KanbanCardProps {
  task: CrossProjectTask;
  column?: ColumnConfig;
  boardFilters?: Record<string, any>;
  allStatuses: StatusInfo[];
  onStatusChange: (taskId: string, newStatusId: string) => void;
  onCardClick?: (task: CrossProjectTask) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  column,
  boardFilters,
  allStatuses,
  onStatusChange,
  onCardClick,
}) => {
  const getPriorityMeta = (priority?: string) => {
    const p = (priority || "").toLowerCase();
    switch (p) {
      case "urgent":
      case "critical":
        return { color: "#ef4444", label: "Urgent" };
      case "high":
        return { color: "#f97316", label: "High" };
      case "medium":
        return { color: "#f59e0b", label: "Medium" };
      case "low":
        return { color: "#60a5fa", label: "Low" };
      case "none":
      default:
        return null;
    }
  };

  const priorityMeta = getPriorityMeta(task.priority);
  const taskKey = task.project_prefix
    ? `${task.project_prefix}-${task.task_number}`
    : `#${task.task_number}`;

  const TaskTypeIcon = getTaskTypeIconComponent(task.task_type_icon);

  const projectStatuses = allStatuses.filter((s) => s.project_id === task.project_id);
  const assignees =
    task.assignees && task.assignees.length > 0
      ? task.assignees
      : task.assignee_name
        ? [{ id: task.assignee_id || "1", name: task.assignee_name }]
        : [];

  const isDoneTask = useMemo(() => {
    const cat = (task.status_category || "").toLowerCase().replace(/[\s_-]/g, "");
    if (cat === "done" || cat === "completed" || cat === "closed" || cat === "resolved") {
      return true;
    }
    if (column?.status_categories?.some((c) => {
      const norm = c.toLowerCase().replace(/[\s_-]/g, "");
      return norm === "done" || norm === "completed" || norm === "closed" || norm === "resolved";
    })) {
      return true;
    }
    return false;
  }, [task.status_category, column]);

  const dimOpacityClass = useMemo(() => {
    if (!isDoneTask || !boardFilters?.dim_done_days) return "";
    const dimDays = Number(boardFilters.dim_done_days);
    if (dimDays === 0) return "";

    const timestamp = task.updated_at || task.created_at;
    if (!timestamp) return "";
    const ageDays = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24);

    if (dimDays > 0) {
      if (ageDays >= dimDays) {
        return "opacity-40 hover:opacity-100 dark:opacity-35 dark:hover:opacity-100 transition-opacity duration-200";
      }
      return "";
    }

    // Progressive dimming when dimDays === -1
    if (dimDays === -1) {
      if (ageDays >= 14) {
        return "opacity-35 hover:opacity-100 dark:opacity-30 dark:hover:opacity-100 transition-opacity duration-200";
      }
      if (ageDays >= 7) {
        return "opacity-45 hover:opacity-100 dark:opacity-40 dark:hover:opacity-100 transition-opacity duration-200";
      }
      if (ageDays >= 3) {
        return "opacity-60 hover:opacity-100 dark:opacity-55 dark:hover:opacity-100 transition-opacity duration-200";
      }
      if (ageDays >= 1) {
        return "opacity-75 hover:opacity-100 dark:opacity-70 dark:hover:opacity-100 transition-opacity duration-200";
      }
    }
    return "";
  }, [isDoneTask, boardFilters?.dim_done_days, task.updated_at, task.created_at]);

  return (
    <div
      onClick={() => onCardClick?.(task)}
      className={cn(
        "group relative rounded-xl border border-border/30 bg-card p-3 shadow-xs cursor-pointer transition-all duration-150 select-none",
        "hover:border-border/50 hover:shadow-sm",
        dimOpacityClass
      )}
    >
      {/* Task Key (e.g. PROJ-123) matching PACA native format */}
      <div className="mb-1 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {TaskTypeIcon && (
            <TaskTypeIcon
              className="size-3 shrink-0"
              style={task.task_type_color ? { color: task.task_type_color } : undefined}
            />
          )}
          <span className="font-[JetBrains_Mono,monospace] text-xs font-semibold text-muted-foreground/50 tracking-wide">
            {taskKey}
          </span>
        </div>
      </div>

      {/* Task Title */}
      <span className="text-sm font-medium leading-snug text-foreground line-clamp-2">
        {task.title}
      </span>

      {/* Field Chips (Priority + Assignee + Quick Status) */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 pt-1">
        <div className="flex items-center gap-2">
          {/* Priority indicator - only rendered if priority is not none */}
          {priorityMeta && (
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
          )}

          {/* Quick status dropdown */}
          <div onClick={(e) => e.stopPropagation()}>
            <select
              value={task.status_id || ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val && val !== task.status_id) {
                  onStatusChange(task.id, val);
                }
              }}
              className="h-5 text-[11px] px-1 py-0 bg-muted/40 border border-border/30 rounded text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer transition-colors max-w-[120px] truncate"
              title="Change status"
            >
              {projectStatuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              {(!task.status_id || !projectStatuses.some((s) => s.id === task.status_id)) && (
                <option value={task.status_id || ""}>
                  {task.status_name || "Status"}
                </option>
              )}
            </select>
          </div>
        </div>

        {/* Assignees Avatars */}
        {assignees.length === 0 ? (
          <div
            title="Unassigned"
            className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold ring-1 ring-border/25 shrink-0 bg-linear-to-br from-muted/80 to-muted/40 text-muted-foreground"
          >
            <User className="size-2.5" />
          </div>
        ) : assignees.length === 1 ? (
          <div
            title={assignees[0].name}
            className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold ring-1 ring-border/25 shrink-0 bg-linear-to-br from-primary/20 to-primary/15 text-primary"
          >
            {assignees[0].name.slice(0, 1).toUpperCase()}
          </div>
        ) : (
          <div
            title={assignees.map((a) => a.name).join(", ")}
            className="flex items-center -space-x-1.5 shrink-0"
          >
            {assignees.slice(0, 3).map((a, idx) => (
              <div
                key={a.id || idx}
                className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold ring-1 ring-card bg-linear-to-br from-primary/20 to-primary/15 text-primary shrink-0"
              >
                {a.name.slice(0, 1).toUpperCase()}
              </div>
            ))}
            {assignees.length > 3 && (
              <div className="flex size-5 items-center justify-center rounded-full text-[9px] font-bold ring-1 ring-card bg-muted text-muted-foreground shrink-0">
                +{assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
