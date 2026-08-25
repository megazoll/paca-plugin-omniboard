import { useState, useMemo, useEffect } from "react";
import { PluginQueryClientProvider } from "@paca-ai/plugin-sdk-react";
import type { ProjectPageProps } from "@paca-ai/plugin-sdk-react";
import { BoardHeader } from "./components/BoardHeader";
import { BoardSettingsModal } from "./components/BoardSettingsModal";
import { KanbanBoard } from "./components/KanbanBoard";
import { TaskDetailSidebar } from "./components/TaskDetailSidebar";
import {
  useOmniboards,
  useOmniboardTasks,
  useOmniboardProjects,
  useOmniboardStatuses,
  useOmniboardTaskTypes,
  useOmniboardMembers,
  useCreateOmniboard,
  useUpdateOmniboard,
  useDeleteOmniboard,
  useUpdateTaskStatus,
  useUpdateTaskType,
  useUpdateTaskDescription,
  useUpdateTaskAssignees,
  useCreateOmniboardTask,
} from "./api";
import { resolveStatusForColumn } from "./lib/utils";
import type { BoardFilters, Omniboard, ColumnConfig, CrossProjectTask } from "./types";

export default function ProjectOmniboardPage(props: ProjectPageProps) {
  return (
    <PluginQueryClientProvider>
      <Content {...props} />
    </PluginQueryClientProvider>
  );
}

