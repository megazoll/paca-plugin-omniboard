import { useState, useMemo } from "react";
import { PluginQueryClientProvider } from "@paca-ai/plugin-sdk-react";
import type { ViewExtensionProps } from "@paca-ai/plugin-sdk-react";
import { BoardHeader } from "./components/BoardHeader";
import { BoardSettingsModal } from "./components/BoardSettingsModal";
import { KanbanBoard } from "./components/KanbanBoard";
import {
  useOmniboards,
  useOmniboardTasks,
  useOmniboardProjects,
  useOmniboardStatuses,
  useCreateOmniboard,
  useUpdateOmniboard,
  useDeleteOmniboard,
  useUpdateTaskStatus,
} from "./api";
import type { BoardFilters, Omniboard, ColumnConfig } from "./types";

export default function OmniboardIntegrationView(props: ViewExtensionProps) {
  return (
    <PluginQueryClientProvider>
      <Content {...props} />
    </PluginQueryClientProvider>
  );
}

function Content({ api, ui }: ViewExtensionProps) {
  const scope = "integration";
  const { data: boards = [], isLoading: loadingBoards } = useOmniboards(api, scope);
  const { data: projects = [] } = useOmniboardProjects(api, scope);
  const { data: statuses = [] } = useOmniboardStatuses(api, scope);

  const [activeBoardId, setActiveBoardId] = useState<string>("");
  const [filters, setFilters] = useState<BoardFilters>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const activeBoard = useMemo<Omniboard | null>(() => {
    if (activeBoardId) {
      const found = boards.find((b) => b.id === activeBoardId);
      if (found) return found;
    }
    return boards.length > 0 ? boards[0] : null;
  }, [boards, activeBoardId]);

  const currentBoardId = activeBoard?.id || "";

  const {
    data: tasks = [],
    isFetching,
    refetch,
  } = useOmniboardTasks(api, currentBoardId, filters, scope);

  const createMutation = useCreateOmniboard(api, scope);
  const updateMutation = useUpdateOmniboard(api, scope);
  const deleteMutation = useDeleteOmniboard(api, scope);
  const statusMutation = useUpdateTaskStatus(api, scope);

  const handleCreateBoard = () => {
    createMutation.mutate(
      { name: "New Integration Omniboard", scope },
      {
        onSuccess: (newBoard) => {
          setActiveBoardId(newBoard.id);
          setIsSettingsOpen(true);
          ui?.toast({ title: "Created new view board", variant: "success" });
        },
      }
    );
  };

  const handleSaveSettings = (data: {
    name: string;
    description: string;
    project_ids: string[];
    column_config: ColumnConfig[];
  }) => {
    if (!currentBoardId) return;
    updateMutation.mutate(
      { boardId: currentBoardId, input: data },
      {
        onSuccess: () => {
          setIsSettingsOpen(false);
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
          setActiveBoardId("");
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

  const handleCardClick = (task: any) => {
    if (ui?.navigate) {
      ui.navigate(`/projects/${task.project_id}/tasks/${task.id}`);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-[1600px] mx-auto p-4 overflow-hidden">
      <BoardHeader
        boards={boards}
        activeBoard={activeBoard}
        projects={projects}
        filters={filters}
        onSelectBoard={setActiveBoardId}
        onCreateBoardClick={handleCreateBoard}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onFilterChange={setFilters}
        onRefresh={() => refetch()}
        isFetching={isFetching}
      />

      {loadingBoards && (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading view...</div>
      )}

      {!loadingBoards && activeBoard && (
        <div className="flex-1 overflow-hidden">
          <KanbanBoard
            columns={activeBoard.column_config || []}
            tasks={tasks}
            allStatuses={statuses}
            onStatusChange={handleStatusChange}
            onCardClick={handleCardClick}
          />
        </div>
      )}

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
    </div>
  );
}
