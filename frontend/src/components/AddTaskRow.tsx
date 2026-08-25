import React, { useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { ProjectInfo, TaskTypeInfo } from "../types";
import { ProjectSelector } from "./ProjectSelector";
import { TaskTypeSelector } from "./TaskTypeSelector";

interface AddTaskRowProps {
  projects: ProjectInfo[];
  defaultProjectId?: string;
  taskTypes?: TaskTypeInfo[];
  onAdd: (title: string, projectId: string, taskTypeId: string | null) => Promise<void> | void;
  /** "board" renders card-style box; "list" renders inline row */
  variant?: "board" | "list";
  label?: string;
  placeholder?: string;
  isSubmitting?: boolean;
}

export const AddTaskRow: React.FC<AddTaskRowProps> = ({
  projects,
  defaultProjectId,
  taskTypes = [],
  onAdd,
  variant = "board",
  label = "Add task",
  placeholder = "What needs to be done?",
  isSubmitting = false,
}) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const effectiveProjectId =
    selectedProjectId ||
    defaultProjectId ||
    (projects.length > 0 ? projects[0].id : "");

  const projectTaskTypes = useMemo(() => {
    if (!taskTypes || taskTypes.length === 0) return [];
    const filtered = taskTypes.filter(
      (tt) => !tt.project_id || tt.project_id === effectiveProjectId
    );
    return filtered.length > 0 ? filtered : taskTypes;
  }, [taskTypes, effectiveProjectId]);

  const defaultType =
    projectTaskTypes.find((tt) => tt.is_default) ?? projectTaskTypes[0] ?? null;
  const selectedType =
    projectTaskTypes.find((tt) => tt.id === selectedTypeId) ?? defaultType;

  const openForm = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const submit = async () => {
    const title = value.trim();
    if (!title || !effectiveProjectId || isSubmitting) return;
    try {
      await onAdd(title, effectiveProjectId, selectedType?.id ?? null);
      setValue("");
      setSelectedProjectId(null);
      setSelectedTypeId(null);
      setOpen(false);
    } catch {
      // Keep open if error occurs
    }
  };

  const cancel = () => {
    setValue("");
    setSelectedProjectId(null);
    setSelectedTypeId(null);
    setOpen(false);
  };

  // Project selector component
  const projectSelector = projects.length > 0 && (
    <ProjectSelector
      projects={projects}
      value={effectiveProjectId}
      onChange={(pid) => {
        setSelectedProjectId(pid);
        setSelectedTypeId(null);
      }}
    />
  );

  // Task type selector component
  const taskTypeSelector = projectTaskTypes.length > 0 && selectedType && (
    <TaskTypeSelector
      taskTypes={projectTaskTypes}
      value={selectedType.id}
      onChange={setSelectedTypeId}
    />
  );

  // Action buttons matching system PACA AddTaskRow
  const actionButtons = (
    <>
      <button
        type="button"
        onClick={cancel}
        disabled={isSubmitting}
        className="flex items-center gap-1.5 rounded-lg bg-muted/40 text-muted-foreground/80 hover:bg-muted/60 hover:text-foreground px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={submit}
        disabled={!value.trim() || !effectiveProjectId || isSubmitting}
        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-xs disabled:opacity-40 transition-all duration-150 cursor-pointer"
      >
        {isSubmitting ? "Creating..." : "Create"}
      </button>
    </>
  );

  // ── Closed state ──────────────────────────────────────────────────────────
  if (!open) {
    if (variant === "board") {
      return (
        <button
          type="button"
          onClick={openForm}
          className="flex w-full items-center gap-1.5 rounded-lg bg-primary/8 text-primary/80 hover:bg-primary/15 hover:text-primary px-2.5 py-1.5 text-sm font-semibold transition-all duration-150 cursor-pointer"
        >
          <Plus className="size-3" />
          {label}
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={openForm}
        className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-muted-foreground/70 hover:text-foreground hover:bg-muted/30 transition-all duration-150 w-full cursor-pointer"
      >
        <Plus className="size-3" />
        {label}
      </button>
    );
  }

  // ── Open state: board variant ─────────────────────────────────────────────
  if (variant === "board") {
    return (
      <div className="rounded-xl border border-border/30 bg-card/50 p-2.5 shadow-xs">
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {taskTypeSelector}
          {projectSelector}
        </div>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") cancel();
          }}
          placeholder={placeholder}
          disabled={isSubmitting}
          className="w-full rounded-lg border border-border/30 bg-muted/15 px-3 py-2 text-sm font-medium outline-none placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all duration-150 text-foreground"
        />
        <div className="mt-2 flex items-center gap-1.5 justify-end">
          {actionButtons}
        </div>
      </div>
    );
  }

  // ── Open state: list variant ──────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-1.5 px-4 py-2.5 border-b border-border/20">
      <div className="flex items-center gap-2 flex-wrap">
        {taskTypeSelector}
        {projectSelector}
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") cancel();
          }}
          placeholder={placeholder}
          disabled={isSubmitting}
          className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/50 text-foreground min-w-[150px]"
        />
        {actionButtons}
      </div>
    </div>
  );
};
