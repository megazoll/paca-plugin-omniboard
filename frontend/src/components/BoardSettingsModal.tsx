import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Check, LayoutGrid } from "lucide-react";
import type { ColumnConfig, Omniboard, ProjectInfo, StatusInfo } from "../types";

interface BoardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Omniboard | null;
  projects: ProjectInfo[];
  statuses: StatusInfo[];
  onSave: (data: {
    name: string;
    description: string;
    project_ids: string[];
    column_config: ColumnConfig[];
  }) => void;
  onDelete?: () => void;
  isSaving?: boolean;
}

export const BoardSettingsModal: React.FC<BoardSettingsModalProps> = ({
  isOpen,
  onClose,
  board,
  projects,
  statuses,
  onSave,
  onDelete,
  isSaving,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setConfirmDelete(false);
    if (board) {
      setName(board.name || "");
      setDescription(board.description || "");
      setSelectedProjectIds(board.project_ids || []);
      setColumns(
        board.column_config && board.column_config.length > 0
          ? board.column_config
          : [
              { id: "col-backlog", title: "Backlog", status_categories: ["backlog"], color: "#64748b" },
              { id: "col-todo", title: "To Do", status_categories: ["todo"], color: "#eab308" },
              { id: "col-inprogress", title: "In Progress", status_categories: ["inprogress"], color: "#3b82f6" },
              { id: "col-done", title: "Done", status_categories: ["done"], color: "#22c55e" },
            ]
      );
    } else {
      setName("New Omniboard");
      setDescription("");
      setSelectedProjectIds([]);
      setColumns([
        { id: "col-backlog", title: "Backlog", status_categories: ["backlog"], color: "#64748b" },
        { id: "col-todo", title: "To Do", status_categories: ["todo"], color: "#eab308" },
        { id: "col-inprogress", title: "In Progress", status_categories: ["inprogress"], color: "#3b82f6" },
        { id: "col-done", title: "Done", status_categories: ["done"], color: "#22c55e" },
      ]);
    }
  }, [board, isOpen]);

  if (!isOpen) return null;

  const handleToggleProject = (id: string) => {
    if (selectedProjectIds.includes(id)) {
      setSelectedProjectIds(selectedProjectIds.filter((p) => p !== id));
    } else {
      setSelectedProjectIds([...selectedProjectIds, id]);
    }
  };

  const handleSelectAllProjects = () => {
    if (selectedProjectIds.length === projects.length) {
      setSelectedProjectIds([]);
    } else {
      setSelectedProjectIds(projects.map((p) => p.id));
    }
  };

  const handleAddColumn = () => {
    const newCol: ColumnConfig = {
      id: `col-${Date.now()}`,
      title: "New Column",
      status_categories: ["todo"],
      color: "#6366f1",
    };
    setColumns([...columns, newCol]);
  };

  const handleUpdateColumn = (index: number, updated: Partial<ColumnConfig>) => {
    const newCols = [...columns];
    newCols[index] = { ...newCols[index], ...updated };
    setColumns(newCols);
  };

  const handleRemoveColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      project_ids: selectedProjectIds,
      column_config: columns,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <LayoutGrid className="size-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {board ? "Board Settings" : "Create New Board"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* General Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              General Info
            </h3>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Board Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cross-Project Sprint Board"
                className="w-full h-9 px-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional board description..."
                className="w-full h-9 px-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Projects Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Target Projects ({selectedProjectIds.length === 0 ? "All Projects" : `${selectedProjectIds.length} Selected`})
              </h3>
              <button
                type="button"
                onClick={handleSelectAllProjects}
                className="text-xs text-primary hover:underline font-medium"
              >
                {selectedProjectIds.length === projects.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-input rounded-md bg-muted/10">
              {projects.map((p) => {
                const isSelected = selectedProjectIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-2 p-2 rounded-md border text-sm cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primary/10 border-primary text-foreground font-medium"
                        : "bg-background border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleProject(p.id)}
                      className="rounded border-input text-primary focus:ring-primary size-4"
                    />
                    <span className="truncate">
                      <span className="font-semibold text-primary">[{p.task_id_prefix}]</span> {p.name}
                    </span>
                  </label>
                );
              })}
            </div>
            {selectedProjectIds.length === 0 && (
              <p className="text-xs text-muted-foreground">
                * When no projects are explicitly selected, tasks from ALL projects will be displayed.
              </p>
            )}
          </div>

          {/* Column Configuration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Kanban Columns ({columns.length})
              </h3>
              <button
                type="button"
                onClick={handleAddColumn}
                className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
              >
                <Plus className="size-3.5" />
                <span>Add Column</span>
              </button>
            </div>

            <div className="space-y-3">
              {columns.map((col, index) => (
                <div
                  key={col.id}
                  className="flex flex-wrap items-center gap-2 p-3 border border-border rounded-lg bg-card"
                >
                  {/* Color picker */}
                  <input
                    type="color"
                    value={col.color || "#64748b"}
                    onChange={(e) => handleUpdateColumn(index, { color: e.target.value })}
                    className="size-7 rounded cursor-pointer border border-input p-0 bg-transparent"
                    title="Column accent color"
                  />

                  {/* Title */}
                  <input
                    type="text"
                    value={col.title}
                    onChange={(e) => handleUpdateColumn(index, { title: e.target.value })}
                    placeholder="Column Name"
                    className="flex-1 min-w-[120px] h-8 px-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring font-medium"
                  />

                  {/* Mapped Categories */}
                  <select
                    value={col.status_categories?.[0] || "todo"}
                    onChange={(e) =>
                      handleUpdateColumn(index, { status_categories: [e.target.value] })
                    }
                    className="h-8 px-2 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="backlog">Category: Backlog</option>
                    <option value="todo">Category: To Do</option>
                    <option value="inprogress">Category: In Progress</option>
                    <option value="done">Category: Done</option>
                    <option value="cancel">Category: Cancelled</option>
                  </select>

                  {/* Delete column button */}
                  {columns.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveColumn(index)}
                      className="p-1 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                      title="Remove column"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-2 pt-4 border-t border-border">
            <div>
              {board && onDelete && (
                !confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="h-9 px-3 flex items-center gap-1.5 text-xs text-destructive border border-destructive/30 hover:bg-destructive/10 font-medium rounded-md transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Delete Board</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-destructive/10 border border-destructive/30 p-1 rounded-md">
                    <span className="text-xs text-destructive font-medium px-1">Delete this board?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete();
                        onClose();
                      }}
                      className="h-7 px-2 bg-destructive text-destructive-foreground text-xs font-semibold rounded hover:bg-destructive/90 transition-colors"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="h-7 px-2 text-xs font-medium hover:bg-accent rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="h-9 px-4 flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Check className="size-4" />
                <span>{isSaving ? "Saving..." : "Save Settings"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
