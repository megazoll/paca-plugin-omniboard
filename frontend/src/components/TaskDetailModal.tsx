import React, { useEffect } from "react";
import {
  X,
  ExternalLink,
  User,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  Tag,
} from "lucide-react";
import type { CrossProjectTask, StatusInfo } from "../types";
import { cn } from "../lib/utils";

interface TaskDetailModalProps {
  task: CrossProjectTask | null;
  allStatuses: StatusInfo[];
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (taskId: string, newStatusId: string) => void;
  onOpenFullPage?: (task: CrossProjectTask) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  allStatuses,
  isOpen,
  onClose,
  onStatusChange,
  onOpenFullPage,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  const getPriorityMeta = (priority?: string) => {
    const p = (priority || "").toLowerCase();
    switch (p) {
      case "urgent":
      case "critical":
        return { color: "#ef4444", label: "Urgent", bg: "bg-red-500/10 text-red-500 border-red-500/20" };
      case "high":
        return { color: "#f97316", label: "High", bg: "bg-orange-500/10 text-orange-500 border-orange-500/20" };
      case "medium":
        return { color: "#f59e0b", label: "Medium", bg: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
      case "low":
        return { color: "#60a5fa", label: "Low", bg: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
      case "none":
      default:
        return null;
    }
  };

  const priorityMeta = getPriorityMeta(task.priority);
  const taskKey = task.project_prefix
    ? `${task.project_prefix}-${task.task_number}`
    : `#${task.task_number}`;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const renderDescription = (raw?: string) => {
    if (!raw || !raw.trim()) {
      return (
        <p className="text-xs text-muted-foreground/50 italic py-2">
          No description provided.
        </p>
      );
    }
    const trimmed = raw.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const extractContent = (nodes: any[]): string => {
            return nodes
              .map((node) => {
                if (typeof node === "string") return node;
                if (node && typeof node === "object") {
                  if (Array.isArray(node.content)) return extractContent(node.content);
                  if (typeof node.text === "string") return node.text;
                }
                return "";
              })
              .filter(Boolean)
              .join(" ");
          };
          const extracted = extractContent(parsed).trim();
          if (extracted) {
            return (
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {extracted}
              </p>
            );
          }
        }
      } catch {
        // Fallback to raw string
      }
    }
    return (
      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
        {raw}
      </p>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-background border border-border/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Nav Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-[JetBrains_Mono,monospace] text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
              {taskKey}
            </span>
            <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <Layers className="size-3 shrink-0" />
              {task.project_name || "Project"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenFullPage && (
              <button
                type="button"
                onClick={() => onOpenFullPage(task)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors"
                title="Open full task page"
              >
                <span>Full Page</span>
                <ExternalLink className="size-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title="Close modal (Esc)"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Task Title */}
          <div>
            <h2 className="text-lg font-bold text-foreground leading-snug tracking-tight">
              {task.title}
            </h2>
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border border-border/40 bg-muted/20">
            {/* Status */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                Status
              </span>
              <div>
                <select
                  value={task.status_id || ""}
                  onChange={(e) => onStatusChange(task.id, e.target.value)}
                  className="w-full h-7 px-2 py-0.5 text-xs font-medium bg-background border border-border/60 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer"
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

            {/* Priority */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1">
                <Tag className="size-3" />
                Priority
              </span>
              <div className="flex items-center h-7">
                {priorityMeta ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md border",
                      priorityMeta.bg
                    )}
                  >
                    <span
                      className="size-1.5 rounded-full shrink-0"
                      style={{ background: priorityMeta.color }}
                    />
                    {priorityMeta.label}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/50">None</span>
                )}
              </div>
            </div>

            {/* Assignee */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1">
                <User className="size-3" />
                Assignee
              </span>
              <div className="flex items-center gap-1.5 h-7">
                <div
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
                <span className="text-xs text-foreground truncate">
                  {task.assignee_name || "Unassigned"}
                </span>
              </div>
            </div>

            {/* Created At */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1">
                <Calendar className="size-3" />
                Created
              </span>
              <div className="flex items-center h-7 text-xs text-muted-foreground">
                {formatDate(task.created_at)}
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 border-b border-border/30 pb-1.5">
              Description
            </h3>
            <div className="p-3 rounded-xl border border-border/30 bg-card min-h-[100px]">
              {renderDescription(task.description)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
