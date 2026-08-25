import React, { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { getTaskTypeIconComponent } from "./TaskTypeIcons";
import type { TaskTypeInfo } from "../types";

interface TaskTypeSelectorProps {
  taskTypes: TaskTypeInfo[];
  value: string | null | undefined;
  fallbackName?: string | null;
  fallbackIcon?: string | null;
  fallbackColor?: string | null;
  onChange?: (taskTypeId: string) => void;
  canEdit?: boolean;
  align?: "start" | "end" | "center";
}

/**
 * Badge + dropdown for picking or displaying a task's type.
 */
export const TaskTypeSelector: React.FC<TaskTypeSelectorProps> = ({
  taskTypes,
  value,
  fallbackName,
  fallbackIcon,
  fallbackColor,
  onChange,
  canEdit = true,
  align = "start",
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const taskType = taskTypes.find((tt) => tt.id === value);
  const typeName = taskType?.name || fallbackName;
  const typeIcon = taskType?.icon || fallbackIcon;
  const typeColor = taskType?.color || fallbackColor;

  const Icon = getTaskTypeIconComponent(typeIcon);

  // Close on outside click / escape
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

  const badgeStyle: React.CSSProperties | undefined = typeColor
    ? {
        borderColor: `${typeColor}44`,
        backgroundColor: `${typeColor}15`,
        color: typeColor,
      }
    : undefined;

  const badgeContent = typeName ? (
    <>
      {Icon && <Icon className="size-3 shrink-0" />}
      <span className="truncate">{typeName}</span>
    </>
  ) : (
    <span className="text-muted-foreground/50">No type</span>
  );

  if (!canEdit || taskTypes.length === 0) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-bold leading-tight tracking-wide border border-border/40 bg-muted/40 text-foreground truncate max-w-full"
        style={badgeStyle}
      >
        {badgeContent}
      </span>
    );
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-bold leading-tight tracking-wide border border-border/40 bg-muted/30 text-foreground hover:opacity-80 transition-all duration-150 truncate max-w-full cursor-pointer"
        style={badgeStyle}
        title="Change task type"
      >
        {badgeContent}
      </button>

      {open && (
        <div
          className={`absolute ${
            align === "end" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0"
          } mt-1.5 w-48 p-1 rounded-xl border border-border/40 bg-popover text-popover-foreground shadow-lg z-50 animate-in fade-in-0 zoom-in-95 duration-100 max-h-60 overflow-y-auto`}
        >
          {taskTypes.map((tt) => {
            const TtIcon = getTaskTypeIconComponent(tt.icon);
            const isSelected = tt.id === value;
            return (
              <button
                key={tt.id}
                type="button"
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted/60 text-left ${
                  isSelected ? "bg-muted/40 font-semibold text-primary" : "text-foreground"
                }`}
                onClick={() => {
                  onChange?.(tt.id);
                  setOpen(false);
                }}
              >
                {TtIcon && (
                  <TtIcon
                    className="size-3.5 shrink-0"
                    style={tt.color ? { color: tt.color } : undefined}
                  />
                )}
                <span className="flex-1 truncate">{tt.name}</span>
                {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
