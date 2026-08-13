import React from "react";
import { User, AlertCircle, ArrowUpRight } from "lucide-react";
import type { CrossProjectTask, StatusInfo } from "../types";

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
  const getPriorityBadge = (priority: string) => {
    const p = priority.toLowerCase();
    switch (p) {
      case "urgent":
        return <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-500/15 text-red-500 uppercase">Urgent</span>;
      case "high":
        return <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-orange-500/15 text-orange-500 uppercase">High</span>;
      case "low":
        return <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-500/15 text-slate-500 uppercase">Low</span>;
      default:
        return <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-500/15 text-blue-500 uppercase">Medium</span>;
    }
  };

  const projectKey = `${task.project_prefix}-${task.task_number}`;

  return (
    <div className="group relative bg-card border border-border rounded-lg p-3.5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer flex flex-col gap-2.5">
      {/* Top Bar: Project Badge + Task Key + Priority */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {/* Distinct Multi-project Badge */}
          <span className="px-2 py-0.5 text-xs font-bold rounded bg-primary/10 text-primary border border-primary/20 tracking-wider">
            {task.project_prefix}
          </span>
          <span className="text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors">
            {projectKey}
          </span>
        </div>
        <div>{getPriorityBadge(task.priority)}</div>
      </div>

      {/* Task Title */}
      <div
        onClick={() => onCardClick?.(task)}
        className="text-sm font-medium text-foreground leading-snug line-clamp-2 hover:text-primary transition-colors"
      >
        {task.title}
      </div>

      {/* Optional Description Preview */}
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-1">
          {task.description}
        </p>
      )}

      {/* Footer: Assignee & Quick Status Dropdown */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
        {/* Assignee */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-foreground">
            {task.assignee_name ? task.assignee_name.slice(0, 2).toUpperCase() : <User className="size-3" />}
          </div>
          <span className="truncate">{task.assignee_name || "Unassigned"}</span>
        </div>

        {/* Quick Status Change Menu */}
        <div onClick={(e) => e.stopPropagation()}>
          <select
            value={task.status_id || ""}
            onChange={(e) => onStatusChange(task.id, e.target.value)}
            className="h-6 text-[11px] px-1.5 py-0 bg-background border border-input rounded text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer hover:border-primary/50"
            title="Move to status"
          >
            {allStatuses
              .filter((s) => s.project_id === task.project_id)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            {/* Fallback if status list isn't project-specific */}
            {allStatuses.length === 0 && (
              <option value={task.status_id || ""}>{task.status_name || "Status"}</option>
            )}
          </select>
        </div>
      </div>
    </div>
  );
};
