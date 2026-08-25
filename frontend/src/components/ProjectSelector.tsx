import React, { useEffect, useRef, useState } from "react";
import { Check, FolderKanban } from "lucide-react";
import type { ProjectInfo } from "../types";

interface ProjectSelectorProps {
  projects: ProjectInfo[];
  value: string | null | undefined;
  onChange?: (projectId: string) => void;
  canEdit?: boolean;
  align?: "start" | "end" | "center";
}

/**
 * Badge + dropdown for picking a project.
 * Designed analogously to TaskTypeSelector on the system project board.
 */
export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  value,
  onChange,
  canEdit = true,
  align = "start",
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedProject =
    projects.find((p) => p.id === value) ?? projects[0] ?? null;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const badgeContent = selectedProject ? (
    <>
      <FolderKanban className="size-3 shrink-0 text-primary" />
      <span className="truncate">{selectedProject.name}</span>
      {selectedProject.task_id_prefix && (
        <span className="font-mono text-[10px] text-muted-foreground/70 font-semibold uppercase">
          {selectedProject.task_id_prefix}
        </span>
      )}
    </>
  ) : (
    <span className="text-muted-foreground/50">Select project</span>
  );

  if (!canEdit || projects.length <= 1) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-bold leading-tight tracking-wide border border-border/40 bg-muted/40 text-foreground truncate max-w-full">
        {badgeContent}
      </span>
    );
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-bold leading-tight tracking-wide border border-border/40 bg-muted/30 text-foreground hover:bg-muted/60 hover:opacity-80 transition-all duration-150 truncate max-w-full cursor-pointer"
      >
        {badgeContent}
      </button>

      {open && (
        <div
          className={`absolute ${
            align === "end" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0"
          } mt-1.5 w-56 p-1 rounded-xl border border-border/40 bg-popover text-popover-foreground shadow-lg z-50 animate-in fade-in-0 zoom-in-95 duration-100 max-h-60 overflow-y-auto`}
        >
          {projects.map((p) => {
            const isSelected = p.id === (selectedProject?.id || value);
            return (
              <button
                key={p.id}
                type="button"
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted/60 text-left ${
                  isSelected ? "bg-muted/40 font-semibold text-primary" : "text-foreground"
                }`}
                onClick={() => {
                  onChange?.(p.id);
                  setOpen(false);
                }}
              >
                <FolderKanban className="size-3.5 shrink-0 text-primary/70" />
                <span className="flex-1 truncate">{p.name}</span>
                {p.task_id_prefix && (
                  <span className="font-mono text-[10px] text-muted-foreground/70 px-1 py-0.5 rounded bg-muted/50 shrink-0">
                    {p.task_id_prefix}
                  </span>
                )}
                {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
