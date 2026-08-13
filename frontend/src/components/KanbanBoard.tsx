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
  columns: rawColumns,
  tasks: rawTasks,
  allStatuses,
  onStatusChange,
  onCardClick,
}) => {
  const columns = Array.isArray(rawColumns) ? rawColumns : [];
  const tasks = Array.isArray(rawTasks) ? rawTasks : [];

  const normalize = (str?: string) => (str || "").toLowerCase().replace(/[\s_-]/g, "");

  const isTaskInColumn = (t: CrossProjectTask, col: ColumnConfig): boolean => {
    const taskCat = normalize(t.status_category);
    const taskName = normalize(t.status_name);

    if (col.status_categories && col.status_categories.length > 0) {
      const catMatch = col.status_categories.some((c) => {
        const normC = normalize(c);
        if (!normC || !taskCat) return normC === taskCat;
        return normC === taskCat || normC.includes(taskCat) || taskCat.includes(normC);
      });
      if (catMatch) return true;
    }

    if (col.status_names && col.status_names.length > 0) {
      const nameMatch = col.status_names.some((n) => normalize(n) === taskName);
      if (nameMatch) return true;
    }

    return false;
  };

  // Helper to categorize tasks per column
  const getTasksForColumn = (col: ColumnConfig, colIndex: number) => {
    return tasks.filter((t) => {
      if (isTaskInColumn(t, col)) return true;

      // If task does not match any column, put it in the first column as fallback
      if (colIndex === 0) {
        const matchesOtherCol = columns.some((c, idx) => idx !== 0 && isTaskInColumn(t, c));
        return !matchesOtherCol;
      }

      return false;
    });
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 h-full items-start">
      {columns.map((col, idx) => {
        const colTasks = getTasksForColumn(col, idx);
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
