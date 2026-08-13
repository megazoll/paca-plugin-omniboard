import React from "react";
import type { ColumnConfig, CrossProjectTask, StatusInfo } from "../types";
import { KanbanColumn } from "./KanbanColumn";

interface KanbanBoardProps {
  columns: ColumnConfig[];
  tasks: CrossProjectTask[];
  allStatuses: StatusInfo[];
  onStatusChange: (taskId: string, newStatusId: string) => void;
  onCardClick?: (task: CrossProjectTask) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns,
  tasks,
  allStatuses,
  onStatusChange,
  onCardClick,
}) => {
  // Helper to categorize tasks per column
  const getTasksForColumn = (col: ColumnConfig) => {
    return tasks.filter((t) => {
      const catMatch =
        col.status_categories &&
        t.status_category &&
        col.status_categories.some((c) => c.toLowerCase() === t.status_category.toLowerCase());

      const nameMatch =
        col.status_names &&
        t.status_name &&
        col.status_names.some((n) => n.toLowerCase() === t.status_name.toLowerCase());

      return catMatch || nameMatch;
    });
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 h-full items-start">
      {columns.map((col) => {
        const colTasks = getTasksForColumn(col);
        return (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={colTasks}
            allStatuses={allStatuses}
            onStatusChange={onStatusChange}
            onCardClick={onCardClick}
          />
        );
      })}
    </div>
  );
};