function Content(props: ProjectPageProps) {
  const { api, ui } = props;
  const scope = "project";
  const { data: boards = [], isLoading: loadingBoards } = useOmniboards(api, scope);
  const { data: projects = [] } = useOmniboardProjects(api, scope);
  const { data: statuses = [] } = useOmniboardStatuses(api, scope);
  const { data: taskTypes = [] } = useOmniboardTaskTypes(api, scope);
  const { data: members = [] } = useOmniboardMembers(api, scope);

  // Initialize activeBoardId from URL search param if present
  const getInitialBoardId = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("boardId") || "";
    } catch {
      return "";
    }
  };

  const [activeBoardId, setActiveBoardId] = useState<string>(getInitialBoardId);
  const [filters, setFilters] = useState<BoardFilters>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CrossProjectTask | null>(null);

  // Active board selection
  const activeBoard = useMemo<Omniboard | null>(() => {
    if (activeBoardId) {
      const found = boards.find((b) => b.id === activeBoardId);
      if (found) return found;
    }
    return boards.length > 0 ? boards[0] : null;
  }, [boards, activeBoardId]);

  const currentBoardId = activeBoard?.id || "";

  // Sync URL search param when board changes
  const handleSelectBoard = (newBoardId: string) => {
    setActiveBoardId(newBoardId);
    try {
      const url = new URL(window.location.href);
      if (newBoardId) {
        url.searchParams.set("boardId", newBoardId);
      } else {
        url.searchParams.delete("boardId");
      }
      window.history.replaceState({}, "", url.toString());
    } catch {
      // Ignore
    }
  };

  // Sync activeBoardId when boards load
  useEffect(() => {
    if (!activeBoardId && boards.length > 0) {
      const initId = getInitialBoardId();
      if (initId && boards.some((b) => b.id === initId)) {
        setActiveBoardId(initId);
      } else {
        setActiveBoardId(boards[0].id);
      }
    }
  }, [boards, activeBoardId]);

  const {
    data: tasks = [],
    isFetching,
    refetch,
  } = useOmniboardTasks(api, currentBoardId, filters, scope);

  // Extract unique assignees present on current board tasks (deduplicated by person)
  const assignees = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const t of tasks) {
      if (t.assignees && t.assignees.length > 0) {
        for (const a of t.assignees) {
          if (a.name && a.name.trim()) {
            const name = a.name.trim();
            if (!map.has(name)) {
              map.set(name, { id: a.id || name, name });
            }
          }
        }
      } else if (t.assignee_name && t.assignee_name.trim()) {
        const name = t.assignee_name.trim();
        if (!map.has(name)) {
          map.set(name, {
            id: t.assignee_id || name,
            name: name,
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  const createMutation = useCreateOmniboard(api, scope);
  const updateMutation = useUpdateOmniboard(api, scope);
  const deleteMutation = useDeleteOmniboard(api, scope);
  const statusMutation = useUpdateTaskStatus(api, scope);
  const typeMutation = useUpdateTaskType(api, scope);
  const descriptionMutation = useUpdateTaskDescription(api, scope);
  const assigneesMutation = useUpdateTaskAssignees(api, scope);
  const createTaskMutation = useCreateOmniboardTask(api, scope);

  // Projects available on the active board
  const boardProjects = useMemo(() => {
    if (!activeBoard) return projects;
    if (activeBoard.project_ids && activeBoard.project_ids.length > 0) {
      return projects.filter((p) => activeBoard.project_ids.includes(p.id));
    }
    return projects;
  }, [projects, activeBoard]);

  const defaultProjectId = useMemo(() => {
    if (filters.projectId) return filters.projectId;
    if (api.projectId && boardProjects.some((p) => p.id === api.projectId)) {
      return api.projectId;
    }
    return boardProjects.length > 0 ? boardProjects[0].id : "";
  }, [filters.projectId, api.projectId, boardProjects]);

  const handleCreateTask = async (
    title: string,
    projectId: string,
    taskTypeId: string | null,
    column: ColumnConfig
  ) => {
    const projectStatuses = statuses.filter((s) => s.project_id === projectId);
    const targetStatusId = resolveStatusForColumn(projectStatuses, column);

    try {
      await createTaskMutation.mutateAsync({
        project_id: projectId,
        title,
        status_id: targetStatusId,
        task_type_id: taskTypeId,
      });
      ui?.toast({ title: "Task created", variant: "success" });
    } catch (err: any) {
      ui?.toast({
        title: "Failed to create task",
        description: err?.message || "An error occurred",
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleCreateBoard = () => {
    createMutation.mutate(
      { name: "New Omniboard", scope },
      {
        onSuccess: (newBoard) => {
          handleSelectBoard(newBoard.id);
          setIsSettingsOpen(true);
          ui?.toast({ title: "Created new board", variant: "success" });
        },
      }
    );
  };

  const handleSaveSettings = (data: {
    name: string;
    description: string;
    project_ids: string[];
    column_config: ColumnConfig[];
    filters: Record<string, any>;
  }) => {
    if (!currentBoardId) return;
    updateMutation.mutate(
      { boardId: currentBoardId, input: data },
      {
        onSuccess: () => {
          setIsSettingsOpen(false);
          refetch();
          ui?.toast({ title: "Board settings saved", variant: "success" });
        },
      }
    );
  };

  const handleDeleteBoard = async () => {
    if (!currentBoardId) return;
    const ok = await ui?.confirm({
      title: "Delete Board?",
      description: `Are you sure you want to delete "${activeBoard?.name}"?`,
      variant: "destructive",
    });
    if (ok) {
      deleteMutation.mutate(currentBoardId, {
        onSuccess: () => {
          handleSelectBoard("");
          ui?.toast({ title: "Board deleted" });
        },
      });
    }
  };

  const handleStatusChange = (taskId: string, newStatusId: string) => {
    statusMutation.mutate(
      { taskId, statusId: newStatusId },
      {
        onSuccess: () => {
          ui?.toast({ title: "Task status updated", variant: "success" });
        },
      }
    );
  };

  const handleTypeChange = async (taskId: string, newTypeId: string) => {
    try {
      await typeMutation.mutateAsync({ taskId, taskTypeId: newTypeId });
      if (selectedTask && selectedTask.id === taskId) {
        const tt = taskTypes.find((t) => t.id === newTypeId);
        setSelectedTask({
          ...selectedTask,
          task_type_id: newTypeId,
          task_type_name: tt?.name || selectedTask.task_type_name,
          task_type_icon: tt?.icon || selectedTask.task_type_icon,
          task_type_color: tt?.color || selectedTask.task_type_color,
        });
      }
      ui?.toast({ title: "Task type updated", variant: "success" });
    } catch (err: any) {
      ui?.toast({
        title: "Failed to update task type",
        description: err?.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleDescriptionChange = async (taskId: string, newDescription: string) => {
    try {
      await descriptionMutation.mutateAsync({ taskId, description: newDescription });
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({
          ...selectedTask,
          description: newDescription,
        });
      }
      ui?.toast({ title: "Task description updated", variant: "success" });
    } catch (err: any) {
      ui?.toast({
        title: "Failed to update task description",
        description: err?.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleAssigneesChange = (taskId: string, memberIds: string[]) => {
    assigneesMutation.mutate(
      { taskId, memberIds },
      {
        onSuccess: () => {
          ui?.toast({ title: "Task assignees updated", variant: "success" });
        },
      }
    );
    if (selectedTask && selectedTask.id === taskId) {
      const updatedAssignees = memberIds
        .map((mid) => {
          const m = members.find((mem) => mem.id === mid);
          return m ? { id: m.id, name: m.name || m.username } : null;
        })
        .filter(Boolean) as { id: string; name: string }[];

      setSelectedTask({
        ...selectedTask,
        assignees: updatedAssignees,
        assignee_id: updatedAssignees[0]?.id || null,
        assignee_name: updatedAssignees[0]?.name || "",
      });
    }
  };

  // Open right sidebar when clicking a card
  const handleCardClick = (task: CrossProjectTask) => {
    setSelectedTask(task);
  };

  // Update status from within sidebar
  const handleSidebarStatusChange = (taskId: string, newStatusId: string) => {
    handleStatusChange(taskId, newStatusId);
    if (selectedTask && selectedTask.id === taskId) {
      const updatedStatus = statuses.find((s) => s.id === newStatusId);
      setSelectedTask({
        ...selectedTask,
        status_id: newStatusId,
        status_name: updatedStatus?.name || selectedTask.status_name,
        status_category: updatedStatus?.category || selectedTask.status_category,
        status_color: updatedStatus?.color || selectedTask.status_color,
      });
    }
  };

  // Navigate to full task detail page
  const handleNavigateToTask = (projectId: string, taskId: string) => {
    if (typeof (ui as any)?.navigate === "function") {
      (ui as any).navigate(`/projects/${projectId}/tasks/${taskId}`);
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      <BoardHeader
        boards={boards}
        activeBoard={activeBoard}
        projects={projects}
        assignees={assignees}
        filters={filters}
        onSelectBoard={handleSelectBoard}
        onCreateBoardClick={handleCreateBoard}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onFilterChange={setFilters}
        onRefresh={() => refetch()}
        isFetching={isFetching}
      />

      {loadingBoards && (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading boards...</div>
      )}

      {!loadingBoards && !activeBoard && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-border/60 rounded-xl m-6">
          <h3 className="text-base font-semibold text-foreground mb-1">No Omniboards Found</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            Create a multi-project Kanban board to aggregate and organize tasks across PACA projects.
          </p>
          <button
            type="button"
            onClick={handleCreateBoard}
            className="h-8.5 px-4 flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-xs"
          >
            Create Board
          </button>
        </div>
      )}

      {!loadingBoards && activeBoard && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <KanbanBoard
            columns={activeBoard.column_config || []}
            tasks={tasks}
            allStatuses={statuses}
            projects={boardProjects}
            taskTypes={taskTypes}
            defaultProjectId={defaultProjectId}
            boardFilters={activeBoard.filters}
            onStatusChange={handleStatusChange}
            onCardClick={handleCardClick}
            onCreateTask={handleCreateTask}
          />
        </div>
      )}

      {/* Settings Modal */}
      <BoardSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        board={activeBoard}
        projects={projects}
        statuses={statuses}
        onSave={handleSaveSettings}
        onDelete={handleDeleteBoard}
        isSaving={updateMutation.isPending}
      />

      {/* Right Task Detail Sidebar */}
      <TaskDetailSidebar
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        allStatuses={statuses}
        taskTypes={taskTypes}
        members={members}
        onStatusChange={handleSidebarStatusChange}
        onTypeChange={handleTypeChange}
        onDescriptionChange={handleDescriptionChange}
        onAssigneesChange={handleAssigneesChange}
        onNavigateToTask={handleNavigateToTask}
      />
    </div>
  );
}
