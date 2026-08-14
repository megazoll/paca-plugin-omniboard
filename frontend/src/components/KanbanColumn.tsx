import React from "react";
import type { ColumnConfig, CrossProjectTask, StatusInfo } from "../types";
import { KanbanCard } from "./KanbanCard";

interface KanbanColumnProps {
  column: ColumnConfig;
  tasks: CrossProjectTask[];
  allStatuses: StatusInfo[];
  onStatusChange: (taskId: string, newStatusId: string) => void;
  onCardClick?: (task: CrossProjectTask) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  allStatuses,
  onStatusChange,
  onCardClick,
}) => {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-2.5">
      {/* Column Header matching PACA Board View */}
      <div className="flex items-center gap-2 px-2 pb-1 group">
        {column.color && (
          <span
            className="size-1.75 rounded-full shrink-0"
            style={{
              background: column.color,
              boxShadow: `0 0 6px ${column.color}40`,
            }}
          />
        )}
        <span className="text-xs font-bold text-foreground/80 tracking-[0.08em] uppercase flex-1 truncate">
          {column.title}
        </span>
        <span className="rounded-full bg-muted/60 px-2 py-0.5 text-xs font-bold text-muted-foreground/70 tabular-nums">
          {tasks.length}
        </span>
      </div>

      {/* Column Body matching PACA Column Cards Slot */}
      <div className="flex flex-col gap-2 rounded-xl p-2 min-h-28 transition-all duration-200 bg-muted/40 dark:bg-muted">
        {tasks.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center py-6 text-muted-foreground/30">
            <p className="text-sm">No tasks</p>
          </div>
        )}
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            allStatuses={allStatuses}
            onStatusChange={onStatusChange}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </div>
  );
};
