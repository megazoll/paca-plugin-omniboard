import React, { useMemo } from "react";
import type { ColumnConfig, CrossProjectTask, ProjectInfo, StatusInfo } from "../types";
import { KanbanColumn } from "./KanbanColumn";

interface KanbanBoardProps {
  columns: ColumnConfig[];
  tasks: CrossProjectTask[];
  allStatuses: StatusInfo[];
  projects?: ProjectInfo[];
  defaultProjectId?: string;
  boardFilters?: Record<string, any>;
  onStatusChange: (taskId: string, newStatusId: string) => void;
  onCardClick?: (task: CrossProjectTask) => void;
  onCreateTask?: (title: string, projectId: string, column: ColumnConfig) => Promise<void> | void;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "col-backlog", title: "Backlog", status_categories: ["backlog"], color: "#64748b" },
  { id: "col-todo", title: "To Do", status_categories: ["todo", "to_do", "open"], color: "#eab308" },
  { id: "col-inprogress", title: "In Progress", status_categories: ["inprogress", "in_progress", "in_review", "doing"], color: "#3b82f6" },
  { id: "col-done", title: "Done", status_categories: ["done", "completed", "closed", "resolved"], color: "#22c55e" },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns: rawColumns,
  tasks: rawTasks,
  allStatuses,
  projects = [],
  defaultProjectId,
  boardFilters,
  onStatusChange,
  onCardClick,
  onCreateTask,
}) => {
  const columns = Array.isArray(rawColumns) && rawColumns.length > 0 ? rawColumns : DEFAULT_COLUMNS;
  const tasks = Array.isArray(rawTasks) ? rawTasks : [];

  const normalize = (str?: string) => (str || "").toLowerCase().replace(/[\s_-]/g, "");

  const isTaskVisible = (t: CrossProjectTask): boolean => {
    // 1. Hide subtasks rule
    if (boardFilters?.hide_subtasks && t.parent_task_id) {
      return false;
    }
    // 2. Done tasks retention period rule
    const retentionDays = Number(boardFilters?.done_retention_days || 0);
    if (retentionDays > 0) {
      const cat = normalize(t.status_category);
      const isDone = cat === "done" || cat === "completed" || cat === "closed" || cat === "resolved";
      if (isDone && t.updated_at) {
        const updatedTime = new Date(t.updated_at).getTime();
        const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
        if (updatedTime < cutoffTime) {
          return false;
        }
      }
    }
    return true;
  };

  const visibleTasks = useMemo(() => {
    return tasks.filter(isTaskVisible);
  }, [tasks, boardFilters]);

  const isTaskInColumn = (t: CrossProjectTask, col: ColumnConfig): boolean => {
    const taskCat = normalize(t.status_category);
    const taskName = normalize(t.status_name);
    const colTitle = normalize(col.title);

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

    // Direct title matching fallback
    if (colTitle && (colTitle === taskCat || colTitle === taskName)) {
      return true;
    }

    return false;
  };

  // Helper to categorize tasks per column
  const getTasksForColumn = (col: ColumnConfig, colIndex: number) => {
    return visibleTasks.filter((t) => {
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
    <div className="flex flex-1 min-h-0 items-start gap-4 overflow-auto px-6 py-5 pb-8">
      {columns.map((col, idx) => {
        const colTasks = getTasksForColumn(col, idx);
        return (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={colTasks}
            allStatuses={allStatuses}
            projects={projects}
            defaultProjectId={defaultProjectId}
            boardFilters={boardFilters}
            onStatusChange={onStatusChange}
            onCardClick={onCardClick}
            onCreateTask={onCreateTask}
          />
        );
      })}
    </div>
  );
};

