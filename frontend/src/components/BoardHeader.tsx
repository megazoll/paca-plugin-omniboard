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
    <div className="flex flex-col gap-3.5 border-b border-border/40 pb-4 mb-3 px-6 pt-5">
      {/* Top Row: Title, Board Switcher & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Kanban className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground tracking-tight">
                {activeBoard?.name || "Omniboard"}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md bg-primary/10 text-primary border border-primary/20">
                Multi-Project
              </span>
            </div>
            <p className="text-xs text-muted-foreground/80">
              {activeBoard?.description || "Cross-project Kanban board"}
            </p>
          </div>
        </div>

        {/* Board Switcher Controls */}
        <div className="flex items-center gap-2">
          {boards.length > 0 && (
            <select
              className="h-8.5 px-3 py-1 bg-background border border-border/60 rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
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
            className="h-8.5 px-3 flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-xs"
            title="Create new board"
          >
            <Plus className="size-3.5" />
            <span>New Board</span>
          </button>

          {activeBoard && (
            <button
              type="button"
              onClick={onSettingsClick}
              className="h-8.5 px-3 flex items-center gap-1.5 bg-muted/60 text-foreground border border-border/50 text-xs font-medium rounded-lg hover:bg-muted transition-colors"
              title="Board settings"
            >
              <Settings className="size-3.5 text-muted-foreground" />
              <span>Settings</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            className={`size-8.5 flex items-center justify-center border border-border/50 rounded-lg hover:bg-muted/60 transition-colors ${
              isFetching ? "animate-spin text-primary" : "text-muted-foreground"
            }`}
            title="Refresh tasks"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        {/* Search Text */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter tasks..."
            value={filters.search || ""}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="w-full h-8 pl-8 pr-3 text-xs bg-muted/20 border border-border/40 rounded-lg placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
          />
        </div>

        {/* Project Filter */}
        {projects.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Layers className="size-3.5 text-muted-foreground/60" />
            <select
              value={filters.projectId || ""}
              onChange={(e) => onFilterChange({ ...filters, projectId: e.target.value || undefined })}
              className="h-8 px-2.5 text-xs bg-muted/20 border border-border/40 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            >
              <option value="">All Projects</option>
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
          className="h-8 px-2.5 text-xs bg-muted/20 border border-border/40 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
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
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
};
