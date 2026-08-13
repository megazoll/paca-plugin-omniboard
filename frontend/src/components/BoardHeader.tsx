import React from "react";
import {
  Kanban,
  Plus,
  Settings,
  Search,
  RefreshCw,
  Layers,
} from "lucide-react";
import type { BoardFilters, Omniboard, ProjectInfo } from "../types";

interface BoardHeaderProps {
  boards: Omniboard[];
  activeBoard: Omniboard | null;
  projects: ProjectInfo[];
  filters: BoardFilters;
  onSelectBoard: (boardId: string) => void;
  onCreateBoardClick: () => void;
  onSettingsClick: () => void;
  onFilterChange: (newFilters: BoardFilters) => void;
  onRefresh: () => void;
  isFetching?: boolean;
}

export const BoardHeader: React.FC<BoardHeaderProps> = ({
  boards,
  activeBoard,
  projects,
  filters,
  onSelectBoard,
  onCreateBoardClick,
  onSettingsClick,
  onFilterChange,
  onRefresh,
  isFetching,
}) => {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-4 mb-4">
      {/* Top Row: Title, Board Switcher & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Kanban className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">Omniboard</h1>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
                Multi-Project
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Cross-project Kanban board for PACA AI
            </p>
          </div>
        </div>

        {/* Board Switcher Controls */}
        <div className="flex items-center gap-2">
          {boards.length > 0 && (
            <select
              className="h-9 px-3 py-1 bg-background border border-input rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              value={activeBoard?.id || ""}
              onChange={(e) => onSelectBoard(e.target.value)}
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.project_ids.length > 0 ? `${b.project_ids.length} projects` : "All projects"})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={onCreateBoardClick}
            className="h-9 px-3 flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
            title="Create new board"
          >
            <Plus className="size-4" />
            <span>New Board</span>
          </button>

          {activeBoard && (
            <button
              type="button"
              onClick={onSettingsClick}
              className="h-9 px-3 flex items-center gap-1.5 bg-secondary text-secondary-foreground border border-input text-sm font-medium rounded-md hover:bg-secondary/80 transition-colors"
              title="Board settings"
            >
              <Settings className="size-4" />
              <span>Settings</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            className={`h-9 w-9 flex items-center justify-center border border-input rounded-md hover:bg-accent transition-colors ${
              isFetching ? "animate-spin text-primary" : "text-muted-foreground"
            }`}
            title="Refresh tasks"
          >
            <RefreshCw className="size-4" />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        {/* Search Text */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by title, description or KEY-123..."
            value={filters.search || ""}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="w-full h-9 pl-9 pr-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Project Filter */}
        {projects.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Layers className="size-4 text-muted-foreground" />
            <select
              value={filters.projectId || ""}
              onChange={(e) => onFilterChange({ ...filters, projectId: e.target.value || undefined })}
              className="h-9 px-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Board Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.task_id_prefix}] {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Priority Filter */}
        <select
          value={filters.priority || ""}
          onChange={(e) => onFilterChange({ ...filters, priority: e.target.value || undefined })}
          className="h-9 px-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Clear filters button */}
        {(filters.search || filters.projectId || filters.priority || filters.assigneeId) && (
          <button
            type="button"
            onClick={() => onFilterChange({})}
            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
};
