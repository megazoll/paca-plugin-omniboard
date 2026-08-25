import React, { useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { ProjectInfo } from "../types";
import { ProjectSelector } from "./ProjectSelector";

interface AddTaskRowProps {
  projects: ProjectInfo[];
  defaultProjectId?: string;
  onAdd: (title: string, projectId: string) => Promise<void> | void;
  /** "board" renders card-style box; "list" renders inline row */
  variant?: "board" | "list";
  label?: string;
  placeholder?: string;
  isSubmitting?: boolean;
}

export const AddTaskRow: React.FC<AddTaskRowProps> = ({
  projects,
  defaultProjectId,
  onAdd,
  variant = "board",
  label = "Add task",
  placeholder = "What needs to be done?",
  isSubmitting = false,
}) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const effectiveProjectId =
    selectedProjectId ||
    defaultProjectId ||
    (projects.length > 0 ? projects[0].id : "");

  const openForm = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const submit = async () => {
    const title = value.trim();
    if (!title || !effectiveProjectId || isSubmitting) return;
    try {
      await onAdd(title, effectiveProjectId);
      setValue("");
      setSelectedProjectId(null);
      setOpen(false);
    } catch {
      // Keep open if error occurs
    }
  };

  const cancel = () => {
    setValue("");
    setSelectedProjectId(null);
    setOpen(false);
  };

  // Project selector component
  const projectSelector = projects.length > 0 && (
    <ProjectSelector
      projects={projects}
      value={effectiveProjectId}
      onChange={setSelectedProjectId}
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
        {projectSelector && (
          <div className="flex items-center gap-1.5 mb-2">{projectSelector}</div>
        )}
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
      <div className="flex items-center gap-2">
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
          className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/50 text-foreground"
        />
        {actionButtons}
      </div>
    </div>
  );
};
