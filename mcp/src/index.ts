import {
  PluginAPIClient,
  type PluginMCPContext,
  type PluginMCPEntry,
  type Tool,
  errorResult,
  textResult,
} from "@paca-ai/plugin-sdk-mcp";

interface Omniboard {
  id: string;
  name: string;
  description: string;
  scope: string;
  project_ids: string[];
  column_config: Array<{ id: string; title: string; status_categories?: string[] }>;
}

interface CrossProjectTask {
  id: string;
  project_id: string;
  project_name: string;
  project_prefix: string;
  task_number: number;
  title: string;
  status_name: string;
  status_category: string;
  priority: string;
  assignee_name: string;
}

function formatBoard(board: Omniboard): string {
  return [
    `Board: ${board.name} (ID: ${board.id})`,
    `Description: ${board.description || "N/A"}`,
    `Projects: ${board.project_ids.length > 0 ? board.project_ids.join(", ") : "All projects"}`,
    `Columns: ${board.column_config.map((c) => c.title).join(" | ")}`,
  ].join("\n");
}

function formatTask(task: CrossProjectTask): string {
  const key = `${task.project_prefix}-${task.task_number}`;
  return `[${task.project_name}] ${key}: ${task.title} | Status: ${task.status_name || task.status_category} | Priority: ${task.priority} | Assignee: ${task.assignee_name || "Unassigned"} (ID: ${task.id})`;
}

const tools: Tool[] = [
  {
    name: "omniboard_list_boards",
    description: "List all multi-project Kanban boards created in Omniboard.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Optional project UUID for project scope." },
      },
    },
  },
  {
    name: "omniboard_get_tasks",
    description: "Get cross-project tasks for a specific Omniboard.",
    inputSchema: {
      type: "object",
      properties: {
        boardId: { type: "string", description: "Omniboard UUID." },
        search: { type: "string", description: "Optional search query (title or task key)." },
        projectId: { type: "string", description: "Optional project UUID context." },
      },
      required: ["boardId"],
    },
  },
  {
    name: "omniboard_move_task_status",
    description: "Move a task to a new status across projects.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "Task UUID." },
        statusId: { type: "string", description: "New task status UUID." },
        projectId: { type: "string", description: "Optional project UUID context." },
      },
      required: ["taskId", "statusId"],
    },
  },
];

const entry: PluginMCPEntry = {
  tools,

  async handleToolCall(
    name: string,
    args: Record<string, unknown>,
    context: PluginMCPContext
  ) {
    const api = new PluginAPIClient(context);

    try {
      switch (name) {
        case "omniboard_list_boards": {
          const { projectId } = args as { projectId?: string };
          const path = projectId
            ? `projects/${projectId}/omniboard/boards`
            : "omniboard/admin-boards";
          const boards = await api.pluginGet<Omniboard[]>(path);
          if (boards.length === 0) return textResult("No omniboards found.");
          return textResult(boards.map(formatBoard).join("\n\n---\n\n"));
        }

        case "omniboard_get_tasks": {
          const { boardId, search, projectId } = args as {
            boardId: string;
            search?: string;
            projectId?: string;
          };
          const basePath = projectId
            ? `projects/${projectId}/omniboard/boards/${boardId}/tasks`
            : `omniboard/admin-boards/${boardId}/tasks`;
          const path = search ? `${basePath}?search=${encodeURIComponent(search)}` : basePath;
          const tasks = await api.pluginGet<CrossProjectTask[]>(path);
          if (tasks.length === 0) return textResult("No tasks found on this board.");
          return textResult(`Tasks (${tasks.length}):\n\n` + tasks.map(formatTask).join("\n"));
        }

        case "omniboard_move_task_status": {
          const { taskId, statusId, projectId } = args as {
            taskId: string;
            statusId: string;
            projectId?: string;
          };
          const path = projectId
            ? `projects/${projectId}/omniboard/tasks/${taskId}/status`
            : `omniboard/admin-tasks/${taskId}/status`;
          await api.pluginPatch(path, { status_id: statusId });
          return textResult(`Task ${taskId} status updated successfully to ${statusId}.`);
        }

        default:
          return errorResult(`Unknown tool: ${name}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Tool ${name} failed: ${message}`);
    }
  },
};

export default entry;
