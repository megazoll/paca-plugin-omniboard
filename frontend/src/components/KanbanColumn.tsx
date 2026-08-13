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
    <div className="flex flex-col flex-1 min-w-[280px] max-w-[350px] bg-muted/20 border border-border rounded-xl p-3 h-full max-h-[calc(100vh-220px)]">
      {/* Column Header */}
      <div className="flex items-center justify-between gap-2 pb-3 px-1 border-b border-border/60 mb-3">
        <div className="flex items-center gap-2">
          <span
            className="size-3 rounded-full shrink-0"
            style={{ backgroundColor: column.color || "#64748b" }}
          />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            {column.title}
          </h3>
        </div>
        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-muted text-muted-foreground border border-border">
          {tasks.length}
        </span>
      </div>

      {/* Column Body: Cards List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            allStatuses={allStatuses}
            onStatusChange={onStatusChange}
            onCardClick={onCardClick}
          />
        ))}

        {tasks.length === 0 && (
          <div className="flex items-center justify-center p-8 border border-dashed border-border/80 rounded-lg text-xs text-muted-foreground italic">
            No tasks in {column.title}
          </div>
        )}
      </div>
    </div>
  );
};
