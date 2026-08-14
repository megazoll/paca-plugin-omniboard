import React from "react";
import {
  KanbanSquare,
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
    <div className="flex flex-col shrink-0 border-b border-border/25 bg-background">
      {/* Top Title Row matching PACA InteractionLayout */}
      <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <KanbanSquare className="size-6 text-primary shrink-0" />
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              {activeBoard?.name || "Omniboard"}
            </h1>
            {boards.length > 1 && (
              <select
                className="h-7 px-2 py-0.5 bg-muted/40 border border-border/40 rounded-md text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer ml-1"
                value={activeBoard?.id || ""}
                onChange={(e) => onSelectBoard(e.target.value)}
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCreateBoardClick}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all duration-150"
            title="Create new board"
          >
            <Plus className="size-3.5 shrink-0" />
            <span>New Board</span>
          </button>

          {activeBoard && (
            <button
              type="button"
              onClick={onSettingsClick}
              className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/20 px-2.5 py-1.5 text-xs font-medium text-muted-foreground/80 hover:text-foreground hover:bg-muted/40 transition-all duration-150"
              title="Board settings"
            >
              <Settings className="size-3.5" />
              <span>Settings</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            className={`flex size-7.5 items-center justify-center rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/40 transition-all duration-150 ${
              isFetching ? "animate-spin text-primary" : "text-muted-foreground/70 hover:text-foreground"
            }`}
            title="Refresh tasks"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Filter / Search Bar matching PACA View Tab sub-bar */}
      <div className="flex items-center gap-3 border-t border-border/20 bg-muted/10 px-6 py-2">
        {/* Search Input */}
        <div className="relative flex items-center min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={filters.search || ""}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="w-full h-7.5 pl-8 pr-3 text-xs bg-muted/25 border border-border/30 rounded-lg placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/40 transition-all"
          />
        </div>

        {/* Project Filter */}
        {projects.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Layers className="size-3.5 text-muted-foreground/50" />
            <select
              value={filters.projectId || ""}
              onChange={(e) => onFilterChange({ ...filters, projectId: e.target.value || undefined })}
              className="h-7.5 px-2 text-xs bg-muted/25 border border-border/30 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer"
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
          className="h-7.5 px-2 text-xs bg-muted/25 border border-border/30 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer"
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Clear Filters */}
        {(filters.search || filters.projectId || filters.priority || filters.assigneeId) && (
          <button
            type="button"
            onClick={() => onFilterChange({})}
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
};
