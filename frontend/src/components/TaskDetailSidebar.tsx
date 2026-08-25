import React, { useEffect, useState } from "react";
import {
  X,
  ExternalLink,
  Layers,
  User,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  Copy,
  Check,
  Plus,
} from "lucide-react";
import type { CrossProjectTask, ProjectMember, StatusInfo } from "../types";

interface TaskDetailSidebarProps {
  task: CrossProjectTask | null;
  isOpen: boolean;
  onClose: () => void;
  allStatuses: StatusInfo[];
  members?: ProjectMember[];
  onStatusChange: (taskId: string, newStatusId: string) => void;
  onAssigneesChange?: (taskId: string, memberIds: string[]) => void;
  onNavigateToTask?: (projectId: string, taskId: string) => void;
}

export const TaskDetailSidebar: React.FC<TaskDetailSidebarProps> = ({
  task,
  isOpen,
  onClose,
  allStatuses,
  members = [],
  onStatusChange,
  onAssigneesChange,
  onNavigateToTask,
}) => {
  const [copied, setCopied] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  const taskUrl = `/projects/${task.project_id}/tasks/${task.id}`;

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}${taskUrl}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
        return { color: "#94a3b8", label: "None" };
    }
  };

  const priorityMeta = getPriorityMeta(task.priority);
  const taskKey = task.project_prefix
    ? `${task.project_prefix}-${task.task_number}`
    : `#${task.task_number}`;

  const formatDate = (isoString?: string) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  // Helper to extract human-readable text if description is stored as BlockNote JSON
  const formatDescription = (rawDesc?: string): string => {
    if (!rawDesc || !rawDesc.trim()) return "";
    const trimmed = rawDesc.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const extractBlockText = (b: any): string => {
            if (!b) return "";
            if (typeof b === "string") return b;
            if (Array.isArray(b.content)) {
              return b.content.map((c: any) => c.text || c.title || "").join("");
            }
            if (b.text) return b.text;
            return "";
          };
          const lines = parsed.map(extractBlockText).filter(Boolean);
          if (lines.length > 0) return lines.join("\n\n");
        }
      } catch {
        // Fallback to raw string if JSON parse fails
      }
    }
    return rawDesc;
  };

  const formattedDesc = formatDescription(task.description);
  const projectStatuses = allStatuses.filter((s) => s.project_id === task.project_id);

  // Available project members
  const projectMembers = members.filter((m) => !m.project_id || m.project_id === task.project_id);

  // Current assignees
  const assignees =
    task.assignees && task.assignees.length > 0
      ? task.assignees
      : task.assignee_name
        ? [{ id: task.assignee_id || "", name: task.assignee_name }]
        : [];

  const assignedMemberIds = new Set(assignees.map((a) => a.id).filter(Boolean));
  const availableMembers = projectMembers.filter((m) => !assignedMemberIds.has(m.id));

  const handleAddAssignee = (memberId: string) => {
    if (!memberId || !onAssigneesChange) return;
    const currentIds = assignees.map((a) => a.id).filter(Boolean);
    if (!currentIds.includes(memberId)) {
      onAssigneesChange(task.id, [...currentIds, memberId]);
    }
  };

  const handleRemoveAssignee = (memberId: string) => {
    if (!onAssigneesChange) return;
    const updatedIds = assignees.map((a) => a.id).filter((id) => id && id !== memberId);
    onAssigneesChange(task.id, updatedIds);
  };

  return (
    <>
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Right Slide-over Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={task.title}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl flex-col bg-background border-l border-border/60 shadow-2xl transition-transform duration-200 ease-out animate-in slide-in-from-right"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-muted/20 px-6 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-[JetBrains_Mono,monospace] text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md shrink-0">
              {taskKey}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              <Layers className="size-3.5 shrink-0" />
              <span className="font-medium text-foreground truncate">{task.project_name}</span>
            </div>
          </div>

          {/* Action Buttons: Navigate/Open in new window & Close */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={taskUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all duration-150"
              title="Open full task page in new window"
            >
              <span>Open Task</span>
              <ExternalLink className="size-3.5" />
            </a>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex size-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
              title="Copy task link"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
              title="Close sidebar"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground leading-snug tracking-tight">
              {task.title}
            </h2>
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-border/40 bg-muted/15">
            {/* Status Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <AlertCircle className="size-3" />
                <span>Status</span>
              </label>
              <select
                value={task.status_id || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && val !== task.status_id) {
                    onStatusChange(task.id, val);
                  }
                }}
                className="w-full py-1.5 px-2.5 text-xs bg-background border border-input rounded-lg text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                {projectStatuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
                {(!task.status_id || !projectStatuses.some((s) => s.id === task.status_id)) && (
                  <option value={task.status_id || ""}>
                    {task.status_name || "Current Status"}
                  </option>
                )}
              </select>
            </div>

            {/* Priority Indicator */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Priority
              </label>
              <div className="flex items-center gap-2 py-1.5 px-2.5 text-xs bg-background border border-input rounded-lg text-foreground font-medium">
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ background: priorityMeta.color }}
                />
                <span style={{ color: priorityMeta.color }} className="capitalize font-semibold">
                  {priorityMeta.label}
                </span>
              </div>
            </div>

            {/* Assignees Management */}
            <div className="space-y-1.5 col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <User className="size-3" />
                  <span>{assignees.length > 1 ? "Assignees" : "Assignee"} ({assignees.length})</span>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2 p-2 text-xs bg-background border border-input rounded-lg text-foreground min-h-[38px]">
                {assignees.length === 0 ? (
                  <span className="text-muted-foreground italic text-xs px-1">Unassigned</span>
                ) : (
                  assignees.map((a, idx) => (
                    <div
                      key={a.id || idx}
                      className="flex items-center gap-1.5 bg-muted/60 pl-2 pr-1.5 py-1 rounded-md border border-border/40 text-foreground group/assignee"
                    >
                      <div className="size-4.5 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[9px] shrink-0">
                        {a.name ? a.name[0].toUpperCase() : "?"}
                      </div>
                      <span className="truncate font-medium">{a.name}</span>
                      {onAssigneesChange && a.id && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAssignee(a.id)}
                          className="size-4 ml-0.5 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title={`Remove ${a.name}`}
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </div>
                  ))
                )}

                {/* Add Assignee Dropdown */}
                {onAssigneesChange && availableMembers.length > 0 && (
                  <div className="relative inline-block">
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddAssignee(e.target.value);
                          e.target.value = "";
                        }
                      }}
                      className="py-1 pl-2 pr-5 text-xs bg-muted/40 hover:bg-muted/70 border border-dashed border-border/60 rounded-md text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer transition-colors"
                      title="Add assignee"
                    >
                      <option value="" disabled>
                        + Add assignee
                      </option>
                      {availableMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name || m.username}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Last Updated */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" />
                <span>Updated</span>
              </label>
              <div className="py-1.5 px-2.5 text-xs bg-background border border-input rounded-lg text-muted-foreground truncate">
                {formatDate(task.updated_at)}
              </div>
            </div>

            {/* Created At */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Calendar className="size-3" />
                <span>Created</span>
              </label>
              <div className="py-1.5 px-2.5 text-xs bg-background border border-input rounded-lg text-muted-foreground truncate">
                {formatDate(task.created_at)}
              </div>
            </div>
          </div>

          {/* Description Section with comfortable scroll container */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Description
              </h3>
            </div>

            <div className="p-4 rounded-xl border border-border/40 bg-muted/10 text-sm text-foreground/90 leading-relaxed min-h-[140px] max-h-[380px] overflow-y-auto whitespace-pre-wrap break-words">
              {formattedDesc ? (
                formattedDesc
              ) : (
                <span className="italic text-muted-foreground/60 text-xs">
                  No description provided for this task.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="flex items-center justify-between gap-3 border-t border-border/40 bg-muted/20 px-6 py-3">
          <span className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 text-[10px] bg-muted border border-border/60 rounded font-mono">Esc</kbd> to close
          </span>

          <a
            href={taskUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <span>Open in project</span>
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      </aside>
    </>
  );
};
